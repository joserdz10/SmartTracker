import { createElectionProcess, createFigureProfile, createWave } from "../domain/election.js";
import { buildTrackingCore } from "../domain/electionQuestions.js";
import { getScope } from "../domain/scopes.js";
import { createWatch } from "../domain/watch.js";
import { ElectoralOperations } from "./electoralOperations.js";
export class ElectoralTracker {
    telegram;
    store;
    questions;
    now;
    operations;
    constructor(telegram, store, questions, now) {
        this.telegram = telegram;
        this.store = store;
        this.questions = questions;
        this.now = now;
        this.operations = new ElectoralOperations(telegram, store, now);
    }
    async handleCommand(chatId, command, args) {
        if (command === "/elecciones")
            return this.elections(chatId, args).then(() => true);
        if (command === "/perfil" || command === "/profile")
            return this.profile(chatId, args).then(() => true);
        if (command === "/ola")
            return this.wave(chatId).then(() => true);
        if (command === "/tracking")
            return this.tracking(chatId, args).then(() => true);
        return this.operations.handleCommand(chatId, command, args);
    }
    async handleCallback(chatId, data) {
        if (data === "menu:elections")
            return this.elections(chatId, "").then(() => true);
        if (data === "menu:tracking")
            return this.tracking(chatId, "").then(() => true);
        if (data.startsWith("wave:add:"))
            return this.addInsightToNextWave(chatId, data.slice(9)).then(() => true);
        if (data.startsWith("wave:flash:"))
            return this.createFlashWave(chatId, data.slice(11)).then(() => true);
        if (data.startsWith("wave:approve:"))
            return this.operations.approveWave(chatId, data.slice(13)).then(() => true);
        return false;
    }
    async insightKeyboard(insightId) {
        return [
            [{ text: "📊 Generar preguntas", callback_data: `questions:${insightId}` }],
            [{ text: "➕ Próxima ola", callback_data: `wave:add:${insightId}` }, { text: "⚡ Encuesta flash", callback_data: `wave:flash:${insightId}` }]
        ];
    }
    async elections(chatId, args) {
        const scopeCode = (await this.store.getScope(chatId)) ?? "NLE";
        if (args) {
            const [name, date] = splitPipe(args);
            const process = createElectionProcess({ chatId, scopeCode, name, ...(date ? { electionDate: date } : {}), now: this.now() });
            await this.store.saveProcess(process);
            await this.telegram.sendMessage(chatId, `🗳 <b>Proceso electoral creado</b>\n\n${esc(process.name)}\nÁmbito: ${esc(getScope(scopeCode)?.name ?? scopeCode)}${process.electionDate ? `\nJornada: ${esc(process.electionDate)}` : ""}\n\nAhora agrega figuras con <code>/perfil Nombre</code>.`);
            return;
        }
        const processes = await this.store.listProcesses(chatId, scopeCode);
        if (!processes.length)
            return this.telegram.sendMessage(chatId, "🗳 <b>PROCESO ELECTORAL</b>\n\nNo hay un proceso activo en este ámbito.\n\nCrea uno con:\n<code>/elecciones Elección estatal 2027 | 2027-06-06</code>");
        const lines = processes.map((process) => `• <b>${esc(process.name)}</b>${process.electionDate ? ` — ${esc(process.electionDate)}` : ""}`);
        await this.telegram.sendMessage(chatId, `🗳 <b>PROCESO ELECTORAL</b>\n\n${lines.join("\n")}\n\n/perfil &lt;nombre&gt;\n/ola\n/tracking`);
    }
    async profile(chatId, name) {
        const process = await this.activeProcess(chatId);
        if (!process)
            return;
        if (!name)
            return this.listFigures(chatId, process);
        const existing = (await this.store.listFigures(chatId, process.id)).find((figure) => normalize(figure.name) === normalize(name));
        const figure = existing ?? createFigureProfile({ chatId, processId: process.id, name, now: this.now() });
        if (!existing) {
            await this.store.saveFigure(figure);
            await this.store.addWatch(createWatch({ chatId, scopeCode: process.scopeCode, query: figure.name, now: this.now() }));
        }
        const latest = (await this.store.listResults(chatId, process.id, figure.id)).slice(-4).map((result) => `${metricLabel(result.metric)}: ${result.value}%`).join("\n");
        await this.telegram.sendMessage(chatId, `👤 <b>${esc(figure.name)}</b>\n\nProceso: ${esc(process.name)}\nWatch electoral: 🟢 Activo${latest ? `\n\n<b>Últimos datos</b>\n${latest}` : "\n\nSin mediciones todavía."}\n\nUsa <code>/tracking ${esc(figure.name)}</code> para ver la serie.`);
    }
    async listFigures(chatId, process) {
        const figures = await this.store.listFigures(chatId, process.id);
        const lines = figures.length ? figures.map((figure) => `• ${esc(figure.name)}`).join("\n") : "Aún no hay figuras.";
        await this.telegram.sendMessage(chatId, `👤 <b>FIGURAS EN TRACKING</b>\n\n${lines}\n\nAgregar: <code>/perfil Nombre</code>`);
    }
    async wave(chatId) {
        const process = await this.activeProcess(chatId);
        if (!process)
            return;
        const figures = await this.store.listFigures(chatId, process.id);
        if (!figures.length)
            return this.telegram.sendMessage(chatId, "Agrega al menos una figura con <code>/perfil Nombre</code> antes de crear la ola.");
        const waves = await this.store.listWaves(chatId, process.id);
        const wave = createWave({ chatId, processId: process.id, number: waves.length + 1, mode: "tracking", questions: buildTrackingCore(figures), now: this.now() });
        await this.store.saveWave(wave);
        await this.telegram.sendMessage(chatId, formatWave(wave, process.name), [[{ text: "✅ Aprobar cuestionario", callback_data: `wave:approve:${wave.id}` }]]);
    }
    async tracking(chatId, name) {
        const process = await this.activeProcess(chatId);
        if (!process)
            return;
        const waves = await this.store.listWaves(chatId, process.id);
        if (!name) {
            const figures = await this.store.listFigures(chatId, process.id);
            await this.telegram.sendMessage(chatId, `📈 <b>TRACKING — ${esc(process.name)}</b>\n\nOlas: ${waves.length}\nFiguras: ${figures.length}\n\n${figures.map((figure) => `• ${esc(figure.name)}`).join("\n") || "Sin figuras"}\n\nConsulta: <code>/tracking Nombre</code>`);
            return;
        }
        const figure = (await this.store.listFigures(chatId, process.id)).find((item) => normalize(item.name) === normalize(name));
        if (!figure)
            return this.telegram.sendMessage(chatId, "Figura no encontrada. Agrégala con <code>/perfil Nombre</code>.");
        const results = await this.store.listResults(chatId, process.id, figure.id);
        if (!results.length)
            return this.telegram.sendMessage(chatId, `📈 <b>${esc(figure.name)}</b>\n\nTodavía no hay resultados registrados.`);
        const lines = waves.map((wave) => trackingLine(wave, results)).filter((line) => Boolean(line));
        await this.telegram.sendMessage(chatId, `📈 <b>TRACKING — ${esc(figure.name)}</b>\n\n${lines.join("\n") || "Sin datos comparables."}\n\nCambios mostrados = mediciones observadas; no son una predicción electoral.`);
    }
    async addInsightToNextWave(chatId, insightId) {
        const context = await this.latestWave(chatId);
        if (!context)
            return;
        const insight = await this.store.getInsight(chatId, insightId);
        if (!insight)
            return this.telegram.sendMessage(chatId, "Insight no disponible.");
        const proposal = await this.questions.generate(`${insight.title}. ${insight.surveyAngle}`, getScope(insight.scopeCode)?.name ?? insight.scopeCode);
        const updated = { ...context.wave, contextualInsightIds: [...context.wave.contextualInsightIds, insight.id], questions: [...context.wave.questions, ...proposal.questions.slice(0, 3)] };
        await this.store.saveWave(updated);
        await this.telegram.sendMessage(chatId, `➕ Insight agregado a la Ola ${updated.number}.\n\nSe añadieron ${proposal.questions.slice(0, 3).length} preguntas coyunturales para revisión.`);
    }
    async createFlashWave(chatId, insightId) {
        const process = await this.activeProcess(chatId);
        if (!process)
            return;
        const insight = await this.store.getInsight(chatId, insightId);
        if (!insight)
            return this.telegram.sendMessage(chatId, "Insight no disponible.");
        const proposal = await this.questions.generate(`${insight.title}. ${insight.surveyAngle}`, getScope(insight.scopeCode)?.name ?? insight.scopeCode);
        const waves = await this.store.listWaves(chatId, process.id);
        const wave = createWave({ chatId, processId: process.id, number: waves.length + 1, mode: "flash", questions: proposal.questions, insightId, now: this.now() });
        await this.store.saveWave(wave);
        await this.telegram.sendMessage(chatId, `⚡ <b>ENCUESTA FLASH CREADA</b>\n\nOla ${wave.number}\nTipo sugerido: ${esc(proposal.surveyType)}\nPreguntas: ${wave.questions.length}\n\nCompleta /metodologia antes del levantamiento o publicación.`);
    }
    async activeProcess(chatId) {
        const scopeCode = (await this.store.getScope(chatId)) ?? "NLE";
        const process = (await this.store.listProcesses(chatId, scopeCode)).at(-1);
        if (!process)
            await this.telegram.sendMessage(chatId, "Primero crea el proceso con <code>/elecciones Nombre del proceso | AAAA-MM-DD</code>.");
        return process;
    }
    async latestWave(chatId) {
        const process = await this.activeProcess(chatId);
        if (!process)
            return undefined;
        const wave = (await this.store.listWaves(chatId, process.id)).at(-1);
        if (!wave)
            await this.telegram.sendMessage(chatId, "Aún no hay olas. Crea una con <code>/ola</code>.");
        return wave ? { process, wave } : undefined;
    }
}
function formatWave(wave, processName) {
    const questions = wave.questions.map((question, index) => `${index + 1}. ${esc(question.text)}`).join("\n");
    return `📊 <b>OLA ${wave.number} CREADA</b>\n\nProceso: ${esc(processName)}\nModo: Tracking\nCore: ${wave.coreVersion}\nPreguntas base: ${wave.questions.length}\n\n<b>Cuestionario maestro</b>\n${questions}\n\nAhora el Radar puede agregar coyuntura con “➕ Próxima ola”.`;
}
function trackingLine(wave, results) {
    const items = results.filter((result) => result.waveId === wave.id).map((result) => `${metricLabel(result.metric)} ${result.value}%`).join(" · ");
    return items ? `Ola ${wave.number}: ${items}` : undefined;
}
function splitPipe(value) { const [first = "", ...rest] = value.split("|"); return [first.trim(), rest.join("|").trim() || undefined]; }
function metricLabel(metric) { return ({ knowledge: "Conocimiento", favorable: "Opinión favorable", unfavorable: "Opinión desfavorable", vote_intention: "Intención de voto", second_choice: "Segunda opción", issue_priority: "Prioridad temática" })[metric]; }
function normalize(value) { return value.trim().toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function esc(value) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
