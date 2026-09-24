export type RadarItem = Readonly<{
  title: string;
  summary: string;
  surveyAngle: string;
  watchMatch?: string;
}>;

export type RadarReport = Readonly<{
  items: readonly RadarItem[];
  sourceUrls: readonly string[];
}>;

export interface RadarAnalyzer {
  analyze(scopeName: string, watches: readonly string[]): Promise<RadarReport>;
}

export class OpenAIRadarAnalyzer implements RadarAnalyzer {
  constructor(private readonly apiKey?: string, private readonly model = "gpt-5.6-luna") {}

  async analyze(scopeName: string, watches: readonly string[]): Promise<RadarReport> {
    if (!this.apiKey) throw new Error("RADAR_REQUIRES_OPENAI");
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
    if (!response.ok) throw new Error(`OpenAI Radar ${response.status}`);
    const payload = await response.json() as OpenAIResponse;
    return { items: parseItems(extractText(payload)), sourceUrls: extractUrls(payload) };
  }
}

type Annotation = Readonly<{ type?: string; url?: string }>;
type Content = Readonly<{ type?: string; text?: string; annotations?: readonly Annotation[] }>;
type Output = Readonly<{ content?: readonly Content[] }>;
type OpenAIResponse = Readonly<{ output_text?: string; output?: readonly Output[] }>;

function extractText(payload: OpenAIResponse): string {
  if (payload.output_text) return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("Radar sin texto de salida.");
}

function extractUrls(payload: OpenAIResponse): readonly string[] {
  const urls = new Set<string>();
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      for (const annotation of content.annotations ?? []) {
        if (annotation.url) urls.add(annotation.url);
      }
    }
  }
  return [...urls].slice(0, 8);
}

function parseItems(text: string): readonly RadarItem[] {
  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
  const data = JSON.parse(cleaned) as { items?: unknown };
  if (!Array.isArray(data.items)) throw new Error("Radar devolvió un formato inválido.");
  const items = data.items.map(parseItem).filter((item): item is RadarItem => item !== undefined);
  if (!items.length) throw new Error("Radar no devolvió insights válidos.");
  return items.slice(0, 5);
}

function parseItem(value: unknown): RadarItem | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.title !== "string" || typeof item.summary !== "string" || typeof item.survey_angle !== "string") return undefined;
  return {
    title: item.title.trim(),
    summary: item.summary.trim(),
    surveyAngle: item.survey_angle.trim(),
    ...(typeof item.watch_match === "string" && item.watch_match.trim() ? { watchMatch: item.watch_match.trim() } : {})
  };
}

function buildPrompt(scopeName: string, watches: readonly string[]): string {
  const watchText = watches.length ? watches.join(", ") : "ninguno";
  return `Busca noticias y acontecimientos políticos/electorales públicos recientes, preferentemente de las últimas 24 horas, relevantes para ${scopeName}. ` +
    `Watch especiales del usuario: ${watchText}. Prioriza acontecimientos vinculados con esas figuras o temas y agrupa notas duplicadas. ` +
    "Identifica hasta 5 acontecimientos que puedan justificar una medición neutral de opinión pública o incorporarse a una ola de tracking electoral. " +
    "No califiques candidatos, no recomiendes opciones políticas, no predigas ganadores y no uses lenguaje persuasivo. " +
    "Para cada acontecimiento explica de manera factual qué ocurrió y qué variable neutral podría medirse. " +
    'Devuelve SOLO JSON válido con esta forma: {"items":[{"title":"...","summary":"...","survey_angle":"...","watch_match":"nombre del watch si aplica, o cadena vacía"}]}';
}
