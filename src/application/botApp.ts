import { getScope, scopePage, scopePageCount } from "../domain/scopes.js";
import { createInsight } from "../domain/insight.js";
import { createWatch } from "../domain/watch.js";
import type { QuestionGenerator } from "./questionGenerator.js";
import type { RadarAnalyzer } from "./radarAnalyzer.js";
import type { Store } from "./store.js";
import type { InlineKeyboard, TelegramPort, TelegramUpdate } from "./telegramPort.js";

export class BotApp {
  constructor(
    private readonly telegram: TelegramPort,
    private readonly store: Store,
    private readonly questions: QuestionGenerator,
    private readonly radar: RadarAnalyzer,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async handle(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) return this.handleCallback(update.callback_query);
    const message = update.message;
    if (!message?.text) return;
    await this.handleCommand(message.chat.id, message.text.trim());
  }

  private async handleCommand(chatId: number, text: string): Promise<void> {
    const [command = "", ...rest] = text.split(/\s+/);
    if (command === "/start") return this.showHome(chatId);
    if (command === "/estado") return this.showScopes(chatId, 0);
    if (command === "/watch") return this.addWatch(chatId, rest.join(" "));
    if (command === "/watchlist") return this.showWatchlist(chatId);
    if (command === "/radar") return this.showRadar(chatId);
    if (command === "/preguntas") return this.showQuestions(chatId, rest.join(" "));
    await this.telegram.sendMessage(chatId, "Comando no reconocido. Usa /start para abrir el menú.");
  }

  private async handleCallback(callback: NonNullable<TelegramUpdate["callback_query"]>): Promise<void> {
    await this.telegram.answerCallback(callback.id);
    const chatId = callback.message?.chat.id;
    if (!chatId || !callback.data) return;
    if (callback.data.startsWith("scope:page:")) return this.showScopes(chatId, Number(callback.data.split(":")[2]));
    if (callback.data.startsWith("scope:set:")) return this.selectScope(chatId, callback.data.split(":")[2] ?? "");
    if (callback.data === "menu:home") return this.showHome(chatId);
    if (callback.data === "menu:watchlist") return this.showWatchlist(chatId);
    if (callback.data === "menu:radar") return this.showRadar(chatId);
    if (callback.data.startsWith("questions:")) return this.showInsightQuestions(chatId, callback.data.slice("questions:".length));
  }

  private async showHome(chatId: number): Promise<void> {
    const scope = await this.currentScope(chatId);
    const text = `<b>CASA ENCUESTADORA IA</b>\n\n📍 Ámbito: <b>${scope.name}</b>\n\nSelecciona una función:`;
    const keyboard: InlineKeyboard = [
      [{ text: "📡 Radar", callback_data: "menu:radar" }, { text: "👁 Watchlist", callback_data: "menu:watchlist" }],
      [{ text: "🇲🇽 Cambiar ámbito", callback_data: "scope:page:0" }]
    ];
    await this.telegram.sendMessage(chatId, text, keyboard);
  }

  private async showScopes(chatId: number, page: number): Promise<void> {
    const total = scopePageCount();
    const safePage = Math.min(Math.max(page, 0), total - 1);
    const rows: InlineKeyboard = scopePage(safePage).map((scope) => [
      { text: scope.code === "NAC" ? `🇲🇽 ${scope.name}` : scope.name, callback_data: `scope:set:${scope.code}` }
    ]);
    const nav = [] as { text: string; callback_data: string }[];
    if (safePage > 0) nav.push({ text: "⬅️", callback_data: `scope:page:${safePage - 1}` });
    if (safePage < total - 1) nav.push({ text: "➡️", callback_data: `scope:page:${safePage + 1}` });
    const keyboard: InlineKeyboard = nav.length ? [...rows, nav] : rows;
    await this.telegram.sendMessage(chatId, `<b>Selecciona ámbito</b>\nPágina ${safePage + 1}/${total}`, keyboard);
  }

  private async selectScope(chatId: number, code: string): Promise<void> {
    const scope = getScope(code);
    if (!scope) return this.telegram.sendMessage(chatId, "Ámbito inválido.");
    await this.store.setScope(chatId, code);
    await this.telegram.sendMessage(chatId, `✅ Ámbito activo: <b>${scope.name}</b>`, [[{ text: "🏠 Menú", callback_data: "menu:home" }]]);
  }

  private async addWatch(chatId: number, query: string): Promise<void> {
    if (!query) return this.telegram.sendMessage(chatId, "Uso: <code>/watch Samuel García</code>");
    const scope = await this.currentScope(chatId);
    const watch = createWatch({ chatId, scopeCode: scope.code, query, now: this.now() });
    await this.store.addWatch(watch);
    await this.telegram.sendMessage(chatId, `👁 Watch creado\n\n<b>${escapeHtml(watch.query)}</b>\nÁmbito: ${scope.name}\nEstado: 🟢 Activo`);
  }

  private async showWatchlist(chatId: number): Promise<void> {
    const watches = await this.store.listWatches(chatId);
    if (!watches.length) return this.telegram.sendMessage(chatId, "👁 <b>WATCHLIST</b>\n\nAún no hay monitoreos.\nUsa <code>/watch Nombre o tema</code>.");
    const lines = watches.map((watch, index) => `${index + 1}. 🟢 <b>${escapeHtml(watch.query)}</b> — ${getScope(watch.scopeCode)?.name ?? watch.scopeCode}`);
    await this.telegram.sendMessage(chatId, `👁 <b>WATCHLIST</b>\n\n${lines.join("\n")}`);
  }

  private async showRadar(chatId: number): Promise<void> {
    const scope = await this.currentScope(chatId);
    const watches = (await this.store.listWatches(chatId)).filter((watch) => watch.scopeCode === scope.code);
    await this.telegram.sendMessage(chatId, `📡 <b>RADAR — ${scope.name}</b>\nAnalizando acontecimientos recientes...`);
    try {
      const report = await this.radar.analyze(scope.name, watches.map((watch) => watch.query));
      const now = this.now();
      const insights = report.items.map((item, index) => createInsight({
        chatId, scopeCode: scope.code, sequence: index + 1, title: item.title, summary: item.summary,
        surveyAngle: item.surveyAngle, ...(item.watchMatch ? { watchMatch: item.watchMatch } : {}),
        sourceUrls: report.sourceUrls, now
      }));
      await this.store.replaceInsights(chatId, insights);
      for (const insight of insights) await this.sendInsight(chatId, insight);
    } catch (error) {
      const message = error instanceof Error && error.message === "RADAR_REQUIRES_OPENAI"
        ? "Configura OPENAI_API_KEY para activar el monitoreo automático de noticias."
        : "No pude completar el Radar en esta corrida. Revisa la configuración y vuelve a ejecutarlo.";
      await this.telegram.sendMessage(chatId, `⚠️ ${message}`);
    }
  }

  private async sendInsight(chatId: number, insight: import("../domain/insight.js").Insight): Promise<void> {
    const watch = insight.watchMatch ? `\n👁 Watch relacionado: <b>${escapeHtml(insight.watchMatch)}</b>` : "";
    const sources = insight.sourceUrls.slice(0, 3).map((url, index) => `<a href="${escapeHtml(url)}">Fuente ${index + 1}</a>`).join(" · ");
    const sourceLine = sources ? `\n\n🔗 ${sources}` : "";
    const text = `🧠 <b>${escapeHtml(insight.title)}</b>\n\n${escapeHtml(insight.summary)}${watch}\n\n<b>Qué podría medirse:</b>\n${escapeHtml(insight.surveyAngle)}${sourceLine}\n\n<code>${insight.id}</code>`;
    await this.telegram.sendMessage(chatId, text, [[{ text: "📊 Generar preguntas", callback_data: `questions:${insight.id}` }]]);
  }

  private async showInsightQuestions(chatId: number, insightId: string): Promise<void> {
    const insight = await this.store.getInsight(chatId, insightId);
    if (!insight) return this.telegram.sendMessage(chatId, "Ese insight ya no está disponible. Ejecuta /radar nuevamente.");
    const scope = getScope(insight.scopeCode);
    const topic = `${insight.title}. ${insight.summary}. Objetivo de medición: ${insight.surveyAngle}`;
    const questions = await this.questions.generate(topic, scope?.name ?? insight.scopeCode);
    await this.sendQuestions(chatId, insight.title, scope?.name ?? insight.scopeCode, questions);
  }

  private async showQuestions(chatId: number, topic: string): Promise<void> {
    if (!topic) return this.telegram.sendMessage(chatId, "Uso: <code>/preguntas tema a medir</code>");
    const scope = await this.currentScope(chatId);
    const questions = await this.questions.generate(topic, scope.name);
    await this.sendQuestions(chatId, topic, scope.name, questions);
  }

  private async sendQuestions(chatId: number, topic: string, scopeName: string, questions: readonly import("../domain/questions.js").SurveyQuestion[]): Promise<void> {
    const body = questions.map((question, index) => `${index + 1}. <b>${escapeHtml(question.text)}</b>\n${question.options.map((option, i) => `   ${i + 1}) ${escapeHtml(option)}`).join("\n")}`).join("\n\n");
    await this.telegram.sendMessage(chatId, `📊 <b>PREGUNTAS SUGERIDAS</b>\nTema: ${escapeHtml(topic)}\nÁmbito: ${scopeName}\n\n${body}\n\nPropuesta para revisión humana antes del levantamiento.`);
  }

  private async currentScope(chatId: number) {
    return getScope((await this.store.getScope(chatId)) ?? "NLE") ?? getScope("NLE")!;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
