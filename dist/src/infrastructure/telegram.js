export class TelegramClient {
    baseUrl;
    constructor(token) {
        this.baseUrl = `https://api.telegram.org/bot${token}`;
    }
    async getUpdates(offset) {
        return this.call("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
    }
    async sendMessage(chatId, text, keyboard) {
        await this.call("sendMessage", {
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {})
        });
    }
    async answerCallback(id) {
        await this.call("answerCallbackQuery", { callback_query_id: id });
    }
    async call(method, body) {
        const response = await fetch(`${this.baseUrl}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok)
            throw new Error(payload.description ?? `Telegram ${response.status}`);
        return payload.result;
    }
}
