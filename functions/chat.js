const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    const { message } = await request.json();

    if (!message || message.length > 4000) {
      return new Response("Invalid message", { status: 400 });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Reply ONLY in clean HTML. Chill bro vibes.\n\n" +
                    message,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Gemini API failed");
    }

    const json = await response.json();

    const text =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "<div>⚠️ No response from Gemini.</div>";

    return new Response(text, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return new Response("<div>❌ Gemini error. Retry.</div>", {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
}
