import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
};

const lineClient = new Client(config);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();

app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(handleEvent));
  res.status(200).end();
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userMessage = event.message.text;

  const gpt = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: userMessage }],
  });

  const aiText = gpt.choices[0].message.content;

  return lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: aiText,
  });
}

app.listen(3000, () => console.log("Server running on port 3000"));
