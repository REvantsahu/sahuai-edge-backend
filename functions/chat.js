const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
let sentAnyData = false;

export async function onRequestOptions() {
  return new Response(null, {
    headers: CORS_HEADERS,
  });
}
export async function onRequestPost({ request, env }) {
  const { message } = await request.json();

  if (!message || message.length > 4000) {
    return new Response("Invalid message", { status: 400 });
  }

  // 🔑 KEYS FROM ENV (comma separated)
  const KEYS = env.OPENROUTER_KEYS.split(",");

  // 🧠 MODEL FALLBACK ORDER (guest-safe)
  const MODELS = [
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.1-8b-instruct",
    "google/gemma-2-9b-it",
    "mistralai/mixtral-8x7b-instruct"
  ];

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

  const stream = new ReadableStream({
    async start(controller) {
      const keys = shuffle([...KEYS]);
      const models = shuffle([...MODELS]);

      outer:
      for (const key of keys) {
        for (const model of models) {
          try {
            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${key}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://sahuai.pages.dev"
                },
                body: JSON.stringify({
                  model,
                  stream: true,
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
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                if (data === "[DONE]") break;

                try {
                  const json = JSON.parse(data);
                  const text = json.choices[0]?.delta?.content;
                  if (text) {
  sentAnyData = true;
  controller.enqueue(encoder.encode(text));
}

                } catch {}
              }
            }

            break outer; // ✅ success → stop fallback
          } catch (err) {
            continue; // try next model/key
          }
        }
      }

      if (!sentAnyData) {
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
