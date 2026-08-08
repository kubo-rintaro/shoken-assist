// 「AIで改良」ボタンが押されたときに呼ばれます。
// APIキーはこのサーバー側関数の中だけで使われ、利用者のブラウザには一切渡りません。
//
// 必要な環境変数（Netlifyの管理画面 > Site settings > Environment variables で設定）:
//   ANTHROPIC_API_KEY … Anthropicで取得したAPIキー

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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: `元の文章:\n${originalText}\n\n改良の指示:\n${instruction}` }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "AI呼び出しに失敗しました");

    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
