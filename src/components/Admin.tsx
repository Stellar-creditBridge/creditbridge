import React from 'react';
import { Invoice, WalletState } from '../types';
import { ShieldAlert, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatStellarAddress, isAdminStellarAddress } from '../utils/stellar';

interface AdminProps {
  invoices: Invoice[];
  wallet: WalletState;
  onUpdateRisk: (id: string, risk: 'Low Risk' | 'Moderate' | 'Stable') => void;
}

const getRiskBadgeClass = (risk: string) => {
  if (risk === 'Low Risk') return 'bg-green-100 text-green-700';
  if (risk === 'Stable') return 'bg-blue-100 text-blue-700';
  return 'bg-orange-100 text-orange-700';
};

export default function Admin({ invoices, wallet, onUpdateRisk }: AdminProps) {
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending' || inv.fundingProgress < 100);
  const isAdmin = wallet.role === 'admin' || (Boolean(wallet.address) && isAdminStellarAddress(wallet.address));

  if (!wallet.address || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Access Denied</h1>
        <p className="text-zinc-500 max-w-md">
          {'Your connected wallet (' + (wallet.address ? formatStellarAddress(wallet.address, 6, 6) : 'None') + ') does not possess the necessary administrative clearance to access this protocol dashboard.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 text-red-600" />
        <div>
          <h1 className="text-3xl font-display font-bold text-on-background mb-1">Protocol Admin</h1>
          <p className="text-red-600 text-sm font-medium">Elevated Clearance Active</p>
        </div>
      </div>

      <div className="bg-white border border-red-200 rounded overflow-hidden">
        <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-red-900">Pending Network Approvals</h3>
        </div>
        <div>
          {pendingInvoices.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No pending invoices requiring administrative action.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">ID</th>
                  <th className="px-6 py-3 font-semibold">Partner</th>
                  <th className="px-6 py-3 font-semibold">Value</th>
                  <th className="px-6 py-3 font-semibold">Current Risk</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{inv.id}</td>
                    <td className="px-6 py-4 font-medium">{inv.partnerName}</td>
                    <td className="px-6 py-4">{'$' + inv.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getRiskBadgeClass(inv.risk)}>
                        {inv.risk}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onUpdateRisk(inv.id, 'Low Risk')}
                          className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded inline-flex items-center gap-1 transition-colors text-xs"
                          title="Approve as Low Risk"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => onUpdateRisk(inv.id, 'Moderate')}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded inline-flex items-center gap-1 transition-colors text-xs"
                          title="Flag as Moderate Risk"
                        >
                          <XCircle className="w-4 h-4" />
                          Flag
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
