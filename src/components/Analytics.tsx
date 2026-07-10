import React from 'react';
import { Invoice, WalletState } from '../types';
import { PieChart, Activity, TrendingUp, DollarSign } from 'lucide-react';

interface AnalyticsProps {
  invoices: Invoice[];
  wallet: WalletState;
}

export default function Analytics({ invoices, wallet }: AnalyticsProps) {
  // Simple analytics logic based on invoices
  const totalFunded = invoices.filter(i => i.status === 'Funded' || i.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const totalInvoices = invoices.length;
  
  const avgReturn = totalInvoices > 0 ? (invoices.reduce((sum, inv) => sum + inv.annualReturn, 0) / totalInvoices).toFixed(1) : '0';

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-on-background mb-2">Portfolio Analytics</h1>
        <p className="text-zinc-500">Live network insights and performance metrics for {wallet.address}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 border border-black/10 rounded">
          <div className="flex items-center gap-3 text-zinc-600 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm tracking-wider uppercase">Total Capital Deployed</h3>
          </div>
          <p className="text-4xl font-display font-bold">${totalFunded.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 border border-black/10 rounded">
          <div className="flex items-center gap-3 text-zinc-600 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-sm tracking-wider uppercase">Average Portfolio Yield</h3>
          </div>
          <p className="text-4xl font-display font-bold text-green-700">{avgReturn}%</p>
        </div>

        <div className="bg-white p-6 border border-black/10 rounded">
          <div className="flex items-center gap-3 text-zinc-600 mb-4">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-sm tracking-wider uppercase">Active Network Assets</h3>
          </div>
          <p className="text-4xl font-display font-bold">{totalInvoices}</p>
        </div>
      </div>

      <div className="bg-white p-8 border border-black/10 rounded flex flex-col items-center justify-center min-h-[300px] text-center">
        <PieChart className="w-16 h-16 text-zinc-300 mb-4" />
        <h3 className="text-xl font-bold text-zinc-700 mb-2">Advanced Analytics Upcoming</h3>
        <p className="text-zinc-500 max-w-md">Our data science team is actively building real-time D3 topological portfolio maps. This section will feature complex visual yield predictors in the next protocol upgrade.</p>
      </div>
    </div>
  );
}
