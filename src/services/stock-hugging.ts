import yahooFinance from 'yahoo-finance2';
import fetch from 'node-fetch';
import dotenv from "dotenv";
dotenv.config();

interface AnalysisResult {
  symbol: string;
  sixMonthChange: number;
  oneYearChange: number;
  cagr5: number;
  cagr10: number;
  passed: boolean;
  aiOpinion?: string;
}

export async function analyzeStocks(symbol: string): Promise<AnalysisResult> {
  try {
    const history: any = await yahooFinance.historical(symbol, { period1: '2015-01-01', interval: '1mo' });
    if (!history.length) {
      return { symbol, sixMonthChange: 0, oneYearChange: 0, cagr5: 0, cagr10: 0, passed: false };
    }

    // Price calculations
    const latest = history[history.length - 1].close;
    const sixMonth = history.slice(-6)[0].close;
    const oneYear = history.slice(-12)[0]?.close;
    const fiveYear = history[history.length - 61]?.close || latest;
    const tenYear = history[0].close;

    const sixMonthChange = ((latest - sixMonth) / sixMonth) * 100;
    const oneYearChange = ((latest - oneYear) / oneYear) * 100;
    const cagr5 = ((latest / fiveYear) ** (1 / 5) - 1) * 100;
    const cagr10 = ((latest / tenYear) ** (1 / 10) - 1) * 100;

    const passed = (sixMonthChange <= -5 || oneYearChange <= -5) && (cagr5 > 0 || cagr10 > 0);

    let aiOpinion = "";
    if(passed) {
      // ✅ Hugging Face API analysis layer
      const prompt = `
      Stock: ${symbol}
      6M Change: ${sixMonthChange.toFixed(2)}%
      1Y Change: ${oneYearChange.toFixed(2)}%
      5Y CAGR: ${cagr5.toFixed(2)}%
      10Y CAGR: ${cagr10.toFixed(2)}%

      Question: Based on this data, should this stock be considered for buying?
      Give a short yes/no with reasoning.
      `;

      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.HF_API_KEY}`,  // 🔑 Hugging Face token
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
          }
        );

        if (!response.ok) {
          // log error response text instead of parsing as JSON
          const errText = await response.text();
          throw new Error(`HuggingFace API error: ${response.status} ${errText}`);
        }

        const data = (await response.json()) as
          | { summary_text: string }[]
          | { error: string };
        
        console.log('huggingface data ::', data);
        // if it's an error
        if (Array.isArray(data)) {
          aiOpinion = data[0]?.summary_text ?? "No AI opinion";
        } else {
          aiOpinion = `Error: ${data.error}`;
        }
      } catch (err) {
        console.error("HuggingFace API error:", err);
      }
    }

    return { symbol, sixMonthChange, oneYearChange, cagr5, cagr10, passed, aiOpinion };
  } catch (error) {
    console.error('Error analyzing stock:', error);
    return { symbol, sixMonthChange: 0, oneYearChange: 0, cagr5: 0, cagr10: 0, passed: false };
  }
}
