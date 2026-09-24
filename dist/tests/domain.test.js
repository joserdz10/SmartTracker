import test from "node:test";
import assert from "node:assert/strict";
import { SCOPES, getScope } from "../src/domain/scopes.js";
import { createWatch } from "../src/domain/watch.js";
import { fallbackProposal, fallbackQuestions } from "../src/domain/questions.js";
import { applyMethodology, createElectionProcess, createWave } from "../src/domain/election.js";
import { publicationReadiness } from "../src/domain/publication.js";
test("includes 32 states plus national politics", () => {
    assert.equal(SCOPES.length, 33);
    assert.equal(getScope("NAC")?.name, "Política Nacional");
});
test("creates a normalized watch inside the selected scope", () => {
    const watch = createWatch({ chatId: 10, scopeCode: "NLE", query: "  Samuel   García ", now: "2026-09-23T12:00:00.000Z" });
    assert.equal(watch.query, "Samuel García");
});
test("fallback questionnaire is neutral and usable without AI", () => {
    const questions = fallbackQuestions("movilidad metropolitana");
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => question.options.length >= 3));
});
test("classifies an explicit voting-intention topic", () => {
    const proposal = fallbackProposal("intención de voto para la próxima elección");
    assert.equal(proposal.surveyType, "Intención de voto");
});
test("publication readiness requires methodology transparency fields", () => {
    const process = createElectionProcess({ chatId: 1, scopeCode: "NLE", name: "Elección", electionDate: "2027-06-06", now: "2026-09-23T12:00:00.000Z" });
    const wave = createWave({ chatId: 1, processId: process.id, number: 1, mode: "tracking", questions: fallbackQuestions("elección"), now: "2026-09-23T12:00:00.000Z" });
    const readiness = publicationReadiness(process, wave, "2026-09-23T12:00:00.000Z");
    assert.equal(readiness.ready, false);
    assert.ok(readiness.missing.includes("tamaño de muestra"));
});
test("methodology update keeps IVR method and accepts required fields", () => {
    const methodology = applyMethodology({ fieldMethod: "Telefónica IVR" }, { muestra: "800", poblacion: "Personas de 18 años y más", confianza: "95%" });
    assert.equal(methodology.sampleSize, 800);
    assert.equal(methodology.fieldMethod, "Telefónica IVR");
});
test("publication readiness conservatively blocks the three days before election day", () => {
    const process = createElectionProcess({ chatId: 1, scopeCode: "NLE", name: "Elección", electionDate: "2027-06-06", now: "2026-09-23T12:00:00.000Z" });
    const methodology = applyMethodology({ fieldMethod: "Telefónica IVR" }, {
        poblacion: "Personas de 18 años y más", muestra: "800", inicio: "2027-05-20", fin: "2027-05-22", confianza: "95%", error: "±3.5%", no_respuesta: "10%", rechazo: "15%", patrocinador: "Casa", realiza: "Casa", publica: "Casa", marco: "Marco", diseno: "Estratificado", estimacion: "Frecuencias ponderadas", ponderacion: "Sexo y edad"
    });
    const wave = { ...createWave({ chatId: 1, processId: process.id, number: 1, mode: "tracking", questions: fallbackQuestions("elección"), now: "2026-09-23T12:00:00.000Z" }), methodology };
    const readiness = publicationReadiness(process, wave, "2027-06-04T12:00:00-06:00");
    assert.equal(readiness.blockedByBlackout, true);
    assert.equal(readiness.ready, false);
});
