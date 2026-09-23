export type Insight = Readonly<{
  id: string;
  chatId: number;
  scopeCode: string;
  title: string;
  summary: string;
  surveyAngle: string;
  watchMatch?: string;
  sourceUrls: readonly string[];
  createdAt: string;
}>;

export function createInsight(input: Readonly<{
  chatId: number;
  scopeCode: string;
  sequence: number;
  title: string;
  summary: string;
  surveyAngle: string;
  watchMatch?: string;
  sourceUrls: readonly string[];
  now: string;
}>): Insight {
  const id = `I${input.now.replace(/\D/g, "").slice(2, 14)}-${input.sequence}`;
  return {
    id,
    chatId: input.chatId,
    scopeCode: input.scopeCode,
    title: input.title.trim(),
    summary: input.summary.trim(),
    surveyAngle: input.surveyAngle.trim(),
    ...(input.watchMatch ? { watchMatch: input.watchMatch.trim() } : {}),
    sourceUrls: input.sourceUrls,
    createdAt: input.now
  };
}
