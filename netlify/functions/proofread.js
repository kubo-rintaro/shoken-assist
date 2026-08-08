// 「添削・誤字脱字」ボタンが押されたときに呼ばれます。
// APIキーはこのサーバー側関数の中だけで使われ、利用者のブラウザには一切渡りません。
//
// 必要な環境変数:
//   ANTHROPIC_API_KEY … Anthropicで取得したAPIキー

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { text } = JSON.parse(event.body || "{}");
  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: "文章が入力されていません" }) };
  }

  const systemPrompt = `あなたは日本語の文章を添削する校正者です。
教員が書いた通知表の所見文について、誤字・脱字・不自然な表現・文法的な誤りのみを指摘してください。
内容の是非には踏み込まず、あくまで「言葉として正しいか」だけをチェックしてください。
問題がない場合は、無理に指摘を作らないでください。

出力は必ず次のJSON形式のみで返してください。前置き・説明・コードブロック記号は一切つけないでください。
{
  "issues": [{"original": "誤りの箇所", "suggestion": "修正案", "reason": "誤字/脱字/表現/文法"}],
  "corrected_text": "修正をすべて反映した文章全体"
}
指摘がない場合は issues を空配列にし、corrected_text には元の文章をそのまま入れてください。`;

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
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "AI呼び出しに失敗しました");

    const raw = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
