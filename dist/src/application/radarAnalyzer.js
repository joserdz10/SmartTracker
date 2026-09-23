export class OpenAIRadarAnalyzer {
    apiKey;
    model;
    constructor(apiKey, model = "gpt-5.6-luna") {
        this.apiKey = apiKey;
        this.model = model;
    }
    async analyze(scopeName, watches) {
        if (!this.apiKey)
            throw new Error("RADAR_REQUIRES_OPENAI");
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: this.model,
                tools: [{ type: "web_search" }],
                tool_choice: "required",
                input: buildPrompt(scopeName, watches)
            })
        });
        if (!response.ok)
            throw new Error(`OpenAI Radar ${response.status}`);
        const payload = await response.json();
        return { items: parseItems(extractText(payload)), sourceUrls: extractUrls(payload) };
    }
}
function extractText(payload) {
    if (payload.output_text)
        return payload.output_text;
    for (const item of payload.output ?? []) {
        for (const content of item.content ?? []) {
            if (content.type === "output_text" && content.text)
                return content.text;
        }
    }
    throw new Error("Radar sin texto de salida.");
}
function extractUrls(payload) {
    const urls = new Set();
    for (const item of payload.output ?? []) {
        for (const content of item.content ?? []) {
            for (const annotation of content.annotations ?? []) {
                if (annotation.url)
                    urls.add(annotation.url);
            }
        }
    }
    return [...urls].slice(0, 8);
}
function parseItems(text) {
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const data = JSON.parse(cleaned);
    if (!Array.isArray(data.items))
        throw new Error("Radar devolvió un formato inválido.");
    const items = data.items.map(parseItem).filter((item) => item !== undefined);
    if (!items.length)
        throw new Error("Radar no devolvió insights válidos.");
    return items.slice(0, 5);
}
function parseItem(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const item = value;
    if (typeof item.title !== "string" || typeof item.summary !== "string" || typeof item.survey_angle !== "string")
        return undefined;
    return {
        title: item.title.trim(),
        summary: item.summary.trim(),
        surveyAngle: item.survey_angle.trim(),
        ...(typeof item.watch_match === "string" && item.watch_match.trim() ? { watchMatch: item.watch_match.trim() } : {})
    };
}
function buildPrompt(scopeName, watches) {
    const watchText = watches.length ? watches.join(", ") : "ninguno";
    return `Busca noticias y acontecimientos públicos recientes, preferentemente de las últimas 24 horas, relevantes para ${scopeName}. ` +
        `Watch especiales del usuario: ${watchText}. Agrupa notas duplicadas sobre el mismo acontecimiento. ` +
        "Identifica hasta 5 acontecimientos que puedan justificar una medición de opinión pública. " +
        "No califiques candidatos, no recomiendes opciones políticas, no predigas ganadores y no uses lenguaje persuasivo. " +
        "Para cada acontecimiento explica de manera factual qué ocurrió y qué variable neutral podría medirse. " +
        'Devuelve SOLO JSON válido con esta forma: {"items":[{"title":"...","summary":"...","survey_angle":"...","watch_match":"nombre del watch si aplica, o cadena vacía"}]}';
}
