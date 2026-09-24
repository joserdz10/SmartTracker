import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Store } from "../application/store.js";
import type { ElectionProcess, ElectionWave, FigureProfile, MetricResult } from "../domain/election.js";
import type { Insight } from "../domain/insight.js";
import type { Watch } from "../domain/watch.js";

type State = {
  scopes: Record<string, string>;
  watches: Watch[];
  insights: Insight[];
  processes: ElectionProcess[];
  figures: FigureProfile[];
  waves: ElectionWave[];
  results: MetricResult[];
};

export class FileStore implements Store {
  constructor(private readonly path: string) {}

  async getScope(chatId: number): Promise<string | undefined> { return (await this.read()).scopes[String(chatId)]; }
  async setScope(chatId: number, scopeCode: string): Promise<void> { const state = await this.read(); state.scopes[String(chatId)] = scopeCode; await this.write(state); }
  async addWatch(watch: Watch): Promise<void> { const state = await this.read(); upsert(state.watches, watch); await this.write(state); }
  async listWatches(chatId: number): Promise<readonly Watch[]> { return (await this.read()).watches.filter((x) => x.chatId === chatId && x.active); }
  async replaceInsights(chatId: number, insights: readonly Insight[]): Promise<void> {
    const state = await this.read();
    for (const insight of insights) upsert(state.insights, insight);
    await this.write(state);
  }
  async getInsight(chatId: number, insightId: string): Promise<Insight | undefined> { return (await this.read()).insights.find((x) => x.chatId === chatId && x.id === insightId); }
  async listInsights(chatId: number, scopeCode: string): Promise<readonly Insight[]> { return (await this.read()).insights.filter((x) => x.chatId === chatId && x.scopeCode === scopeCode); }

  async saveProcess(process: ElectionProcess): Promise<void> { const state = await this.read(); upsert(state.processes, process); await this.write(state); }
  async listProcesses(chatId: number, scopeCode: string): Promise<readonly ElectionProcess[]> { return (await this.read()).processes.filter((x) => x.chatId === chatId && x.scopeCode === scopeCode && x.active); }
  async saveFigure(figure: FigureProfile): Promise<void> { const state = await this.read(); upsert(state.figures, figure); await this.write(state); }
  async listFigures(chatId: number, processId: string): Promise<readonly FigureProfile[]> { return (await this.read()).figures.filter((x) => x.chatId === chatId && x.processId === processId && x.active); }
  async saveWave(wave: ElectionWave): Promise<void> { const state = await this.read(); upsert(state.waves, wave); await this.write(state); }
  async listWaves(chatId: number, processId: string): Promise<readonly ElectionWave[]> { return (await this.read()).waves.filter((x) => x.chatId === chatId && x.processId === processId); }
  async getWave(chatId: number, waveId: string): Promise<ElectionWave | undefined> { return (await this.read()).waves.find((x) => x.chatId === chatId && x.id === waveId); }
  async saveResult(result: MetricResult): Promise<void> { const state = await this.read(); upsert(state.results, result); await this.write(state); }
  async listResults(chatId: number, processId: string, figureId?: string): Promise<readonly MetricResult[]> {
    return (await this.read()).results.filter((x) => x.chatId === chatId && x.processId === processId && (!figureId || x.figureId === figureId));
  }

  private async read(): Promise<State> {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8")) as Partial<State>;
      return {
        scopes: parsed.scopes ?? {}, watches: parsed.watches ?? [], insights: parsed.insights ?? [],
        processes: parsed.processes ?? [], figures: parsed.figures ?? [], waves: parsed.waves ?? [], results: parsed.results ?? []
      };
    } catch (error) {
      if (isMissing(error)) return emptyState();
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

function emptyState(): State {
  return { scopes: {}, watches: [], insights: [], processes: [], figures: [], waves: [], results: [] };
}

function upsert<T extends { id: string }>(items: T[], item: T): void {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) items[index] = item;
  else items.push(item);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}
