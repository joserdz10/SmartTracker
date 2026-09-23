import type { InlineKeyboard, TelegramPort, TelegramUpdate } from "../application/telegramPort.js";

export class TelegramClient implements TelegramPort {
  private readonly baseUrl: string;

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async getUpdates(offset: number): Promise<readonly TelegramUpdate[]> {
    return this.call("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
  }

  async sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
    await this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {})
    });
  }

  async answerCallback(id: string): Promise<void> {
    await this.call("answerCallbackQuery", { callback_query_id: id });
  }

  private async call<T>(method: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json() as { ok: boolean; result: T; description?: string };
    if (!response.ok || !payload.ok) throw new Error(payload.description ?? `Telegram ${response.status}`);
    return payload.result;
  }
}
