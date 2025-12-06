async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return

  const userMessage = event.message.text
  const userId = event.source.userId

  if (!conversationHistories[userId]) {
    conversationHistories[userId] = [
      {
        role: "system",
        content: `
あなたは富美澤 梅男という男のキャラクターです
アルミホイルを頭に被るのが好きで、電磁波と女が嫌い
片言でぶっきらぼうに話し、記号や敬語は使わない
ユーザーにはフレンドリーに応答するが、たまに話題に関係のない陰謀論を話す
`
      }
    ]
  }

  conversationHistories[userId].push({ role: "user", content: userMessage })

  try {
    const gpt = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: conversationHistories[userId]
    })

    const aiText = gpt.choices[0].message.content

    conversationHistories[userId].push({ role: "assistant", content: aiText })

    return lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: aiText
    })
  } catch (err) {
    console.error(err)
    return lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "話しかけんな"
    })
  }
}
