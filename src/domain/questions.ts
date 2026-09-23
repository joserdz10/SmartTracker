export type SurveyQuestion = Readonly<{
  text: string;
  options: readonly string[];
}>;

export function fallbackQuestions(topic: string): readonly SurveyQuestion[] {
  const subject = topic.trim() || "este tema";
  return [
    question(`Antes de esta encuesta, ¿había escuchado hablar sobre ${subject}?`, ["Sí", "No", "No sabe / no responde"]),
    question(`En general, ¿qué tan importante considera ${subject} para su comunidad?`, ["Muy importante", "Algo importante", "Poco importante", "Nada importante", "No sabe / no responde"]),
    question(`¿Qué tanto considera que ${subject} le afecta directamente a usted o a su familia?`, ["Mucho", "Algo", "Poco", "Nada", "No sabe / no responde"]),
    question(`Respecto a ${subject}, ¿considera que las autoridades deberían darle...?`, ["Más prioridad", "La misma prioridad", "Menos prioridad", "No sabe / no responde"]),
    question(`Pensando en ${subject}, ¿diría que su opinión actual es...?`, ["Muy favorable", "Algo favorable", "Ni favorable ni desfavorable", "Algo desfavorable", "Muy desfavorable", "No sabe / no responde"])
  ];
}

function question(text: string, options: readonly string[]): SurveyQuestion {
  return { text, options };
}
