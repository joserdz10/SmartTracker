export function fallbackProposal(topic) {
    const subject = topic.trim() || "este tema";
    return {
        surveyType: classifySurveyType(subject),
        objective: `Medir conocimiento, percepción y relevancia ciudadana sobre ${subject}.`,
        recommendedMethod: "Telefónica IVR",
        questions: fallbackQuestions(subject)
    };
}
export function fallbackQuestions(topic) {
    const subject = topic.trim() || "este tema";
    return [
        question(`Antes de esta encuesta, ¿había escuchado hablar sobre ${subject}?`, ["Sí", "No", "No sabe / no responde"]),
        question(`En general, ¿qué tan importante considera ${subject} para su comunidad?`, ["Muy importante", "Algo importante", "Poco importante", "Nada importante", "No sabe / no responde"]),
        question(`¿Qué tanto considera que ${subject} le afecta directamente a usted o a su familia?`, ["Mucho", "Algo", "Poco", "Nada", "No sabe / no responde"]),
        question(`Respecto a ${subject}, ¿considera que las autoridades deberían darle...?`, ["Más prioridad", "La misma prioridad", "Menos prioridad", "No sabe / no responde"]),
        question(`Pensando en ${subject}, ¿diría que su opinión actual es...?`, ["Muy favorable", "Algo favorable", "Ni favorable ni desfavorable", "Algo desfavorable", "Muy desfavorable", "No sabe / no responde"])
    ];
}
function classifySurveyType(topic) {
    const value = topic.toLocaleLowerCase("es-MX");
    if (includesAny(value, ["intención de voto", "por quién votaría", "preferencia electoral"]))
        return "Intención de voto";
    if (includesAny(value, ["careo", "escenario electoral", "candidatos", "aspirantes"]))
        return "Escenario electoral";
    if (includesAny(value, ["tracking", "seguimiento", "medición anterior", "evolución"]))
        return "Tracking";
    if (includesAny(value, ["aprobación", "evaluación del gobierno", "gestión", "administración estatal", "administración municipal"]))
        return "Evaluación de gobierno";
    if (includesAny(value, ["evaluación de personaje", "imagen de", "opinión sobre", "conocimiento de"]))
        return "Evaluación de personaje";
    if (includesAny(value, ["prioridad", "principal problema", "preocupación", "agenda pública"]))
        return "Prioridades ciudadanas";
    if (includesAny(value, ["conocimiento", "ha escuchado", "reconocimiento", "imagen"]))
        return "Conocimiento e imagen";
    return "Coyuntural";
}
function includesAny(value, terms) {
    return terms.some((term) => value.includes(term));
}
function question(text, options) {
    return { text, options };
}
