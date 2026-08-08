exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { originalText, instruction } = JSON.parse(event.body || "{}");
  if (!originalText || !instruction) {
    return { statusCode: 400, body: JSON.stringify({ error: "必要な情報が不足しています" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const systemPrompt = `あなたは日本の学校の通知表・所見文の改良を手伝うアシスタントです。
元の文章にない事実を創作せず、通知表として自然で丁寧な文体を保ってください。
出力は改良後の文章のみ。前置き・説明は一切つけないでください。`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n元の文章:\n${originalText}\n\n改良の指示:\n${instruction}` }] }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "AI呼び出しに失敗しました");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
