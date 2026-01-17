const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const { message } = await request.json();

  if (!message || message.length > 4000) {
    return new Response("Invalid message", { status: 400 });
  }

  const KEYS = [env.OPENROUTER_KEYS.split(",")[0]];

  const MODELS = [
    "meta-llama/llama-3.1-8b-instruct",

  ];

  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let success = false;

      outer:
      for (const key of shuffle([...KEYS])) {
        for (const model of shuffle([...MODELS])) {
          try {
            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${key}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://sahuai-edge-backend.pages.dev",
                  "X-Title": "SahuAI"
                },
                body: JSON.stringify({
                  model,
                  stream: false,
                  messages: [
                    {
                      role: "system",
                      content:
                        "You are SahuAI Lite. Reply ONLY in clean HTML. Chill bro vibes."
                    },
                    { role: "user", content: message }
                  ]
                })
              }
            );

            if (!response.ok) throw new Error("Model failed");

            const json = await response.json();
            const text = json?.choices?.[0]?.message?.content;

            if (text) {
              controller.enqueue(encoder.encode(text));
              success = true;
              break outer;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!success) {
        controller.enqueue(
          encoder.encode("<div>⚠️ AI busy. Please try again.</div>")
        );
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
