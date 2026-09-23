import { BotApp } from "../application/botApp.js";
import { ResilientQuestionGenerator } from "../application/questionGenerator.js";
import { OpenAIRadarAnalyzer } from "../application/radarAnalyzer.js";
import { FileStore } from "../infrastructure/fileStore.js";
import { TelegramClient } from "../infrastructure/telegram.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN");

const telegram = new TelegramClient(token);
const store = new FileStore(process.env.DATA_FILE ?? "./data/state.json");
const questions = new ResilientQuestionGenerator(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL);
const radar = new OpenAIRadarAnalyzer(process.env.OPENAI_API_KEY, process.env.OPENAI_RADAR_MODEL ?? process.env.OPENAI_MODEL);
const app = new BotApp(telegram, store, questions, radar);

let offset = 0;
console.log(JSON.stringify({ event: "bot_started" }));

while (true) {
  try {
    const updates = await telegram.getUpdates(offset);
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1);
      await app.handle(update);
    }
  } catch (error) {
    console.error(JSON.stringify({ event: "polling_error", message: error instanceof Error ? error.message : String(error) }));
    await delay(3000);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
