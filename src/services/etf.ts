import yahooFinance from 'yahoo-finance2';

// Get top 10 holdings of an ETF
export async function getTopHoldings(etf: string): Promise<string[]> {
  try {
    const result: any = await yahooFinance.quoteSummary(etf, { modules: ['topHoldings'] });
    return result.topHoldings.holdings.slice(0, 10).map((h: any) => h.symbol);
  } catch (error) {
    console.error('Error fetching ETF holdings:', error);
    return [];
  }
}
