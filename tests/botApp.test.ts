import test from "node:test";
import assert from "node:assert/strict";
import { BotApp } from "../src/application/botApp.js";
import type { QuestionGenerator } from "../src/application/questionGenerator.js";
import type { RadarAnalyzer } from "../src/application/radarAnalyzer.js";
import type { Store } from "../src/application/store.js";
import type { InlineKeyboard, TelegramPort, TelegramUpdate } from "../src/application/telegramPort.js";
import type { Insight } from "../src/domain/insight.js";
import type { Watch } from "../src/domain/watch.js";

class MemoryStore implements Store {
  private scope = new Map<number, string>();
  private watches: Watch[] = [];
  private insights: Insight[] = [];
  async getScope(chatId: number): Promise<string | undefined> { return this.scope.get(chatId); }
  async setScope(chatId: number, scopeCode: string): Promise<void> { this.scope.set(chatId, scopeCode); }
  async addWatch(watch: Watch): Promise<void> { this.watches.push(watch); }
  async listWatches(chatId: number): Promise<readonly Watch[]> { return this.watches.filter((watch) => watch.chatId === chatId); }
  async replaceInsights(chatId: number, insights: readonly Insight[]): Promise<void> { this.insights = [...this.insights.filter((item) => item.chatId !== chatId), ...insights]; }
  async getInsight(chatId: number, insightId: string): Promise<Insight | undefined> { return this.insights.find((item) => item.chatId === chatId && item.id === insightId); }
}

class FakeTelegram implements TelegramPort {
  readonly messages: { chatId: number; text: string; keyboard?: InlineKeyboard }[] = [];
  async getUpdates(_offset: number): Promise<readonly TelegramUpdate[]> { return []; }
  async sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
    this.messages.push(keyboard ? { chatId, text, keyboard } : { chatId, text });
  }
  async answerCallback(_id: string): Promise<void> {}
}

const radar: RadarAnalyzer = {
  async analyze() { return { items: [{ title: "Movilidad", summary: "Nuevo anuncio público.", surveyAngle: "Conocimiento y percepción." }], sourceUrls: ["https://example.com"] }; }
};

const questions: QuestionGenerator = {
  async generate(topic) {
    return {
      surveyType: "Coyuntural",
      objective: `Medir percepción sobre ${topic}.`,
      recommendedMethod: "Telefónica IVR",
      questions: [{ text: `¿Ha escuchado sobre ${topic}?`, options: ["Sí", "No", "NS/NR"] }]
    };
  }
};

test("selects national politics as the 33rd scope", async () => {
  const telegram = new FakeTelegram();
  const store = new MemoryStore();
  const app = new BotApp(telegram, store, questions, radar, () => "2026-09-23T12:00:00.000Z");
  await app.handle({ update_id: 1, callback_query: { id: "c1", data: "scope:set:NAC", message: { chat: { id: 7 } } } });
  assert.equal(await store.getScope(7), "NAC");
  assert.ok(telegram.messages.at(-1)?.text.includes("Política Nacional"));
});

test("creates a special watch under the active scope", async () => {
  const telegram = new FakeTelegram();
  const store = new MemoryStore();
  await store.setScope(7, "NLE");
  const app = new BotApp(telegram, store, questions, radar, () => "2026-09-23T12:00:00.000Z");
  await app.handle({ update_id: 2, message: { chat: { id: 7 }, text: "/watch Samuel García" } });
  const watches = await store.listWatches(7);
  assert.equal(watches[0]?.query, "Samuel García");
  assert.equal(watches[0]?.scopeCode, "NLE");
});

test("turns radar findings into an insight with a question-generation button", async () => {
  const telegram = new FakeTelegram();
  const store = new MemoryStore();
  await store.setScope(7, "NLE");
  const app = new BotApp(telegram, store, questions, radar, () => "2026-09-23T12:00:00.000Z");

  await app.handle({ update_id: 3, message: { chat: { id: 7 }, text: "/radar" } });

  const insightMessage = telegram.messages.find((message) => message.text.includes("Movilidad"));
  assert.ok(insightMessage);
  assert.ok(insightMessage.keyboard?.[0]?.[0]?.callback_data.startsWith("questions:I"));
});


test("shows survey type and recommended method when generating questions", async () => {
  const telegram = new FakeTelegram();
  const store = new MemoryStore();
  await store.setScope(7, "NLE");
  const app = new BotApp(telegram, store, questions, radar, () => "2026-09-23T12:00:00.000Z");

  await app.handle({ update_id: 4, message: { chat: { id: 7 }, text: "/preguntas movilidad" } });

  const message = telegram.messages.at(-1)?.text ?? "";
  assert.ok(message.includes("Tipo:</b> Coyuntural"));
  assert.ok(message.includes("Método recomendado:</b> Telefónica IVR"));
});
