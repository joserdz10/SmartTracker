import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Store } from "../application/store.js";
import type { Insight } from "../domain/insight.js";
import type { Watch } from "../domain/watch.js";

type State = { scopes: Record<string, string>; watches: Watch[]; insights: Insight[] };

export class FileStore implements Store {
  constructor(private readonly path: string) {}

  async getScope(chatId: number): Promise<string | undefined> {
    return (await this.read()).scopes[String(chatId)];
  }

  async setScope(chatId: number, scopeCode: string): Promise<void> {
    const state = await this.read();
    state.scopes[String(chatId)] = scopeCode;
    await this.write(state);
  }

  async addWatch(watch: Watch): Promise<void> {
    const state = await this.read();
    state.watches = state.watches.filter((item) => item.id !== watch.id);
    state.watches.push(watch);
    await this.write(state);
  }

  async listWatches(chatId: number): Promise<readonly Watch[]> {
    return (await this.read()).watches.filter((watch) => watch.chatId === chatId && watch.active);
  }

  async replaceInsights(chatId: number, insights: readonly Insight[]): Promise<void> {
    const state = await this.read();
    state.insights = state.insights.filter((insight) => insight.chatId !== chatId);
    state.insights.push(...insights);
    await this.write(state);
  }

  async getInsight(chatId: number, insightId: string): Promise<Insight | undefined> {
    return (await this.read()).insights.find((insight) => insight.chatId === chatId && insight.id === insightId);
  }

  private async read(): Promise<State> {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8")) as Partial<State>;
      return { scopes: parsed.scopes ?? {}, watches: parsed.watches ?? [], insights: parsed.insights ?? [] };
    } catch (error) {
      if (isMissing(error)) return { scopes: {}, watches: [], insights: [] };
      throw error;
    }
  }

  private async write(state: State): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.tmp`;
    await writeFile(temp, JSON.stringify(state, null, 2), "utf8");
    await rename(temp, this.path);
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}
