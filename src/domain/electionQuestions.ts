import type { FigureProfile } from "./election.js";
import type { SurveyQuestion } from "./questions.js";

export function buildTrackingCore(figures: readonly FigureProfile[]): readonly SurveyQuestion[] {
  const questions: SurveyQuestion[] = [
    q("¿Qué tan interesado está en la próxima elección?", ["Mucho", "Algo", "Poco", "Nada", "No sabe / no responde"]),
    q("¿Cuál considera que es actualmente el principal problema de su estado?", ["Seguridad", "Economía y empleo", "Servicios públicos", "Movilidad", "Otro", "No sabe / no responde"])
  ];
  for (const figure of figures) {
    questions.push(q(`¿Conoce o ha escuchado hablar de ${figure.name}?`, ["Sí", "No", "No sabe / no responde"]));
    questions.push(q(`En general, ¿su opinión sobre ${figure.name} es...?`, ["Muy favorable", "Algo favorable", "Ni favorable ni desfavorable", "Algo desfavorable", "Muy desfavorable", "No sabe / no responde"]));
  }
  if (figures.length >= 2 && figures.length <= 7) questions.push(...electoralPreferenceQuestions(figures));
  return questions;
}

function electoralPreferenceQuestions(figures: readonly FigureProfile[]): readonly SurveyQuestion[] {
  const options = [...figures.map((figure) => figure.name), "Otro / ninguno", "No sabe / no responde"];
  return [
    q("Si hoy fuera la elección y estas fueran las opciones, ¿por cuál votaría?", options),
    q("Si su primera opción no participara, ¿cuál sería su segunda opción?", options)
  ];
}

function q(text: string, options: readonly string[]): SurveyQuestion {
  return { text, options };
}
