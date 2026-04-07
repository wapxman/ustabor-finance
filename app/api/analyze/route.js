export async function POST(request) {
  const { summary } = await request.json();
  if (!summary) return Response.json({ error: "No data" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "API key not configured" }, { status: 500 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: "Ты финансовый аналитик компании Ustabor. Проанализируй банковскую выписку и дай:\n1. Краткий вывод о финансовом состоянии (2-3 предложения)\n2. 3-5 конкретных наблюдений с цифрами\n3. 2-3 рекомендации по оптимизации\n\nОтвечай на русском, используй эмодзи для структуры.\n\n" + summary,
        }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "Ошибка анализа";
    return Response.json({ insight: text });
  } catch (e) {
    return Response.json({ error: "AI analysis failed" }, { status: 500 });
  }
}