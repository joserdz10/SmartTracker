import { applyMethodology, createMetricResult } from "../domain/election.js";
import { publicationReadiness } from "../domain/publication.js";
export class ElectoralOperations {
    telegram;
    store;
    now;
    constructor(telegram, store, now) {
        this.telegram = telegram;
        this.store = store;
        this.now = now;
    }
    async handleCommand(chatId, command, args) {
        if (command === "/metodologia")
            return this.methodology(chatId, args).then(() => true);
        if (command === "/resultado")
            return this.result(chatId, args).then(() => true);
        if (command === "/publicacion")
            return this.publication(chatId).then(() => true);
        if (command === "/eventos")
            return this.events(chatId).then(() => true);
        if (command === "/escenario")
            return this.scenario(chatId).then(() => true);
        if (command === "/aprobar_ola")
            return this.setLatestWaveStatus(chatId, "approved").then(() => true);
        if (command === "/levantamiento")
            return this.setLatestWaveStatus(chatId, "fieldwork").then(() => true);
        if (command === "/cerrar_ola")
            return this.setLatestWaveStatus(chatId, "closed").then(() => true);
        return false;
    }
    async approveWave(chatId, waveId) {
        await this.setWaveStatus(chatId, waveId, "approved");
    }
    async events(chatId) {
        const scopeCode = (await this.store.getScope(chatId)) ?? "NLE";
        const insights = (await this.store.listInsights(chatId, scopeCode)).slice(-10).reverse();
        if (!insights.length)
            return this.telegram.sendMessage(chatId, "📰 No hay eventos guardados todavía. Ejecuta /radar.");
        const lines = insights.map((item) => `• <b>${esc(item.title)}</b>${item.watchMatch ? ` — 👁 ${esc(item.watchMatch)}` : ""}\n  ${esc(item.createdAt.slice(0, 10))}`);
        await this.telegram.sendMessage(chatId, `📰 <b>EVENTOS DEL RADAR</b>\n\n${lines.join("\n\n")}\n\nEstos eventos son contexto; no prueban por sí solos la causa de un cambio en encuesta.`);
    }
    async scenario(chatId) {
        const context = await this.latestWave(chatId);
        if (!context)
            return;
        const figures = await this.store.listFigures(chatId, context.process.id);
        const results = await this.store.listResults(chatId, context.process.id);
        const lines = figures.map((figure) => {
            const result = results.find((item) => item.waveId === context.wave.id && item.figureId === figure.id && item.metric === "vote_intention");
            return `${esc(figure.name)}: ${result ? `${result.value}%` : "sin dato"}`;
        });
        await this.telegram.sendMessage(chatId, `🗳 <b>ESCENARIO MEDIDO — OLA ${context.wave.number}</b>\n\n${lines.join("\n")}\n\nSe muestran las mediciones en el orden de registro de las figuras; no es un ranking ni una predicción.`);
    }
    async methodology(chatId, args) {
        const context = await this.latestWave(chatId);
        if (!context)
            return;
        if (args) {
            const methodology = applyMethodology(context.wave.methodology, parseAssignments(args));
            await this.store.saveWave({ ...context.wave, methodology });
        }
        const wave = (await this.store.getWave(chatId, context.wave.id)) ?? context.wave;
        const readiness = publicationReadiness(context.process, wave, this.now());
        const missing = readiness.missing.length ? readiness.missing.map((item) => `• ${esc(item)}`).join("\n") : "✅ Completa";
        await this.telegram.sendMessage(chatId, methodologyMessage(wave, missing));
    }
    async result(chatId, args) {
        const context = await this.latestWave(chatId);
        if (!context)
            return;
        const [figureName, assignmentText] = splitPipe(args);
        if (!figureName || !assignmentText)
            return this.telegram.sendMessage(chatId, "Uso: <code>/resultado Nombre | conocimiento=68 | favorable=41 | desfavorable=34 | intencion=22</code>");
        const figure = (await this.store.listFigures(chatId, context.process.id)).find((item) => normalize(item.name) === normalize(figureName));
        if (!figure)
            return this.telegram.sendMessage(chatId, "Figura no encontrada en el proceso activo.");
        let saved = 0;
        for (const [key, value] of Object.entries(parseAssignments(assignmentText))) {
            const metric = parseMetric(key);
            const numeric = Number(value.replace("%", ""));
            if (!metric || !Number.isFinite(numeric))
                continue;
            await this.store.saveResult(createMetricResult({ chatId, processId: context.process.id, waveId: context.wave.id, figureId: figure.id, metric, value: numeric, now: this.now() }));
            saved++;
        }
        await this.telegram.sendMessage(chatId, `✅ ${saved} indicadores registrados para <b>${esc(figure.name)}</b> en Ola ${context.wave.number}.`);
    }
    async publication(chatId) {
        const context = await this.latestWave(chatId);
        if (!context)
            return;
        const readiness = publicationReadiness(context.process, context.wave, this.now());
        const status = readiness.ready ? "✅ Lista para revisión/publicación" : "⚠️ No lista para publicación";
        const blackout = readiness.blockedByBlackout ? "\n🚫 Bloqueo preventivo por periodo cercano a la jornada electoral." : "";
        const missing = readiness.missing.length ? `\n\nPendientes:\n${readiness.missing.map((item) => `• ${esc(item)}`).join("\n")}` : "";
        await this.telegram.sendMessage(chatId, `📣 <b>REVISIÓN DE PUBLICACIÓN — OLA ${context.wave.number}</b>\n\n${status}${blackout}${missing}\n\nEl bot no publica ni presenta resultados como predicción de ganador.`);
    }
    async setLatestWaveStatus(chatId, status) {
        const context = await this.latestWave(chatId);
        if (!context)
            return;
        await this.setWaveStatus(chatId, context.wave.id, status);
    }
    async setWaveStatus(chatId, waveId, status) {
        const wave = await this.store.getWave(chatId, waveId);
        if (!wave)
            return this.telegram.sendMessage(chatId, "Ola no encontrada.");
        await this.store.saveWave({ ...wave, status });
        const labels = { draft: "Borrador", approved: "Aprobada", fieldwork: "En levantamiento", closed: "Cerrada" };
        await this.telegram.sendMessage(chatId, `✅ Ola ${wave.number}: <b>${labels[status]}</b>.`);
    }
    async latestWave(chatId) {
        const scopeCode = (await this.store.getScope(chatId)) ?? "NLE";
        const process = (await this.store.listProcesses(chatId, scopeCode)).at(-1);
        if (!process) {
            await this.telegram.sendMessage(chatId, "Primero crea el proceso con <code>/elecciones Nombre del proceso | AAAA-MM-DD</code>.");
            return undefined;
        }
        const wave = (await this.store.listWaves(chatId, process.id)).at(-1);
        if (!wave) {
            await this.telegram.sendMessage(chatId, "Aún no hay olas. Crea una con <code>/ola</code>.");
            return undefined;
        }
        return { process, wave };
    }
}
function methodologyMessage(wave, missing) {
    return `📑 <b>METODOLOGÍA — OLA ${wave.number}</b>\n\nMétodo: ${wave.methodology.fieldMethod}\nMuestra: ${wave.methodology.sampleSize ?? "pendiente"}\nPoblación: ${esc(wave.methodology.targetPopulation ?? "pendiente")}\n\n<b>Pendientes de transparencia</b>\n${missing}\n\nActualiza con:\n<code>/metodologia muestra=800 | poblacion=Personas de 18 años y más... | inicio=2026-10-01 | fin=2026-10-03 | confianza=95% | error=±3.5% | no_respuesta=12% | rechazo=18% | patrocinador=... | realiza=... | publica=... | marco=... | diseno=... | estimacion=... | ponderacion=...</code>`;
}
function parseAssignments(value) {
    const result = {};
    for (const part of value.split("|").map((item) => item.trim()).filter(Boolean)) {
        const index = part.indexOf("=");
        if (index < 1)
            continue;
        result[normalize(part.slice(0, index)).replace(/\s+/g, "_")] = part.slice(index + 1).trim();
    }
    return result;
}
function splitPipe(value) {
    const [first = "", ...rest] = value.split("|");
    return [first.trim(), rest.join("|").trim() || undefined];
}
function parseMetric(value) {
    const map = { conocimiento: "knowledge", favorable: "favorable", desfavorable: "unfavorable", intencion: "vote_intention", segunda: "second_choice", prioridad: "issue_priority" };
    return map[normalize(value).replace(/\s+/g, "_")];
}
function normalize(value) { return value.trim().toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function esc(value) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
