# Casa Encuestadora IA — Telegram Electoral Tracker v0.2.0

Bot de Telegram para monitoreo electoral, tracking por olas, perfiles de figuras, Radar de coyuntura, cuestionarios y control metodológico.

## Qué incluye esta versión

- 32 estados + `Política Nacional` como ámbito lógico 33.
- Radar con búsqueda web mediante OpenAI Responses API + `web_search`.
- Watchlist manual por persona, institución o tema.
- Un perfil electoral crea automáticamente un watch de esa figura.
- Procesos electorales independientes por ámbito.
- Olas de tracking con cuestionario maestro versionado (`v1`).
- Conocimiento y opinión por figura en cada ola.
- Intención de voto y segunda opción cuando existen entre 2 y 7 figuras activas, para mantener el cuestionario compatible con IVR/DTMF.
- Radar -> Insight -> `Agregar a próxima ola` o `Encuesta flash`.
- Historial de eventos del Radar (`/eventos`).
- Registro manual provisional de resultados mientras no esté conectado Dinstar.
- Series históricas por figura (`/tracking Nombre`).
- Escenario medido de la ola (`/escenario`) sin ranking ni predicción.
- Ficha metodológica por ola y revisión preventiva de publicación.
- Control preventivo cercano a la jornada electoral basado en la fecha configurada del proceso.

## Flujo recomendado

```text
/estado
  -> /elecciones Elección estatal 2027 | 2027-06-06
  -> /perfil Figura A
  -> /perfil Figura B
  -> /ola
  -> /radar
  -> [Agregar a próxima ola] o [Encuesta flash]
  -> /metodologia ...
  -> /aprobar_ola
  -> /levantamiento
  -> /resultado ...
  -> /cerrar_ola
  -> /tracking
  -> /escenario
  -> /publicacion
```

## Comandos principales

- `/start` — menú principal.
- `/estado` — seleccionar uno de los 33 ámbitos.
- `/elecciones` — ver procesos del ámbito activo.
- `/elecciones Nombre | AAAA-MM-DD` — crear proceso electoral.
- `/perfil Nombre` — agregar/consultar una figura; también crea su watch.
- `/ola` — crear la siguiente ola de tracking.
- `/tracking` — resumen del proceso.
- `/tracking Nombre` — serie histórica de una figura.
- `/escenario` — intención de voto registrada en la última ola, respetando el orden de registro y sin ranking.
- `/radar` — buscar coyuntura política/electoral reciente.
- `/eventos` — mostrar historial reciente del Radar.
- `/watch Nombre o tema` — crear watch manual.
- `/watchlist` — listar watches.
- `/preguntas tema` — generar cuestionario sugerido.
- `/metodologia` — revisar ficha metodológica de la última ola.
- `/aprobar_ola` — marcar cuestionario como aprobado.
- `/levantamiento` — marcar la ola como en levantamiento (Dinstar todavía no conectado en esta versión).
- `/resultado Nombre | conocimiento=68 | favorable=41 | desfavorable=34 | intencion=22` — registrar resultados provisionales/manuales.
- `/cerrar_ola` — cerrar la ola y congelar la medición operativamente.
- `/publicacion` — revisar requisitos metodológicos y bloqueo preventivo.

## Metodología

Ejemplo de actualización:

```text
/metodologia muestra=800 | poblacion=Personas de 18 años y más residentes en Nuevo León | inicio=2026-10-01 | fin=2026-10-03 | confianza=95% | error=±3.5% | no_respuesta=12% | rechazo=18% | patrocinador=Empresa X | realiza=Casa Encuestadora IA | publica=Medio X | marco=Base telefónica estratificada | diseno=Estratificado | estimacion=Frecuencias ponderadas | ponderacion=Sexo, edad y región | costo=$100000
```

El bot conserva el fraseo exacto del cuestionario de cada ola. La revisión de publicación exige, entre otros campos, población objetivo, muestra, fechas, nivel de confianza, margen de error, no respuesta, rechazo, responsables, marco/diseño muestral, estimación y ponderación.

## Neutralidad electoral

El bot está diseñado para medición descriptiva. No genera un ganador, no crea scores de electabilidad, no recomienda votar por una figura y no ordena figuras según una valoración política. Los cambios entre olas se presentan como observaciones, no como causalidad atribuida a noticias ni como predicción electoral.

## Variables Railway

```text
TELEGRAM_BOT_TOKEN=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
OPENAI_RADAR_MODEL=gpt-5.6-luna
DATA_FILE=/data/state.json
```

Para pruebas sin Volume puede usarse `DATA_FILE=./data/state.json`, pero en producción se recomienda un Volume persistente en `/data`.

## Build / start

```bash
npm install
npm run build
npm start
```

Railway:

```text
Build Command: npm install && npm run build
Start Command: npm start
```

## Estado técnico

- TypeScript estricto.
- Sin dependencia de SDK de Telegram; usa Bot API directamente.
- Persistencia JSON atómica para el MVP.
- `npm run typecheck` y `npm test` deben pasar antes de desplegar.
- Siguiente integración prevista: Survey Orchestrator + Dinstar/IVR + ingestión automática de respuestas y ponderación.
