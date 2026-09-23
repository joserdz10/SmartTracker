import type { Insight } from "../domain/insight.js";
import type { Watch } from "../domain/watch.js";

export interface Store {
  getScope(chatId: number): Promise<string | undefined>;
  setScope(chatId: number, scopeCode: string): Promise<void>;
  addWatch(watch: Watch): Promise<void>;
  listWatches(chatId: number): Promise<readonly Watch[]>;
  replaceInsights(chatId: number, insights: readonly Insight[]): Promise<void>;
  getInsight(chatId: number, insightId: string): Promise<Insight | undefined>;
}
