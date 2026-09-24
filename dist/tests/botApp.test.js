import test from "node:test";
import assert from "node:assert/strict";
import { BotApp } from "../src/application/botApp.js";
class MemoryStore {
    scope = new Map();
    watches = [];
    insights = [];
    async getScope(chatId) { return this.scope.get(chatId); }
    async setScope(chatId, scopeCode) { this.scope.set(chatId, scopeCode); }
    async addWatch(watch) { this.watches.push(watch); }
    async listWatches(chatId) { return this.watches.filter((watch) => watch.chatId === chatId); }
    async replaceInsights(chatId, insights) { this.insights = [...this.insights.filter((item) => item.chatId !== chatId), ...insights]; }
    async getInsight(chatId, insightId) { return this.insights.find((item) => item.chatId === chatId && item.id === insightId); }
}
class FakeTelegram {
    messages = [];
    async getUpdates(_offset) { return []; }
    async sendMessage(chatId, text, keyboard) {
        this.messages.push(keyboard ? { chatId, text, keyboard } : { chatId, text });
    }
    async answerCallback(_id) { }
}
const radar = {
    async analyze() { return { items: [{ title: "Movilidad", summary: "Nuevo anuncio público.", surveyAngle: "Conocimiento y percepción." }], sourceUrls: ["https://example.com"] }; }
};
const questions = {
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
