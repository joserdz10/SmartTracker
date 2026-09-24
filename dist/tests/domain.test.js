import test from "node:test";
import assert from "node:assert/strict";
import { SCOPES, getScope } from "../src/domain/scopes.js";
import { createWatch } from "../src/domain/watch.js";
import { fallbackProposal, fallbackQuestions } from "../src/domain/questions.js";
test("includes 32 states plus national politics", () => {
    assert.equal(SCOPES.length, 33);
    assert.equal(getScope("NAC")?.name, "Política Nacional");
});
test("creates a normalized watch inside the selected scope", () => {
    const watch = createWatch({ chatId: 10, scopeCode: "NLE", query: "  Samuel   García ", now: "2026-09-23T12:00:00.000Z" });
    assert.equal(watch.query, "Samuel García");
    assert.equal(watch.scopeCode, "NLE");
    assert.equal(watch.active, true);
});
test("fallback questionnaire is neutral and usable without AI", () => {
    const questions = fallbackQuestions("movilidad metropolitana");
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => question.options.length >= 3));
});
test("classifies an explicit voting-intention topic", () => {
    const proposal = fallbackProposal("intención de voto para la próxima elección");
    assert.equal(proposal.surveyType, "Intención de voto");
    assert.equal(proposal.recommendedMethod, "Telefónica IVR");
});
