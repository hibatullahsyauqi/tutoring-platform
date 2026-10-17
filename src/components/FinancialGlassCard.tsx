'use client';

import LiquidText from '@/components/LiquidText';
import GlassSelect from '@/components/GlassSelect';
import { useState } from 'react';
import {
  CurrencyCode,
  ExchangeRates,
  CURRENCY_METADATA,
  formatCurrency,
} from '@/lib/currency';

export default function FinancialGlassCard({
  activeMonthName,
  endOfMonthDay,
  disbursementLabel,
  completedCount,
  grossSalaryIDR,
  pphTaxIDR,
  totalFinesIDR,
  totalDeductionsIDR,
  netSalaryIDR,
  rates,
  ratesUpdated,
  ratesAreLive,
}: {
  activeMonthName: string;
  endOfMonthDay: number;
  disbursementLabel: string;
  completedCount: number;
  grossSalaryIDR: number;
  pphTaxIDR: number;
  totalFinesIDR: number;
  totalDeductionsIDR: number;
  netSalaryIDR: number;
  rates: ExchangeRates;
  ratesUpdated: string;
  ratesAreLive: boolean;
}) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('IDR');

  const currencies: CurrencyCode[] = [
    'IDR',
    'USD',
    'GBP',
    'EUR',
    'SGD',
    'AUD',
    'MYR',
    'CNY',
    'JPY',
    'RUB',
  ];

  // Calculate live conversion quote relative to 1 unit of foreign currency
  const getExchangeQuote = () => {
    if (selectedCurrency === 'IDR') return null;
    const rate = rates[selectedCurrency];
    if (!rate) return null;
    const oneForeignInIDR = Math.round(1 / rate);
    return `1 ${selectedCurrency} ≈ Rp ${oneForeignInIDR.toLocaleString('id-ID')}`;
  };

  return (
    <section className="glass-panel p-6 transition-all space-y-4">
      {/* CARD HEADER & CURRENCY SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3">
        <div>
          <h2 className="text-base font-bold text-[#0f172a]">
            {activeMonthName} Earnings Forecast
          </h2>
          <span className="text-[11px] text-slate-600 font-medium">
            Billing Cycle: 1st – {endOfMonthDay} {activeMonthName} · Payout on {disbursementLabel}
          </span>
        </div>

        {/* LIQUID CURRENCY SELECTOR */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {getExchangeQuote() && (
            <span className="text-[10px] font-mono text-slate-500 bg-black/5 px-2 py-1 rounded-md hidden md:inline-block">
              <LiquidText text={getExchangeQuote() ?? ''} />
            </span>
          )}
          {selectedCurrency !== 'IDR' && (
            <span
              className={`text-[10px] hidden lg:inline-block ${ratesAreLive ? 'text-slate-500' : 'text-rose-600 font-semibold'}`}
              title={ratesAreLive ? 'Daily mid-market rates, refreshed hourly' : 'Live rates unavailable, using an old fixed baseline'}
            >
              {ratesAreLive ? `Rates: ${ratesUpdated.replace(/ \+0000$/, ' UTC')}` : 'Offline baseline rates'}
            </span>
          )}

          <div className="glass-inset flex items-center gap-1.5 px-2.5 py-1">
            <span className="text-xs">{CURRENCY_METADATA[selectedCurrency].flag}</span>
            <GlassSelect
              variant="inline"
              value={selectedCurrency}
              onChange={(v) => setSelectedCurrency(v as CurrencyCode)}
              ariaLabel="Currency"
              options={currencies.map((code) => ({ value: code, label: `${code} (${CURRENCY_METADATA[code].symbol})` }))}
            />
          </div>
        </div>
      </div>

      {/* 4 STATS BOXES WITH INSTANT CONVERSION */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div className="glass-card-subtle p-4">
          <div className="text-[11px] text-slate-600 font-medium">Completed ({activeMonthName})</div>
          <div className="text-xl font-bold text-[#0f172a] mt-1">{completedCount}</div>
        </div>

        <div className="glass-card-subtle p-4">
          <div className="text-[11px] text-slate-600 font-medium">Gross Earnings</div>
          <div className="text-xl font-bold text-[#0f172a] mt-1">
            <LiquidText text={formatCurrency(grossSalaryIDR, selectedCurrency, rates)} />
          </div>
        </div>

        <div className="glass-card-subtle p-4">
          <div className="text-[11px] text-slate-600 font-medium">Deductions (Tax + Fines)</div>
          <div className="text-xl font-bold text-rose-600 mt-1">
            <LiquidText text={`-${formatCurrency(totalDeductionsIDR, selectedCurrency, rates)}`} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 space-y-0.5">
            <div>
              <LiquidText text={`PPh 2.5%: ${formatCurrency(pphTaxIDR, selectedCurrency, rates)}`} />
            </div>
            <div>
              <LiquidText text={`Fines: ${formatCurrency(totalFinesIDR, selectedCurrency, rates)}`} />
            </div>
          </div>
        </div>

        <div className="p-4 glass-card-subtle outline outline-2 outline-[#3d6b52]/40">
          <div className="text-[11px] font-bold text-[#0f172a]">Net Due ({disbursementLabel})</div>
          <div className="text-xl font-bold text-emerald-800 mt-1">
            <LiquidText text={formatCurrency(netSalaryIDR, selectedCurrency, rates)} />
          </div>
          {totalDeductionsIDR > grossSalaryIDR && (
            <div className="text-[10px] text-rose-600 mt-1.5">
              Deductions exceed earnings this month, so net is shown as 0.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}