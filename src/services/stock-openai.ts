import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeWithChatGPT(symbol: string, cagr5: number) {
  const prompt = `
  Stock: ${symbol}
  5-Year CAGR: ${cagr5.toFixed(2)}%

  Rule: Only pass if CAGR > 0.
  Return JSON with {symbol, passed, reason}.
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

// Example usage
(async () => {
  const result = await analyzeWithChatGPT("AAPL", 12.5);
  console.log(result);
})();
