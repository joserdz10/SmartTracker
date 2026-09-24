# Casa Encuestadora IA — Telegram Bot

MVP inicial del centro de mando en Telegram para monitoreo, watchlist e ideación de encuestas.

## Incluido en v0.1

- `/start`: menú principal.
- `/estado`: selector de 33 ámbitos (32 entidades + Política Nacional).
- `/watch <nombre o tema>`: crea un monitoreo especial dentro del ámbito activo.
- `/watchlist`: lista los monitoreos activos.
- `/radar`: busca acontecimientos recientes con OpenAI Web Search, agrupa oportunidades de medición y genera insights con fuentes.
- Cada insight incluye un botón `📊 Generar preguntas` para convertirlo en una propuesta de cuestionario.
- `/preguntas <tema>`: genera preguntas neutrales. Usa OpenAI si existe `OPENAI_API_KEY`; si no, usa una plantilla local.

## Configuración

Requiere Node.js 22+.

1. Copia `.env.example` a `.env` o configura las variables en Railway.
2. Define `TELEGRAM_BOT_TOKEN`.
3. Define `OPENAI_API_KEY` para activar Radar y generación dinámica de preguntas. Sin ella, `/preguntas` usa una plantilla neutral local, pero `/radar` no puede buscar noticias.
4. Para persistencia en Railway, monta un Volume y usa por ejemplo `DATA_FILE=/data/state.json`.

## Ejecutar

```bash
npm install
npm run build
npm start
```

Para desarrollo local con archivo `.env`:

```bash
npm run start:local
```

## Railway

Build command:

```text
npm install && npm run build
```

Start command:

```text
npm start
```

No subas tokens ni llaves al repositorio.

## Próximo corte

1. Botones Aprobar / Editar / Vigilar / Descartar para cuestionarios.
2. Agrupación avanzada por stories y deduplicación histórica.
3. Persistencia robusta multiusuario.
4. Levantamiento telefónico/Dinstar y resultados.

## Nota de despliegue Railway

El build de TypeScript genera el entrypoint en `dist/src/api/main.js`. El script `npm start` ya apunta a esa ruta.

## Clasificación de encuesta

Al generar preguntas, el bot recomienda primero el tipo de medición y muestra su objetivo y método de levantamiento. Tipos soportados en el MVP:

- Coyuntural
- Evaluación de gobierno
- Evaluación de personaje
- Conocimiento e imagen
- Prioridades ciudadanas
- Intención de voto
- Escenario electoral
- Tracking

El método recomendado inicial es **Telefónica IVR**, alineado al MVP de levantamiento con Dinstar.
