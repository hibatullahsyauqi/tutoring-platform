export type CurrencyCode =
  | 'IDR'
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'CNY'
  | 'JPY'
  | 'MYR'
  | 'RUB'
  | 'SGD'
  | 'AUD';

export type ExchangeRates = Record<CurrencyCode, number>;

export const CURRENCY_METADATA: Record<CurrencyCode, { name: string; symbol: string; flag: string }> = {
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  RUB: { name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
};

// Fallback rates if network is offline
const FALLBACK_RATES: ExchangeRates = {
  IDR: 1,
  USD: 0.000062,
  GBP: 0.000049,
  EUR: 0.000058,
  CNY: 0.00045,
  JPY: 0.0095,
  MYR: 0.00028,
  RUB: 0.006,
  SGD: 0.000083,
  AUD: 0.000095,
};

export async function getLiveExchangeRates(): Promise<{
  rates: ExchangeRates;
  lastUpdated: string;
}> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/IDR', {
      next: { revalidate: 3600 }, // Automatically cache & refresh hourly
    });

    if (!res.ok) throw new Error('FX request failed');
    const data = await res.json();

    return {
      rates: {
        IDR: 1,
        USD: data.rates.USD || FALLBACK_RATES.USD,
        GBP: data.rates.GBP || FALLBACK_RATES.GBP,
        EUR: data.rates.EUR || FALLBACK_RATES.EUR,
        CNY: data.rates.CNY || FALLBACK_RATES.CNY,
        JPY: data.rates.JPY || FALLBACK_RATES.JPY,
        MYR: data.rates.MYR || FALLBACK_RATES.MYR,
        RUB: data.rates.RUB || FALLBACK_RATES.RUB,
        SGD: data.rates.SGD || FALLBACK_RATES.SGD,
        AUD: data.rates.AUD || FALLBACK_RATES.AUD,
      },
      lastUpdated: data.time_last_update_utc || 'Recently',
    };
  } catch (err) {
    console.warn('Using fallback exchange rates due to network:', err);
    return {
      rates: FALLBACK_RATES,
      lastUpdated: 'Offline baseline',
    };
  }
}

export function formatCurrency(amountInIDR: number, targetCurrency: CurrencyCode, rates: ExchangeRates): string {
  const rate = rates[targetCurrency] || 1;
  const converted = amountInIDR * rate;

  const noDecimals = targetCurrency === 'IDR' || targetCurrency === 'JPY';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: targetCurrency,
    maximumFractionDigits: noDecimals ? 0 : 2,
    minimumFractionDigits: noDecimals ? 0 : 2,
  }).format(converted);
}