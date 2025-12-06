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

// 複数ユーザー対応会話履歴
const conversationHistories = {};

app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(handleEvent));
  res.status(200).end();
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userMessage = event.message.text;
  const userId = event.source.userId;

  // 会話履歴がなければ初期化
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

  // ユーザーの発言を履歴に追加
  conversationHistories[userId].push({ role: "user", content: userMessage });

  try {
    // GPT に問い合わせ
    const gpt = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: conversationHistories[userId],
    });

    const aiText = gpt.choices[0].message.content;

    // 応答を履歴に追加
    conversationHistories[userId].push({ role: "assistant", content: aiText });

    // LINE に返信
    return lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: aiText,
    });
  } catch (err) {
    console.error(err);
    return lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "すまん、今返事できない",
    });
  }
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
