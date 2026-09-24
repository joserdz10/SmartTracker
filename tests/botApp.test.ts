import test from "node:test";
import assert from "node:assert/strict";
import { BotApp } from "../src/application/botApp.js";
import type { QuestionGenerator } from "../src/application/questionGenerator.js";
import type { RadarAnalyzer } from "../src/application/radarAnalyzer.js";
import type { Store } from "../src/application/store.js";
import type { InlineKeyboard, TelegramPort, TelegramUpdate } from "../src/application/telegramPort.js";
import type { ElectionProcess, ElectionWave, FigureProfile, MetricResult } from "../src/domain/election.js";
import type { Insight } from "../src/domain/insight.js";
import type { Watch } from "../src/domain/watch.js";

class MemoryStore implements Store {
  private scope = new Map<number, string>();
  private watches: Watch[] = [];
  private insights: Insight[] = [];
  private processes: ElectionProcess[] = [];
  private figures: FigureProfile[] = [];
  private waves: ElectionWave[] = [];
  private results: MetricResult[] = [];
  async getScope(chatId: number): Promise<string | undefined> { return this.scope.get(chatId); }
  async setScope(chatId: number, scopeCode: string): Promise<void> { this.scope.set(chatId, scopeCode); }
  async addWatch(watch: Watch): Promise<void> { this.watches.push(watch); }
  async listWatches(chatId: number): Promise<readonly Watch[]> { return this.watches.filter((x) => x.chatId === chatId); }
  async replaceInsights(_chatId: number, insights: readonly Insight[]): Promise<void> { for (const insight of insights) this.insights = upsert(this.insights, insight); }
  async getInsight(chatId: number, insightId: string): Promise<Insight | undefined> { return this.insights.find((x) => x.chatId === chatId && x.id === insightId); }
  async listInsights(chatId: number, scopeCode: string): Promise<readonly Insight[]> { return this.insights.filter((x) => x.chatId === chatId && x.scopeCode === scopeCode); }
  async saveProcess(process: ElectionProcess): Promise<void> { this.processes = upsert(this.processes, process); }
  async listProcesses(chatId: number, scopeCode: string): Promise<readonly ElectionProcess[]> { return this.processes.filter((x) => x.chatId === chatId && x.scopeCode === scopeCode); }
  async saveFigure(figure: FigureProfile): Promise<void> { this.figures = upsert(this.figures, figure); }
  async listFigures(chatId: number, processId: string): Promise<readonly FigureProfile[]> { return this.figures.filter((x) => x.chatId === chatId && x.processId === processId); }
  async saveWave(wave: ElectionWave): Promise<void> { this.waves = upsert(this.waves, wave); }
  async listWaves(chatId: number, processId: string): Promise<readonly ElectionWave[]> { return this.waves.filter((x) => x.chatId === chatId && x.processId === processId); }
  async getWave(chatId: number, waveId: string): Promise<ElectionWave | undefined> { return this.waves.find((x) => x.chatId === chatId && x.id === waveId); }
  async saveResult(result: MetricResult): Promise<void> { this.results = upsert(this.results, result); }
  async listResults(chatId: number, processId: string, figureId?: string): Promise<readonly MetricResult[]> { return this.results.filter((x) => x.chatId === chatId && x.processId === processId && (!figureId || x.figureId === figureId)); }
}

class FakeTelegram implements TelegramPort {
  readonly messages: { chatId: number; text: string; keyboard?: InlineKeyboard }[] = [];
  async getUpdates(_offset: number): Promise<readonly TelegramUpdate[]> { return []; }
  async sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> { this.messages.push(keyboard ? { chatId, text, keyboard } : { chatId, text }); }
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
      questions: [{ text: `¿Ha escuchado sobre ${topic}?`, options: ["Sí", "No", "NS/NR"] }, { text: "¿Qué opinión tiene?", options: ["Favorable", "Desfavorable", "NS/NR"] }, { text: "¿Le afecta?", options: ["Sí", "No", "NS/NR"] }]
    };
  }
};

const now = () => "2026-09-23T12:00:00.000Z";

function appWith(store = new MemoryStore(), telegram = new FakeTelegram()) {
  return { app: new BotApp(telegram, store, questions, radar, now), store, telegram };
}

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return [...items.filter((x) => x.id !== item.id), item];
}

test("selects national politics as the 33rd scope", async () => {
  const { app, store, telegram } = appWith();
  await app.handle({ update_id: 1, callback_query: { id: "c1", data: "scope:set:NAC", message: { chat: { id: 7 } } } });
  assert.equal(await store.getScope(7), "NAC");
  assert.ok(telegram.messages.at(-1)?.text.includes("Política Nacional"));
});

test("creates a special watch under the active scope", async () => {
  const { app, store } = appWith();
  await store.setScope(7, "NLE");
  await app.handle({ update_id: 2, message: { chat: { id: 7 }, text: "/watch Samuel García" } });
  const watches = await store.listWatches(7);
  assert.equal(watches[0]?.query, "Samuel García");
});

test("turns radar findings into an insight with electoral actions", async () => {
  const { app, store, telegram } = appWith();
  await store.setScope(7, "NLE");
  await app.handle({ update_id: 3, message: { chat: { id: 7 }, text: "/radar" } });
  const message = telegram.messages.find((x) => x.text.includes("Movilidad"));
  assert.ok(message?.keyboard?.flat().some((button) => button.callback_data.startsWith("wave:add:")));
  assert.ok(message?.keyboard?.flat().some((button) => button.callback_data.startsWith("wave:flash:")));
});

test("shows survey type and recommended method when generating questions", async () => {
  const { app, store, telegram } = appWith();
  await store.setScope(7, "NLE");
  await app.handle({ update_id: 4, message: { chat: { id: 7 }, text: "/preguntas movilidad" } });
  const message = telegram.messages.at(-1)?.text ?? "";
  assert.ok(message.includes("Tipo:</b> Coyuntural"));
  assert.ok(message.includes("Método recomendado:</b> Telefónica IVR"));
});

test("creates an election process, figure and tracking wave", async () => {
  const { app, store } = appWith();
  await store.setScope(7, "NLE");
  await app.handle({ update_id: 5, message: { chat: { id: 7 }, text: "/elecciones Elección estatal 2027 | 2027-06-06" } });
  const process = (await store.listProcesses(7, "NLE"))[0];
  assert.equal(process?.electionDate, "2027-06-06");
  await app.handle({ update_id: 6, message: { chat: { id: 7 }, text: "/perfil Figura A" } });
  await app.handle({ update_id: 7, message: { chat: { id: 7 }, text: "/ola" } });
  const waves = await store.listWaves(7, process!.id);
  assert.equal(waves.length, 1);
  assert.equal(waves[0]?.mode, "tracking");
  assert.ok((waves[0]?.questions.length ?? 0) >= 4);
  assert.ok((await store.listWatches(7)).some((watch) => watch.query === "Figura A"));
});

test("adds a radar insight to the current tracking wave", async () => {
  const { app, store } = appWith();
  await store.setScope(7, "NLE");
  await app.handle({ update_id: 8, message: { chat: { id: 7 }, text: "/elecciones Elección estatal" } });
  await app.handle({ update_id: 9, message: { chat: { id: 7 }, text: "/perfil Figura A" } });
  await app.handle({ update_id: 10, message: { chat: { id: 7 }, text: "/ola" } });
  await app.handle({ update_id: 11, message: { chat: { id: 7 }, text: "/radar" } });
  const process = (await store.listProcesses(7, "NLE"))[0]!;
  const before = (await store.listWaves(7, process.id))[0]!;
  const insight = await store.getInsight(7, "I260923120000-1");
  assert.ok(insight);
  await app.handle({ update_id: 12, callback_query: { id: "c2", data: `wave:add:${insight!.id}`, message: { chat: { id: 7 } } } });
  const after = (await store.listWaves(7, process.id))[0]!;
  assert.ok(after.questions.length > before.questions.length);
  assert.ok(after.contextualInsightIds.includes(insight!.id));
});

test("stores observed metrics and renders tracking without a winner prediction", async () => {
  const { app, store, telegram } = appWith();
  await store.setScope(7, "NLE");
  await app.handle({ update_id: 13, message: { chat: { id: 7 }, text: "/elecciones Elección estatal" } });
  await app.handle({ update_id: 14, message: { chat: { id: 7 }, text: "/perfil Figura A" } });
  await app.handle({ update_id: 15, message: { chat: { id: 7 }, text: "/ola" } });
  await app.handle({ update_id: 16, message: { chat: { id: 7 }, text: "/resultado Figura A | conocimiento=68 | favorable=41 | intencion=22" } });
  await app.handle({ update_id: 17, message: { chat: { id: 7 }, text: "/tracking Figura A" } });
  const text = telegram.messages.at(-1)?.text ?? "";
  assert.ok(text.includes("Conocimiento 68%"));
  assert.ok(text.includes("Intención de voto 22%"));
  assert.ok(text.includes("no son una predicción electoral"));
});
