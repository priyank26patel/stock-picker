import { getTopHoldings } from './etf';
import { analyzeStocks } from './stock-hugging';
import { sendEmail } from './email';
// import { sendWhatsAppTemplate, sendWhatsAppText } from "./whatsappCloud";


export async function runWeeklyAnalysis() {
  const etfs = ['VII','SCHD','DGRO']; // You can pass more ETFs later

  let report: string = '';

  for (const etf of etfs) {
    report += `\nETF: ${etf}\n`;
    const holdings = await getTopHoldings(etf);
    console.log('holdings :: ', holdings);

    const filtered = [];
    for (const stock of holdings) {
      const analysis = await analyzeStocks(stock);
      if (analysis.passed) {
        filtered.push(analysis);
      }
    }

    if(filtered.length === 0) {
      report += '🚫 Wait at the moment! This ETF stocks are too good or too bad to buy!\n';
    } else {
      report += filtered.map(f => `✅ ${f.symbol} | 6M Change: ${f.sixMonthChange.toFixed(2)}% | 1Y Change: ${f.oneYearChange.toFixed(2)}% | 5Y CAGR: ${f.cagr5.toFixed(2)}% | 10Y CAGR: ${f.cagr10.toFixed(2)}%\nAI Analysis: ${f.aiOpinion}`).join('\n\n');
    }

    report += '\n';
  }

  await sendEmail('priyank.briskia@gmail.com', 'Stock Picker', report);

  // 1) If user messaged you in last 24h:
  // await sendWhatsAppText("Stock Picker");

  // 2) If you want to proactively push every week (no session open):
  // await sendWhatsAppTemplate("weekly_report", ['Stock Picker']);
}
