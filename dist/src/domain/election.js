export function createElectionProcess(input) {
    const name = normalize(input.name);
    if (!name)
        throw new Error("PROCESS_NAME_REQUIRED");
    return {
        id: `P${stableId(`${input.chatId}:${input.scopeCode}:${name}`)}`,
        chatId: input.chatId,
        scopeCode: input.scopeCode,
        name,
        ...(input.electionDate ? { electionDate: input.electionDate } : {}),
        active: true,
        createdAt: input.now
    };
}
export function createFigureProfile(input) {
    const name = normalize(input.name);
    if (!name)
        throw new Error("FIGURE_NAME_REQUIRED");
    return {
        id: `F${stableId(`${input.processId}:${name}`)}`,
        chatId: input.chatId,
        processId: input.processId,
        name,
        active: true,
        createdAt: input.now
    };
}
export function createWave(input) {
    return {
        id: `W${stableId(`${input.processId}:${input.number}:${input.mode}:${input.now}`)}`,
        chatId: input.chatId,
        processId: input.processId,
        number: input.number,
        mode: input.mode,
        status: "draft",
        coreVersion: "v1",
        contextualInsightIds: input.insightId ? [input.insightId] : [],
        questions: input.questions,
        methodology: { fieldMethod: "Telefónica IVR" },
        createdAt: input.now
    };
}
export function createMetricResult(input) {
    if (!Number.isFinite(input.value) || input.value < 0 || input.value > 100)
        throw new Error("INVALID_METRIC_VALUE");
    return {
        id: `R${stableId(`${input.waveId}:${input.figureId ?? "general"}:${input.metric}:${input.label ?? ""}`)}`,
        chatId: input.chatId,
        processId: input.processId,
        waveId: input.waveId,
        ...(input.figureId ? { figureId: input.figureId } : {}),
        metric: input.metric,
        value: input.value,
        ...(input.label ? { label: input.label } : {}),
        createdAt: input.now
    };
}
export function applyMethodology(current, fields) {
    const sample = fields.muestra ? Number(fields.muestra) : current.sampleSize;
    return {
        fieldMethod: "Telefónica IVR",
        ...(fields.poblacion ? { targetPopulation: fields.poblacion } : current.targetPopulation ? { targetPopulation: current.targetPopulation } : {}),
        ...(sample && Number.isFinite(sample) ? { sampleSize: sample } : {}),
        ...(field(fields, "inicio", current.fieldStart) ? { fieldStart: field(fields, "inicio", current.fieldStart) } : {}),
        ...(field(fields, "fin", current.fieldEnd) ? { fieldEnd: field(fields, "fin", current.fieldEnd) } : {}),
        ...(field(fields, "confianza", current.confidenceLevel) ? { confidenceLevel: field(fields, "confianza", current.confidenceLevel) } : {}),
        ...(field(fields, "error", current.marginOfError) ? { marginOfError: field(fields, "error", current.marginOfError) } : {}),
        ...(field(fields, "no_respuesta", current.nonResponseRate) ? { nonResponseRate: field(fields, "no_respuesta", current.nonResponseRate) } : {}),
        ...(field(fields, "rechazo", current.rejectionRate) ? { rejectionRate: field(fields, "rechazo", current.rejectionRate) } : {}),
        ...(field(fields, "patrocinador", current.sponsor) ? { sponsor: field(fields, "patrocinador", current.sponsor) } : {}),
        ...(field(fields, "realiza", current.conductedBy) ? { conductedBy: field(fields, "realiza", current.conductedBy) } : {}),
        ...(field(fields, "publica", current.publicationRequestedBy) ? { publicationRequestedBy: field(fields, "publica", current.publicationRequestedBy) } : {}),
        ...(field(fields, "marco", current.samplingFrame) ? { samplingFrame: field(fields, "marco", current.samplingFrame) } : {}),
        ...(field(fields, "diseno", current.samplingDesign) ? { samplingDesign: field(fields, "diseno", current.samplingDesign) } : {}),
        ...(field(fields, "estimacion", current.estimationProcedure) ? { estimationProcedure: field(fields, "estimacion", current.estimationProcedure) } : {}),
        ...(field(fields, "ponderacion", current.weighting) ? { weighting: field(fields, "ponderacion", current.weighting) } : {}),
        ...(field(fields, "costo", current.cost) ? { cost: field(fields, "costo", current.cost) } : {})
    };
}
function field(fields, key, current) {
    return fields[key]?.trim() || current;
}
function normalize(value) {
    return value.trim().replace(/\s+/g, " ");
}
function stableId(value) {
    let hash = 2166136261;
    for (const char of value)
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return (hash >>> 0).toString(36).toUpperCase();
}
