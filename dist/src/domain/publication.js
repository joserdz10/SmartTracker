const REQUIRED = [
    ["targetPopulation", "población objetivo"],
    ["sampleSize", "tamaño de muestra"],
    ["fieldStart", "fecha de inicio"],
    ["fieldEnd", "fecha de cierre"],
    ["confidenceLevel", "nivel de confianza"],
    ["marginOfError", "margen de error"],
    ["nonResponseRate", "frecuencia de no respuesta"],
    ["rejectionRate", "tasa de rechazo"],
    ["sponsor", "quién patrocinó/pagó"],
    ["conductedBy", "quién realizó"],
    ["publicationRequestedBy", "quién solicitó/pagó publicación"],
    ["samplingFrame", "marco muestral"],
    ["samplingDesign", "diseño muestral"],
    ["estimationProcedure", "procedimiento de estimación"],
    ["weighting", "ponderación"]
];
export function publicationReadiness(process, wave, now) {
    const missing = REQUIRED.filter(([key]) => !wave.methodology[key]).map(([, label]) => label);
    if (!wave.questions.length)
        missing.push("fraseo exacto de preguntas");
    if (!process.electionDate)
        missing.push("fecha de jornada electoral para control preventivo");
    if (wave.status !== "closed")
        missing.push("ola cerrada y resultados consolidados");
    const blockedByBlackout = process.electionDate ? inConservativeBlackout(now, process.electionDate) : false;
    return { ready: missing.length === 0 && !blockedByBlackout, blockedByBlackout, missing };
}
export function inConservativeBlackout(now, electionDate) {
    const current = new Date(now);
    const election = new Date(`${electionDate}T00:00:00-06:00`);
    if (Number.isNaN(current.getTime()) || Number.isNaN(election.getTime()))
        return false;
    const start = new Date(election);
    start.setDate(start.getDate() - 3);
    const end = new Date(election);
    end.setDate(end.getDate() + 1);
    return current >= start && current < end;
}
