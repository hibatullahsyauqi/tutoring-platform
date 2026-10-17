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

const SUPPORTED: CurrencyCode[] = ['IDR', 'USD', 'GBP', 'EUR', 'CNY', 'JPY', 'MYR', 'RUB', 'SGD', 'AUD'];

export async function getLiveExchangeRates(): Promise<{
  rates: ExchangeRates;
  lastUpdated: string;
  isLive: boolean;
}> {
  try {
    // IDR-base quotes carry ~2 significant digits (e.g. AUD 0.00008), so fetch a
    // USD-base table and derive the IDR cross rates from it instead.
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 }, // Automatically cache & refresh hourly
    });

    if (!res.ok) throw new Error(`FX request failed: ${res.status}`);
    const data = await res.json();

    const usdToIdr = data.rates?.IDR;
    if (typeof usdToIdr !== 'number' || usdToIdr <= 0) throw new Error('FX payload missing IDR');

    const rates = { ...FALLBACK_RATES };
    for (const code of SUPPORTED) {
      const perUsd = data.rates[code];
      if (typeof perUsd === 'number' && perUsd > 0) rates[code] = perUsd / usdToIdr;
    }
    rates.IDR = 1;

    return {
      rates,
      lastUpdated: data.time_last_update_utc || 'Recently',
      isLive: true,
    };
  } catch (err) {
    console.warn('Using fallback exchange rates due to network:', err);
    return {
      rates: FALLBACK_RATES,
      lastUpdated: 'Offline baseline',
      isLive: false,
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