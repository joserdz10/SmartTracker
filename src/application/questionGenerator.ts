import { fallbackQuestions, type SurveyQuestion } from "../domain/questions.js";

export interface QuestionGenerator {
  generate(topic: string, scopeName: string): Promise<readonly SurveyQuestion[]>;
}

export class ResilientQuestionGenerator implements QuestionGenerator {
  constructor(private readonly apiKey?: string, private readonly model = "gpt-5.6-luna") {}

  async generate(topic: string, scopeName: string): Promise<readonly SurveyQuestion[]> {
    if (!this.apiKey) return fallbackQuestions(topic);
    try {
      return await this.generateWithOpenAI(topic, scopeName);
    } catch {
      return fallbackQuestions(topic);
    }
  }

  private async generateWithOpenAI(topic: string, scopeName: string): Promise<readonly SurveyQuestion[]> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: buildPrompt(topic, scopeName) })
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const payload = await response.json() as OpenAIResponse;
    return parseQuestions(extractText(payload));
  }
}

type OpenAIResponse = Readonly<{
  output_text?: string;
  output?: readonly { content?: readonly { type?: string; text?: string }[] }[];
}>;

function extractText(payload: OpenAIResponse): string {
  if (payload.output_text) return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI no devolvió texto.");
}

function parseQuestions(text: string): readonly SurveyQuestion[] {
  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(cleaned) as { questions?: unknown };
  if (!Array.isArray(parsed.questions)) throw new Error("Formato de preguntas inválido.");
  const questions = parsed.questions.map(parseQuestion).filter((item): item is SurveyQuestion => item !== undefined);
  if (questions.length < 3) throw new Error("Se recibieron pocas preguntas válidas.");
  return questions.slice(0, 6);
}

function parseQuestion(value: unknown): SurveyQuestion | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as { text?: unknown; options?: unknown };
  if (typeof item.text !== "string" || !Array.isArray(item.options)) return undefined;
  const options = item.options.filter((option): option is string => typeof option === "string");
  if (options.length < 2) return undefined;
  return { text: item.text.trim(), options };
}

function buildPrompt(topic: string, scopeName: string): string {
  return `Genera 5 preguntas neutrales para una encuesta de opinión pública sobre "${topic}" en ${scopeName}.\n` +
    "No induzcas respuestas, no recomiendes votar por nadie y evita lenguaje propagandístico. " +
    "Cada pregunta debe medir una sola idea y ser apta para IVR/DTMF. Incluye No sabe / no responde cuando corresponda. " +
    'Devuelve SOLO JSON válido con esta forma: {"questions":[{"text":"...","options":["..."]}]}';
}
