// index.js
import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// LINE Bot 設定
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
};

const lineClient = new Client(config);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();

// 複数ユーザーの会話履歴を保持
const conversationHistories = {};

// Webhook 受信
app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(handleEvent));
  res.status(200).end(); // LINE に成功を返す
});

// メッセージ処理
async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userMessage = event.message.text;
  const userId = event.source.userId;

  // ユーザーごとの履歴初期化
 if (!conversationHistories[userId]) {
  conversationHistories[userId] = [
    {
      role: "system",
      content: `
あなたは富美澤 梅男という男のAIです
片言で話し句読点や記号は使わない
男らしくフランクで粗野な口調で話す
絶対に自分をChatGPTと名乗らない
ユーザーにはフレンドリーに応答する
`
    }
  ];
}
