// Mortgage calculator helpers
export const DEFAULT_ANNUAL_RATE = 0.08;
export const DOWN_PAYMENTS = [0.2, 0.25, 0.3] as const;
export const TERMS_YEARS = [5, 10, 15, 20] as const;

export function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function buildMortgageMatrix(price: number, annualRate = DEFAULT_ANNUAL_RATE) {
  return DOWN_PAYMENTS.map((dp) => {
    const down = price * dp;
    const financed = price - down;
    return {
      downPct: dp,
      down,
      financed,
      terms: TERMS_YEARS.map((y) => ({ years: y, monthly: monthlyPayment(financed, annualRate, y) })),
    };
  });
}

export const fmtGTQ = (n: number) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", maximumFractionDigits: 0 }).format(n);
