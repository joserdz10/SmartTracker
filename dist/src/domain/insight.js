export function createInsight(input) {
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
