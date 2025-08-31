import yahooFinance from 'yahoo-finance2';
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AnalysisResult {
  symbol: string;
  sixMonthChange: number;
  oneYearChange: number;
  cagr5: number;
  cagr10: number;
  peRatio: number | null;
  pbRatio: number | null;
  pegRatio: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  rsi: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  passed: boolean;
}

export async function analyzeStocks(symbol: string): Promise<AnalysisResult> {
  try {
    // 1. Price History
    const history: any = await yahooFinance.historical(symbol, { period1: '2015-01-01', interval: '1mo' });
    if (!history.length) {
      return { 
        symbol, sixMonthChange: 0, oneYearChange: 0, cagr5: 0, cagr10: 0,
        peRatio: null, pbRatio: null, pegRatio: null, revenueGrowth: null, epsGrowth: null,
        rsi: null, debtToEquity: null, currentRatio: null, passed: false
      };
    }

    const latest = history[history.length - 1].close;
    const sixMonth = history.slice(-6)[0].close;
    const oneYear = history.slice(-12)[0]?.close;
    const fiveYear = history[history.length - 61]?.close || latest;
    const tenYear = history[0].close;

    const sixMonthChange = ((latest - sixMonth) / sixMonth) * 100;
    const oneYearChange = ((latest - oneYear) / oneYear) * 100;
    const cagr5 = ((latest / fiveYear) ** (1 / 5) - 1) * 100;
    const cagr10 = ((latest / tenYear) ** (1 / 10) - 1) * 100;

    // 2. Fundamentals
    const summary = await yahooFinance.quoteSummary(symbol, { modules: ["summaryDetail", "financialData", "defaultKeyStatistics"] });

    const peRatio = summary.summaryDetail?.trailingPE || null;
    const pbRatio = summary.defaultKeyStatistics?.priceToBook || null;
    const pegRatio = summary.defaultKeyStatistics?.pegRatio || null;
    const debtToEquity = summary.financialData?.debtToEquity || null;
    const currentRatio = summary.financialData?.currentRatio || null;

    // Revenue & EPS growth (CAGR estimation based on historical data)
    const revenueGrowth = summary.financialData?.revenueGrowth ? summary.financialData.revenueGrowth * 100 : null;
    const epsGrowth = summary.financialData?.earningsGrowth ? summary.financialData.earningsGrowth * 100 : null;

    // 3. RSI Calculation (14-period)
    const closes = history.slice(-14).map((h: any) => h.close);
    let gains = 0, losses = 0;
    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // 4. Screening Conditions
    const passed =
      // (peRatio !== null && peRatio < 25) &&
      // (pbRatio !== null && pbRatio < 3) &&
      // (pegRatio !== null && pegRatio < 1.5) &&
      // (revenueGrowth !== null && revenueGrowth > 5) &&
      // (epsGrowth !== null && epsGrowth > 7) &&
      (sixMonthChange <= -5 || oneYearChange <= -5) &&
      (cagr5 > 5 && cagr10 > 5) &&
      // (rsi < 40) &&
      // (debtToEquity !== null && debtToEquity < 1) &&
      (currentRatio !== null && currentRatio > 1.2);

    return { 
      symbol, sixMonthChange, oneYearChange, cagr5, cagr10,
      peRatio, pbRatio, pegRatio, revenueGrowth, epsGrowth,
      rsi, debtToEquity, currentRatio, passed
    };

  } catch (error) {
    console.error('Error analyzing stock:', symbol, error);
    return { 
      symbol, sixMonthChange: 0, oneYearChange: 0, cagr5: 0, cagr10: 0,
      peRatio: null, pbRatio: null, pegRatio: null, revenueGrowth: null, epsGrowth: null,
      rsi: null, debtToEquity: null, currentRatio: null, passed: false
    };
  }
}

// ChatGPT layer
export async function analyzeWithChatGPT(symbol: string, metrics: any) {
  const prompt = `
  Stock: ${symbol}
  5-Year CAGR: ${metrics.cagr5.toFixed(2)}%
  10-Year CAGR: ${metrics.cagr10.toFixed(2)}%
  1-Year Change: ${metrics.oneYearChange.toFixed(2)}%

  Rules:
  - Pass if 5-Year CAGR > 0.
  - Otherwise fail.
  
  Give me JSON like:
  { "symbol": "...", "passed": true/false, "reason": "..." }
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}
