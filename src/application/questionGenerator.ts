import { fallbackProposal, type SurveyProposal, type SurveyQuestion, type SurveyType } from "../domain/questions.js";

export interface QuestionGenerator {
  generate(topic: string, scopeName: string): Promise<SurveyProposal>;
}

export class ResilientQuestionGenerator implements QuestionGenerator {
  constructor(private readonly apiKey?: string, private readonly model = "gpt-5.6-luna") {}

  async generate(topic: string, scopeName: string): Promise<SurveyProposal> {
    if (!this.apiKey) return fallbackProposal(topic);
    try {
      return await this.generateWithOpenAI(topic, scopeName);
    } catch {
      return fallbackProposal(topic);
    }
  }

  private async generateWithOpenAI(topic: string, scopeName: string): Promise<SurveyProposal> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: buildPrompt(topic, scopeName) })
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const payload = await response.json() as OpenAIResponse;
    return parseProposal(extractText(payload));
  }
}

type OpenAIResponse = Readonly<{
  output_text?: string;
  output?: readonly { content?: readonly { type?: string; text?: string }[] }[];
}>;

type RawProposal = Readonly<{
  surveyType?: unknown;
  objective?: unknown;
  recommendedMethod?: unknown;
  questions?: unknown;
}>;

const SURVEY_TYPES: readonly SurveyType[] = [
  "Coyuntural", "Evaluación de gobierno", "Evaluación de personaje", "Conocimiento e imagen",
  "Prioridades ciudadanas", "Intención de voto", "Escenario electoral", "Tracking"
];

function extractText(payload: OpenAIResponse): string {
  if (payload.output_text) return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI no devolvió texto.");
}

function parseProposal(text: string): SurveyProposal {
  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(cleaned) as RawProposal;
  const questions = parseQuestions(parsed.questions);
  if (typeof parsed.objective !== "string" || !parsed.objective.trim()) throw new Error("Objetivo inválido.");
  return {
    surveyType: parseSurveyType(parsed.surveyType),
    objective: parsed.objective.trim(),
    recommendedMethod: "Telefónica IVR",
    questions
  };
}

function parseSurveyType(value: unknown): SurveyType {
  if (typeof value !== "string") return "Coyuntural";
  return SURVEY_TYPES.find((type) => type.toLocaleLowerCase("es-MX") === value.trim().toLocaleLowerCase("es-MX")) ?? "Coyuntural";
}

function parseQuestions(value: unknown): readonly SurveyQuestion[] {
  if (!Array.isArray(value)) throw new Error("Formato de preguntas inválido.");
  const questions = value.map(parseQuestion).filter((item): item is SurveyQuestion => item !== undefined);
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
  return `Diseña una propuesta de encuesta de opinión pública sobre "${topic}" en ${scopeName}.\n` +
    "Primero clasifica el tipo de encuesta usando EXACTAMENTE una de estas categorías: Coyuntural, Evaluación de gobierno, Evaluación de personaje, Conocimiento e imagen, Prioridades ciudadanas, Intención de voto, Escenario electoral, Tracking. " +
    "Explica el objetivo en una frase y genera 5 preguntas neutrales. No induzcas respuestas, no recomiendes votar por nadie y evita lenguaje propagandístico. " +
    "Cada pregunta debe medir una sola idea y ser apta para IVR/DTMF. Incluye No sabe / no responde cuando corresponda. " +
    'Devuelve SOLO JSON válido con esta forma: {"surveyType":"Coyuntural","objective":"...","recommendedMethod":"Telefónica IVR","questions":[{"text":"...","options":["..."]}]}';
}
