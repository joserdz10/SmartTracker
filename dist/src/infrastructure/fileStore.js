import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export class FileStore {
    path;
    constructor(path) {
        this.path = path;
    }
    async getScope(chatId) { return (await this.read()).scopes[String(chatId)]; }
    async setScope(chatId, scopeCode) { const state = await this.read(); state.scopes[String(chatId)] = scopeCode; await this.write(state); }
    async addWatch(watch) { const state = await this.read(); upsert(state.watches, watch); await this.write(state); }
    async listWatches(chatId) { return (await this.read()).watches.filter((x) => x.chatId === chatId && x.active); }
    async replaceInsights(chatId, insights) {
        const state = await this.read();
        for (const insight of insights)
            upsert(state.insights, insight);
        await this.write(state);
    }
    async getInsight(chatId, insightId) { return (await this.read()).insights.find((x) => x.chatId === chatId && x.id === insightId); }
    async listInsights(chatId, scopeCode) { return (await this.read()).insights.filter((x) => x.chatId === chatId && x.scopeCode === scopeCode); }
    async saveProcess(process) { const state = await this.read(); upsert(state.processes, process); await this.write(state); }
    async listProcesses(chatId, scopeCode) { return (await this.read()).processes.filter((x) => x.chatId === chatId && x.scopeCode === scopeCode && x.active); }
    async saveFigure(figure) { const state = await this.read(); upsert(state.figures, figure); await this.write(state); }
    async listFigures(chatId, processId) { return (await this.read()).figures.filter((x) => x.chatId === chatId && x.processId === processId && x.active); }
    async saveWave(wave) { const state = await this.read(); upsert(state.waves, wave); await this.write(state); }
    async listWaves(chatId, processId) { return (await this.read()).waves.filter((x) => x.chatId === chatId && x.processId === processId); }
    async getWave(chatId, waveId) { return (await this.read()).waves.find((x) => x.chatId === chatId && x.id === waveId); }
    async saveResult(result) { const state = await this.read(); upsert(state.results, result); await this.write(state); }
    async listResults(chatId, processId, figureId) {
        return (await this.read()).results.filter((x) => x.chatId === chatId && x.processId === processId && (!figureId || x.figureId === figureId));
    }
    async read() {
        try {
            const parsed = JSON.parse(await readFile(this.path, "utf8"));
            return {
                scopes: parsed.scopes ?? {}, watches: parsed.watches ?? [], insights: parsed.insights ?? [],
                processes: parsed.processes ?? [], figures: parsed.figures ?? [], waves: parsed.waves ?? [], results: parsed.results ?? []
            };
        }
        catch (error) {
            if (isMissing(error))
                return emptyState();
            throw error;
        }
    }
    async write(state) {
        await mkdir(dirname(this.path), { recursive: true });
        const temp = `${this.path}.tmp`;
        await writeFile(temp, JSON.stringify(state, null, 2), "utf8");
        await rename(temp, this.path);
    }
}
function emptyState() {
    return { scopes: {}, watches: [], insights: [], processes: [], figures: [], waves: [], results: [] };
}
function upsert(items, item) {
    const index = items.findIndex((existing) => existing.id === item.id);
    if (index >= 0)
        items[index] = item;
    else
        items.push(item);
}
function isMissing(error) {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
}
