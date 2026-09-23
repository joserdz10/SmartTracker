export type InlineButton = Readonly<{ text: string; callback_data: string }>;
export type InlineKeyboard = readonly (readonly InlineButton[])[];

export type TelegramUpdate = Readonly<{
  update_id: number;
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
}>;

export interface TelegramPort {
  getUpdates(offset: number): Promise<readonly TelegramUpdate[]>;
  sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void>;
  answerCallback(id: string): Promise<void>;
}
