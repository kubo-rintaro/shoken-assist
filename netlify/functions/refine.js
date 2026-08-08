// 「AIで改良」ボタンが押されたときに呼ばれます。
// APIキーはこのサーバー側関数の中だけで使われ、利用者のブラウザには一切渡りません。
//
// 必要な環境変数（Netlifyの管理画面 > Site settings > Environment variables で設定）：
//   GEMINI_API_KEY … Google AI Studioで取得したAPIキー

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { originalText, instruction } = JSON.parse(event.body || "{}");

  if (!originalText || !instruction) {
    return { statusCode: 400, body: JSON.stringify({ error: "必要な情報が不足しています" }) };
  }

  const systemPrompt = `あなたは日本の学校の通知表・所見文の改良を手伝うアシスタントです。
教員から与えられた元の文章を、指示に従って改良してください。
- 元の文章にない事実を創作しない
- 通知表として自然で丁寧な文体を保つ
- 出力は改良後の文章のみ。前置き・説明は一切つけない`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `元の文章:\n${originalText}\n\n改良の指示:\n${instruction}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "AI呼び出しに失敗しました");

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";

    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
