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

  const KEYS = 
  [
    "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",
    "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",
    "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",
    "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",
    "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"
];
  const MODELS = [
    "meta-llama/llama-3.1-8b-instruct",
    "deepseek/deepseek-chat",
    "google/gemma-2-9b-it",
    "mistralai/mixtral-8x7b-instruct"
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
