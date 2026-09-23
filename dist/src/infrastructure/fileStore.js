import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export class FileStore {
    path;
    constructor(path) {
        this.path = path;
    }
    async getScope(chatId) {
        return (await this.read()).scopes[String(chatId)];
    }
    async setScope(chatId, scopeCode) {
        const state = await this.read();
        state.scopes[String(chatId)] = scopeCode;
        await this.write(state);
    }
    async addWatch(watch) {
        const state = await this.read();
        state.watches = state.watches.filter((item) => item.id !== watch.id);
        state.watches.push(watch);
        await this.write(state);
    }
    async listWatches(chatId) {
        return (await this.read()).watches.filter((watch) => watch.chatId === chatId && watch.active);
    }
    async replaceInsights(chatId, insights) {
        const state = await this.read();
        state.insights = state.insights.filter((insight) => insight.chatId !== chatId);
        state.insights.push(...insights);
        await this.write(state);
    }
    async getInsight(chatId, insightId) {
        return (await this.read()).insights.find((insight) => insight.chatId === chatId && insight.id === insightId);
    }
    async read() {
        try {
            const parsed = JSON.parse(await readFile(this.path, "utf8"));
            return { scopes: parsed.scopes ?? {}, watches: parsed.watches ?? [], insights: parsed.insights ?? [] };
        }
        catch (error) {
            if (isMissing(error))
                return { scopes: {}, watches: [], insights: [] };
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
function isMissing(error) {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
}
