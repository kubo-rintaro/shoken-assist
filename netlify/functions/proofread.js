// 「添削・誤字脱字」ボタンが押されたときに呼ばれます。
// APIキーはこのサーバー側関数の中だけで使われ、利用者のブラウザには一切渡りません。
//
// 必要な環境変数（Netlifyの管理画面 > Site settings > Environment variables で設定）：
//   GEMINI_API_KEY … Google AI Studioで取得したAPIキー

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
              parts: [{ text }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "AI呼び出しに失敗しました");

    const raw =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
