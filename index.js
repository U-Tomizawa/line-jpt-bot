// index.js
import express from 'express';
import { Client, middleware } from '@line/bot-sdk';
import fetch from 'node-fetch'; // Node 18+ では不要かも

const app = express();

// =====================
// LINE設定
// =====================
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(lineConfig);

// =====================
// 圧縮版梅男プロンプト
// =====================
const UME_PROMPT = `
あなたは「梅男」として会話します。特徴：
- 結論先行・簡潔・例え多用・ポジティブ重視
- 冗談や比喩は話題に似た事例で表現
- 肯定的意見は明確、否定的意見は抑えめ
- 些細な認識のズレは指摘しない

【LINE用指示】
- ユーザー発言に対し、相槌を送るか送らないかをランダム化
- 相槌を送る場合はランダムで短文を選ぶ
- 相槌後、具体的な回答を必ず別メッセージで返す
- 出力はJSON形式：
{
  "reaction": "相槌の短文またはnull",
  "response": "具体的回答本文"
}
`;

// =====================
// 相槌パターンと確率
// =====================
const REACTIONS = ["ふむ","うん","うーん","あ～","はい","あぁ"];
const REACTION_PROBABILITY = 0.3;

function shouldReact() {
  return Math.random() < REACTION_PROBABILITY;
}

function getRandomReaction() {
  return REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
}

// =====================
// 会話履歴管理（ユーザーごと）
// =====================
const userHistories = {};
const MAX_HISTORY = 5;

function addUserHistory(userId, role, content) {
  if (!userHistories[userId]) userHistories[userId] = [];
  userHistories[userId].push({ role, content });
  if (userHistories[userId].length > MAX_HISTORY) userHistories[userId].shift();
}

function getUserHistory(userId) {
  return userHistories[userId] || [];
}

// =====================
// OpenAI API呼び出し関数
// =====================
async function getGPTResponse(userId, userMessage) {
  addUserHistory(userId, "user", userMessage);

  const messages = [
    { role: "system", content: UME_PROMPT },
    ...getUserHistory(userId)
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: messages,
      temperature: 0.7
    })
  });

  const data = await response.json();

  let gptOutput;
  try {
    gptOutput = JSON.parse(data.choices[0].message.content);
  } catch {
    gptOutput = { reaction: null, response: data.choices[0].message.content };
  }

  gptOutput.reaction = shouldReact() ? getRandomReaction() : null;

  addUserHistory(userId, "assistant", gptOutput.response);

  return gptOutput;
}

// =====================
// LINE Webhook
// =====================
app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(async (event) => {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      const userId = event.source.userId;

      const gptOutput = await getGPTResponse(userId, userMessage);

      if (gptOutput.reaction) {
        await client.replyMessage(event.replyToken, { type: "text", text: gptOutput.reaction });
      } else {
        await client.replyMessage(event.replyToken, { type: "text", text: "" });
      }

      await client.pushMessage(userId, { type: "text", text: gptOutput.response });
    }
  }));
  res.sendStatus(200);
});

// =====================
// サーバー起動
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
