import type { ElectionProcess, ElectionWave, FigureProfile, MetricResult } from "../domain/election.js";
import type { Insight } from "../domain/insight.js";
import type { Watch } from "../domain/watch.js";

export interface Store {
  getScope(chatId: number): Promise<string | undefined>;
  setScope(chatId: number, scopeCode: string): Promise<void>;
  addWatch(watch: Watch): Promise<void>;
  listWatches(chatId: number): Promise<readonly Watch[]>;
  replaceInsights(chatId: number, insights: readonly Insight[]): Promise<void>;
  getInsight(chatId: number, insightId: string): Promise<Insight | undefined>;
  listInsights(chatId: number, scopeCode: string): Promise<readonly Insight[]>;
  saveProcess(process: ElectionProcess): Promise<void>;
  listProcesses(chatId: number, scopeCode: string): Promise<readonly ElectionProcess[]>;
  saveFigure(figure: FigureProfile): Promise<void>;
  listFigures(chatId: number, processId: string): Promise<readonly FigureProfile[]>;
  saveWave(wave: ElectionWave): Promise<void>;
  listWaves(chatId: number, processId: string): Promise<readonly ElectionWave[]>;
  getWave(chatId: number, waveId: string): Promise<ElectionWave | undefined>;
  saveResult(result: MetricResult): Promise<void>;
  listResults(chatId: number, processId: string, figureId?: string): Promise<readonly MetricResult[]>;
}
