import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Wallet, 
  User, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  Store, 
  Coins, 
  HelpCircle,
  LogOut,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Mail,
  ShieldAlert,
  Check,
  AlertTriangle,
  History,
  Fingerprint,
  Search,
  ArrowRightLeft
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Invoice, Activity, WalletState, AuditTrailEntry } from './types';
import { INITIAL_INVOICES, INITIAL_ACTIVITIES, INITIAL_AUDIT_TRAIL } from './data';
import LandingPage from './components/LandingPage';
import WalletAuth from './components/WalletAuth';
import Dashboard from './components/Dashboard';
import Marketplace from './components/Marketplace';
import Analytics from './components/Analytics';
import Admin from './components/Admin';
import ErrorBoundary from './components/ErrorBoundary';
import { useToast } from './components/Toast';
import { STELLAR_DEMO_KEYS, formatStellarAddress, isAdminStellarAddress } from './utils/stellar';

const generateSimTxHash = () => {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
};

export default function App() {
  const { showToast } = useToast();
  // Authenticated fetch wrapper
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('creditbridge_jwt');
    const headers = { ...options.headers } as Record<string, string>;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  // Navigation active view state
  const [view, setView] = useState<'landing' | 'dashboard' | 'marketplace' | 'analytics' | 'admin' | 'connect'>('landing');
  
  // Wallet state
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    provider: null,
    connected: false
  });

  // Global theme state: 'light' or 'midnight'
  const [theme, setTheme] = useState<'light' | 'midnight'>('light');

  // Global state for invoices and activities
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Settings & Risk Alerts States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [riskAlertsEnabled, setRiskAlertsEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('anichrisa@gmail.com');
  const [isEmailAlertOpen, setIsEmailAlertOpen] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('All');
  const [lastAlertEmail, setLastAlertEmail] = useState<{
    invoiceId: string;
    partnerName: string;
    oldRisk: string;
    newRisk: string;
    industry: string;
    amount: number;
    recipient: string;
  } | null>(null);

  const [selectedSimInvoiceId, setSelectedSimInvoiceId] = useState('');
  const [selectedSimRisk, setSelectedSimRisk] = useState<'Low Risk' | 'Stable' | 'Moderate'>('Moderate');

  useEffect(() => {
    if (invoices.length > 0 && !selectedSimInvoiceId) {
      setSelectedSimInvoiceId(invoices[0].id);
    }
  }, [invoices, selectedSimInvoiceId]);

  // WebSockets Live Updates
  useEffect(() => {
    const socket = io();
    socket.on('invoice_updated', () => {
      console.log("Live update received from server, refreshing data...");
      fetchAllData();
    });
    return () => { socket.disconnect(); };
  }, []);

  // Load database tables reactively
  const fetchAllData = async () => {
    try {
      const invoicesRes = await apiFetch("/api/invoices");
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data);
      }

      const activitiesRes = await apiFetch("/api/activities");
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data);
      }

      const auditRes = await apiFetch("/api/audit-trail");
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditTrail(data);
      }
    } catch (err) {
      console.error("Error fetching board data from API", err);
    }
  };

  const fetchUserSettings = async (walletAddress: string) => {
    try {
      const userRes = await apiFetch(`/api/user/${walletAddress}`);
      if (userRes.ok) {
        const settings = await userRes.json();
        setTheme(settings.theme || 'light');
        setRiskAlertsEnabled(!!settings.risk_alerts_enabled);
        setNotificationEmail(settings.notification_email || 'anichrisa@gmail.com');
        
        if (settings.theme === 'midnight') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (err) {
      console.error("Error fetching user settings from API", err);
    }
  };

  // Initialize data from SQLite backend or fallback seed
  useEffect(() => {
    const savedWallet = localStorage.getItem('cb_wallet');
    const token = localStorage.getItem('creditbridge_jwt');
    if (savedWallet && !token) {
      localStorage.removeItem('cb_wallet');
      return;
    }
    const savedTheme = localStorage.getItem('cb_theme') as 'light' | 'midnight' || 'light';

    setTheme(savedTheme);
    if (savedTheme === 'midnight') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (savedWallet) {
      const parsedWallet = JSON.parse(savedWallet);
      setWallet(parsedWallet);
      if (parsedWallet.connected && parsedWallet.address) {
        setView('dashboard');
        fetchUserSettings(parsedWallet.address);
      }
    }

    fetchAllData();
  }, []);

  const saveWalletState = (newWallet: WalletState) => {
    setWallet(newWallet);
    localStorage.setItem('cb_wallet', JSON.stringify(newWallet));
    if (newWallet.connected && newWallet.address) {
      fetchUserSettings(newWallet.address);
    }
  };

  const saveRiskAlertsEnabled = async (enabled: boolean) => {
    setRiskAlertsEnabled(enabled);
    if (wallet.connected && wallet.address) {
      try {
        await apiFetch(`/api/user/${wallet.address}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: theme,
            riskAlertsEnabled: enabled,
            notificationEmail: notificationEmail
          })
        });
      } catch (err) {
        console.error("Error saving risk alerts config to backend", err);
      }
    }
  };

  const saveNotificationEmail = async (email: string) => {
    setNotificationEmail(email);
    if (wallet.connected && wallet.address) {
      try {
        await apiFetch(`/api/user/${wallet.address}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: theme,
            riskAlertsEnabled: riskAlertsEnabled,
            notificationEmail: email
          })
        });
      } catch (err) {
        console.error("Error saving email alert config to backend", err);
      }
    }
  };

  const handleUpdateInvoiceRisk = async (invoiceId: string, newRisk: 'Low Risk' | 'Stable' | 'Moderate') => {
    const targetInv = invoices.find(inv => inv.id === invoiceId);
    if (!targetInv) return;

    const oldRisk = targetInv.risk;
    if (oldRisk === newRisk) {
      showToast(`Invoice #${invoiceId} is already rated ${newRisk}.`, 'info');
      return;
    }

    try {
      const response = await apiFetch(`/api/invoices/${invoiceId}/risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRisk,
          oldRisk,
          operatorWallet: wallet.address || 'System Oracle'
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update risk on backend.");
      }

      await fetchAllData();

      if (riskAlertsEnabled) {
        setLastAlertEmail({
          invoiceId,
          partnerName: targetInv.partnerName,
          oldRisk,
          newRisk,
          industry: targetInv.industry,
          amount: targetInv.amount,
          recipient: notificationEmail
        });
        setIsEmailAlertOpen(true);
        showToast(`Email Risk Alert dispatched automatically to ${notificationEmail}!`, 'success');
      } else {
        showToast(`Risk score updated: #${invoiceId} is now ${newRisk}. (Alerts are muted)`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update invoice risk rating.", "error");
    }
  };

  const handleSubmitInvoice = async (
    partnerName: string, 
    amount: number, 
    dueDate: string, 
    industry: 'Logistics' | 'Technology' | 'Healthcare' | 'Energy' | 'Retail'
  ) => {
    const randId = `CB-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice: Invoice = {
      id: randId,
      partnerName,
      industry,
      amount,
      annualReturn: parseFloat((10 + Math.random() * 5).toFixed(1)), // random APR between 10% and 15%
      dueDate,
      fundingProgress: 0,
      targetAmount: amount,
      daysRemaining: Math.floor(15 + Math.random() * 30), // random days left
      status: 'Pending',
      risk: Math.random() > 0.5 ? 'Low Risk' : 'Stable',
      creatorWallet: wallet.address || STELLAR_DEMO_KEYS.MAIN_USER
    };

    try {
      const response = await apiFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvoice)
      });

      if (!response.ok) {
        throw new Error("Failed to save invoice on backend.");
      }

      await fetchAllData();
      showToast(`Invoice #${randId} submitted successfully for review!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to submit invoice.", "error");
    }
  };

  const handleRepayInvoice = async (invoiceId: string) => {
    try {
      const response = await apiFetch(`/api/invoices/${invoiceId}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorWallet: wallet.address || 'GA5W32...RK6M'
        })
      });

      if (!response.ok) {
        throw new Error("Failed to repay invoice on backend.");
      }

      await fetchAllData();
      showToast(`Repayment of invoice #${invoiceId} settled successfully!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to settle repayment.", "error");
    }
  };

  const handleInvestInInvoice = async (invoiceId: string, investAmount: number) => {
    try {
      const response = await apiFetch(`/api/invoices/${invoiceId}/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investAmount,
          operatorWallet: wallet.address || 'GA5W32...RK6M'
        })
      });

      if (!response.ok) {
        throw new Error("Failed to allocate investment on backend.");
      }

      await fetchAllData();
      showToast(`Allocation of $${investAmount.toLocaleString()} to invoice #${invoiceId} successful!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to invest in invoice.", "error");
    }
  };

  const handleDisconnect = () => {
    saveWalletState({
      address: null,
      provider: null,
      connected: false
    });
    setView('landing');
    setMobileMenuOpen(false);
    showToast("Wallet disconnected.", "info");
  };

  const truncateAddress = (addr: string | null) => {
    if (!addr) return '';
    return formatStellarAddress(addr, 4, 4);
  };

  const handleNavClick = (targetView: typeof view) => {
    if (targetView === 'dashboard' && !wallet.connected) {
      setView('connect');
    } else {
      setView(targetView);
    }
    setMobileMenuOpen(false);
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'midnight' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('cb_theme', nextTheme);
    if (nextTheme === 'midnight') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    if (wallet.connected && wallet.address) {
      try {
        await apiFetch(`/api/user/${wallet.address}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: nextTheme,
            riskAlertsEnabled: riskAlertsEnabled,
            notificationEmail: notificationEmail
          })
        });
      } catch (err) {
        console.error("Error saving theme to backend", err);
      }
    }
    showToast(`Switched to ${nextTheme === 'midnight' ? 'Midnight Dark' : 'Classic Light'} theme.`, 'success');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative pb-16 md:pb-0">
      
      {/* Global Header */}
      <header className="bg-background sticky top-0 left-0 right-0 z-50 border-b border-black/10 flex justify-between items-center px-6 md:px-10 h-16">
        <div className="flex items-center gap-6">
          <button 
            id="header-logo"
            onClick={() => handleNavClick('landing')}
            className="font-display font-bold italic text-2xl text-black tracking-tight cursor-pointer focus:outline-none"
          >
            CreditBridge
          </button>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 ml-6 h-full">
            <button 
              id="nav-dashboard-desktop"
              onClick={() => handleNavClick('dashboard')}
              className={`font-mono text-[10px] uppercase tracking-widest font-bold py-5 transition-colors cursor-pointer border-b-2 h-full flex items-center ${
                view === 'dashboard'
                  ? 'text-black border-black'
                  : 'text-zinc-400 hover:text-black border-transparent'
              }`}
            >
              Dashboard
            </button>
            <button 
              id="nav-marketplace-desktop"
              onClick={() => handleNavClick('marketplace')}
              className={`font-mono text-[10px] uppercase tracking-widest font-bold py-5 transition-colors cursor-pointer border-b-2 h-full flex items-center ${
                view === 'marketplace'
                  ? 'text-black border-black'
                  : 'text-zinc-400 hover:text-black border-transparent'
              }`}
            >
              Marketplace
            </button>
            {Boolean(wallet.connected && (wallet.role === 'admin' || (wallet.address && isAdminStellarAddress(wallet.address)))) && (
              <button 
                id="nav-admin-desktop"
                onClick={() => handleNavClick('admin')}
                className={`font-mono text-[10px] uppercase tracking-widest font-bold py-5 transition-colors cursor-pointer border-b-2 h-full flex items-center gap-1.5 ${
                  view === 'admin'
                    ? 'text-red-600 border-red-600'
                    : 'text-red-500 hover:text-red-700 border-transparent'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        {/* Global actions and connection state */}
        <div className="flex items-center gap-4">
          
          {/* Global Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 text-zinc-500 hover:text-black hover:bg-black/5 rounded-none transition-all cursor-pointer flex items-center justify-center border border-black/10 bg-white"
            title={theme === 'light' ? 'Switch to Midnight Dark' : 'Switch to Classic Light'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-black" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-500" />
            )}
          </button>

          {/* Wallet connection status indicator */}
          {wallet.connected ? (
            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-none border border-black/10 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              <span className="text-[10px] font-bold font-mono text-black uppercase tracking-wider">
                {truncateAddress(wallet.address)}
              </span>
            </div>
          ) : (
            <button 
              id="header-connect-wallet"
              onClick={() => setView('connect')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-black text-white font-mono uppercase tracking-widest text-[9px] font-bold rounded-none hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </button>
          )}

          {/* User profile avatar or mock actions */}
          {wallet.connected ? (
            <div className="flex items-center gap-2">
              <button 
                id="header-notifications"
                onClick={() => showToast("All Stellar smart escrow notifications up-to-date.", "info")}
                className="p-2 text-zinc-500 hover:bg-black/5 rounded-none transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-black rounded-full" />
              </button>
              
              <div 
                onClick={() => showToast(`Active Stellar account: ${wallet.address}`, "info")}
                className="w-8 h-8 rounded-none border border-black/10 overflow-hidden cursor-pointer hover:border-black transition-all shrink-0"
              >
                <img 
                  className="w-full h-full object-cover" 
                  alt="Corporate User Profile Avatar" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7JIqoLswKDmnPwwBNi_NkZz8bAEneQV_ZFGPMfz2JME4i8kBxnEMpQRlM3hQV4FgWJ05kBc7rMJ2zpl-CM2qFoe-XjM7CeKPEzfI-0JDLfCzs-H6F-1v5RSNVkQzkib8BQvTx69CEtXLvMGy2Pj6_KEdZvFeL6Z6sGKbg4mD8SseMX4cl6kP6lNKtg1LvVWMZ75OWQY46sgzj_lsLOqCoq5o3mf9iyMga5y3IBXCU2q_Z8TN8jyK73A"
                />
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-none bg-white border border-black/10 flex items-center justify-center text-black shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}

          {/* Mobile Menu trigger */}
          <button 
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-black hover:bg-black/5 rounded-none transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-background border-b border-black/10 shadow-md z-40 flex flex-col p-4 gap-2">
          <button 
            onClick={() => handleNavClick('landing')}
            className={`w-full text-left px-4 py-3 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold ${view === 'landing' ? 'bg-black text-white' : 'text-zinc-600 hover:bg-black/5'}`}
          >
            Home
          </button>
          <button 
            onClick={() => handleNavClick('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold ${view === 'dashboard' ? 'bg-black text-white' : 'text-zinc-600 hover:bg-black/5'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => handleNavClick('marketplace')}
            className={`w-full text-left px-4 py-3 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold ${view === 'marketplace' ? 'bg-black text-white' : 'text-zinc-600 hover:bg-black/5'}`}
          >
            Marketplace
          </button>
          {Boolean(wallet.connected && (wallet.role === 'admin' || (wallet.address && isAdminStellarAddress(wallet.address)))) && (
            <button 
              onClick={() => handleNavClick('admin')}
              className={`w-full text-left px-4 py-3 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold ${view === 'admin' ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50'}`}
            >
              Protocol Admin
            </button>
          )}
          {wallet.connected ? (
            <>
              <button 
                id="mobile-nav-settings"
                onClick={() => {
                  setIsSettingsOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold text-zinc-600 hover:bg-black/5"
              >
                Settings
              </button>
              <button 
                onClick={handleDisconnect}
                className="w-full text-left px-4 py-3 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold text-red-600 hover:bg-red-50"
              >
                Disconnect Wallet
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleNavClick('connect')}
              className="w-full text-left px-4 py-3 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold text-black hover:bg-black/5"
            >
              Connect Wallet
            </button>
          )}
        </div>
      )}

      {/* Main Content Layout container */}
      <div className="flex flex-1 w-full">
        
        {/* Desktop Sidebar Navigation for Dashboard, Marketplace or Admin views */}
        {wallet.connected && (view === 'dashboard' || view === 'marketplace' || view === 'admin') && (
          <aside className="hidden md:flex flex-col w-64 bg-background border-r border-black/10 p-5 shrink-0 sticky top-16 h-[calc(100vh-64px)] text-left">
            <nav className="flex-1 space-y-1">
              <button 
                id="sidebar-dashboard-btn"
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center gap-3 p-3.5 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  view === 'dashboard'
                    ? 'bg-black text-white'
                    : 'text-zinc-500 hover:bg-black/5 hover:text-black'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </button>
              
              <button 
                id="sidebar-marketplace-btn"
                onClick={() => handleNavClick('marketplace')}
                className={`w-full flex items-center gap-3 p-3.5 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  view === 'marketplace'
                    ? 'bg-black text-white'
                    : 'text-zinc-500 hover:bg-black/5 hover:text-black'
                }`}
              >
                <Store className="w-4 h-4 shrink-0" />
                <span>Marketplace</span>
              </button>
              
              <button 
                onClick={() => showToast("Tokenized invoices security vaults on Stellar Core are 100% synchronized.", "info")}
                className="w-full flex items-center gap-3 p-3.5 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold transition-all text-zinc-500 hover:bg-black/5 hover:text-black cursor-pointer"
              >
                <Coins className="w-4 h-4 shrink-0" />
                <span>Token Yields</span>
              </button>

              {Boolean(wallet.role === 'admin' || (wallet.address && isAdminStellarAddress(wallet.address))) && (
                <button 
                  id="sidebar-admin-btn"
                  onClick={() => handleNavClick('admin')}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    view === 'admin'
                      ? 'bg-red-600 text-white'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Protocol Admin</span>
                </button>
              )}
            </nav>

            <div className="pt-4 border-t border-black/10 space-y-1">
              <button 
                id="sidebar-settings-btn"
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center gap-3 p-3.5 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold transition-all text-zinc-500 hover:bg-black/5 hover:text-black cursor-pointer"
              >
                <SettingsIcon className="w-4 h-4 shrink-0" />
                <span>Settings</span>
              </button>
              
              <button 
                id="sidebar-disconnect-btn"
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 p-3.5 rounded-none font-mono text-[10px] uppercase tracking-wider font-bold transition-all text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Disconnect</span>
              </button>
            </div>
          </aside>
        )}

        {/* Content view coordinator */}
        <main className="flex-1 w-full flex flex-col items-center">
          {view === 'landing' ? (
            <LandingPage wallet={wallet} setView={handleNavClick} />
          ) : view === 'connect' ? (
            <WalletAuth wallet={wallet} setWallet={setWallet} setView={setView} />
          ) : view === 'dashboard' ? (
            <div className="p-6 md:p-10 w-full max-w-7xl">
              <ErrorBoundary>
                <Dashboard 
                  invoices={invoices} 
                  activities={activities}
                  onSubmitInvoice={handleSubmitInvoice}
                  onRepayInvoice={handleRepayInvoice}
                  onUpdateRisk={handleUpdateInvoiceRisk}
                  setView={handleNavClick}
                  wallet={wallet}
                  theme={theme}
                />
              </ErrorBoundary>
            </div>
          ) : view === 'analytics' ? (
            <div className="p-6 md:p-10 w-full max-w-7xl">
              <ErrorBoundary>
                <Analytics invoices={invoices} wallet={wallet} />
              </ErrorBoundary>
            </div>
          ) : view === 'admin' ? (
            <div className="p-6 md:p-10 w-full max-w-7xl">
              <ErrorBoundary>
                <Admin invoices={invoices} wallet={wallet} onUpdateRisk={handleUpdateInvoiceRisk} />
              </ErrorBoundary>
            </div>
          ) : view === 'marketplace' ? (
            <div className="p-6 md:p-10 w-full max-w-7xl">
              <ErrorBoundary>
                <Marketplace 
                  invoices={invoices} 
                  onInvest={handleInvestInInvoice}
                  wallet={wallet}
                  setView={handleNavClick}
                />
              </ErrorBoundary>
            </div>
          ) : null}
        </main>

      </div>

      {/* Global Bottom Navigation Bar (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-black/10 flex justify-around items-center px-4 py-2 h-16">
        <button 
          onClick={() => handleNavClick('landing')}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            view === 'landing' ? 'text-black' : 'text-zinc-400'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider mt-1">Home</span>
        </button>

        <button 
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            view === 'dashboard' ? 'text-black' : 'text-zinc-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider mt-1">Dashboard</span>
        </button>

        <button 
          onClick={() => handleNavClick('marketplace')}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            view === 'marketplace' ? 'text-black' : 'text-zinc-400'
          }`}
        >
          <Store className="w-4 h-4" />
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider mt-1">Market</span>
        </button>

        <button 
          onClick={() => handleNavClick(wallet.connected ? 'dashboard' : 'connect')}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            view === 'connect' ? 'text-black' : 'text-zinc-400'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider mt-1">Wallet</span>
        </button>
      </nav>

      {/* Settings Modal Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex justify-center items-center p-4"
            id="settings-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#fcfbfa] dark:bg-zinc-950 border border-black/20 dark:border-white/10 w-full max-w-xl flex flex-col rounded-none shadow-2xl relative max-h-[90vh] overflow-hidden"
              id="settings-modal-content"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
                <div className="text-left">
                  <h3 className="font-display font-bold italic text-lg text-black dark:text-white uppercase tracking-wider">System Settings</h3>
                  <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase">Configure CreditBridge Watchdogs & Notifications</p>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  id="settings-close-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-6 overflow-y-auto text-left flex-1">
                
                {/* Risk Alerts Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
                    <ShieldAlert className="w-4 h-4 text-black dark:text-white" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-black dark:text-white">Risk Alert Mechanism</span>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 pr-2">
                        <label className="text-xs font-bold text-black dark:text-white font-sans">Automatic Risk Alerts</label>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal max-w-sm">
                          Send automatic notification emails when an invoice's institutional risk rating shifts.
                        </p>
                      </div>
                      
                      {/* Custom Toggle switch */}
                      <button 
                        id="risk-alerts-toggle"
                        onClick={() => {
                          const nextVal = !riskAlertsEnabled;
                          saveRiskAlertsEnabled(nextVal);
                          showToast(nextVal ? "Automatic Risk Alerts activated." : "Risk Alerts muted.", "success");
                        }}
                        className={`w-12 h-6 flex items-center p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                          riskAlertsEnabled ? 'bg-black dark:bg-white justify-end' : 'bg-zinc-200 dark:bg-zinc-800 justify-start'
                        }`}
                      >
                        <span className={`w-4 h-4 shadow-sm transition-transform duration-200 ease-in-out ${
                          riskAlertsEnabled ? 'bg-[#fcfbfa] dark:bg-black' : 'bg-zinc-500'
                        }`} />
                      </button>
                    </div>

                    {riskAlertsEnabled && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2 pt-2 border-t border-dashed border-black/5 dark:border-white/5"
                      >
                        <label className="block text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Notification Email Address
                        </label>
                        <div className="flex gap-2">
                          <input 
                            id="risk-alerts-email-input"
                            type="email" 
                            value={notificationEmail}
                            onChange={(e) => saveNotificationEmail(e.target.value)}
                            placeholder="e.g. user@example.com"
                            className="flex-1 h-9 px-3 border border-black/10 dark:border-white/10 bg-[#f5f3f0] dark:bg-zinc-800 text-xs text-black dark:text-white font-mono rounded-none outline-none focus:border-black dark:focus:border-white"
                          />
                          <div className="h-9 w-9 border border-black/10 dark:border-white/10 flex items-center justify-center bg-white dark:bg-zinc-900 shrink-0">
                            <Mail className="w-4 h-4 text-zinc-400" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Ledger Risk State Mutation Simulator */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
                    <AlertTriangle className="w-4 h-4 text-black dark:text-white" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-black dark:text-white">Ledger Test Environment</span>
                  </div>

                  <div className="bg-[#f5f3f0] dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-4 space-y-4">
                    <p className="text-[10px] text-zinc-500 leading-normal font-mono">
                      TEST TOOL: Manually mutate the risk level of an invoice on our platform to trigger an automatic risk alert simulation.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Select Invoice */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Active Invoice</label>
                        <select 
                          id="sim-invoice-select"
                          value={selectedSimInvoiceId}
                          onChange={(e) => setSelectedSimInvoiceId(e.target.value)}
                          className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-semibold text-black dark:text-white rounded-none cursor-pointer outline-none"
                        >
                          {invoices.length === 0 ? (
                            <option value="">No Invoices Available</option>
                          ) : (
                            invoices.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.id} ({inv.partnerName.substring(0, 15)}) [{inv.risk}]
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Select Target Risk */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Target Risk Rating</label>
                        <select 
                          id="sim-risk-select"
                          value={selectedSimRisk}
                          onChange={(e) => setSelectedSimRisk(e.target.value as any)}
                          className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-semibold text-black dark:text-white rounded-none cursor-pointer outline-none"
                        >
                          <option value="Low Risk">Low Risk</option>
                          <option value="Stable">Stable</option>
                          <option value="Moderate">Moderate</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      id="sim-mutate-risk-btn"
                      onClick={() => {
                        if (!selectedSimInvoiceId) {
                          showToast("Please select an active invoice to mutate.", "error");
                          return;
                        }
                        handleUpdateInvoiceRisk(selectedSimInvoiceId, selectedSimRisk);
                      }}
                      className="w-full h-10 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-mono text-[10px] uppercase font-bold tracking-widest cursor-pointer transition-colors"
                    >
                      Trigger Risk Mutation
                    </button>
                  </div>
                </div>

                {/* Cryptographic Audit Trail Section */}
                <div className="space-y-4 pt-2" id="settings-audit-trail-section">
                  <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-black dark:text-white" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-black dark:text-white">On-Chain Audit Trail</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 uppercase tracking-wider rounded-none">
                      Secured
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-normal font-mono">
                    Cryptographically simulated logs tracking the asset lifecycle across the credit facility trustlines.
                  </p>

                  <div className="space-y-3">
                    {/* Controls Row: Search and Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-8 relative">
                        <input
                          type="text"
                          id="audit-search-input"
                          placeholder="Search logs (e.g. CB-9021, Logistics, hash)..."
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          className="w-full h-8 pl-8 pr-3 border border-black/10 dark:border-white/10 bg-[#f5f3f0] dark:bg-zinc-800 text-[10px] text-black dark:text-white font-mono rounded-none outline-none focus:border-black dark:focus:border-white"
                        />
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                      
                      <div className="sm:col-span-4 flex gap-1.5">
                        <button
                          type="button"
                          id="audit-reset-btn"
                          onClick={async () => {
                            try {
                              const response = await apiFetch("/api/audit-trail/restore", { method: 'POST' });
                              if (!response.ok) throw new Error();
                              await fetchAllData();
                              showToast("Audit trail restored to default ledger seeds.", "info");
                            } catch (err) {
                              console.error(err);
                              showToast("Failed to restore audit trail.", "error");
                            }
                          }}
                          className="flex-1 h-8 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-black/10 dark:border-white/10 text-[9px] font-mono uppercase font-bold text-black dark:text-white transition-colors cursor-pointer"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          id="audit-clear-btn"
                          onClick={async () => {
                            try {
                              const response = await apiFetch("/api/audit-trail/clear", { method: 'POST' });
                              if (!response.ok) throw new Error();
                              await fetchAllData();
                              showToast("Audit trail logs wiped.", "warning");
                            } catch (err) {
                              console.error(err);
                              showToast("Failed to clear audit trail.", "error");
                            }
                          }}
                          className="flex-1 h-8 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-black/10 dark:border-white/10 text-[9px] font-mono uppercase font-bold text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Filter chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {['All', 'Tokenization', 'Risk Mutation', 'Asset Funding', 'Settlement'].map((t) => (
                        <button
                          key={t}
                          id={`audit-filter-${t.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => setAuditTypeFilter(t)}
                          className={`px-2 py-0.5 text-[8px] font-mono uppercase font-bold border transition-all cursor-pointer ${
                            auditTypeFilter === t
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                              : 'bg-white text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Audit Logs List Container */}
                    <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5 max-h-56 overflow-y-auto" id="settings-audit-logs-list">
                      {(() => {
                        const filtered = auditTrail.filter(entry => {
                          const matchesSearch = 
                            entry.eventId.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                            entry.eventName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                            entry.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                            (entry.txHash && entry.txHash.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
                            entry.actionType.toLowerCase().includes(auditSearchQuery.toLowerCase());
                          
                          const matchesType = auditTypeFilter === 'All' || entry.actionType === auditTypeFilter;
                          return matchesSearch && matchesType;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-8 text-center text-[10px] font-mono text-zinc-400 uppercase">
                              No matching audit trail logs recorded on this ledger.
                            </div>
                          );
                        }

                        return filtered.map((entry) => {
                          // Badge styling
                          let badgeBg = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
                          if (entry.actionType === 'Tokenization') badgeBg = "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/20";
                          if (entry.actionType === 'Risk Mutation') badgeBg = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/20";
                          if (entry.actionType === 'Asset Funding') badgeBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/20";
                          if (entry.actionType === 'Settlement') badgeBg = "bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900";

                          return (
                            <div key={entry.id} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 ${badgeBg}`}>
                                    {entry.actionType}
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-black dark:text-white">
                                    #{entry.eventId}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-sans truncate max-w-[120px]">
                                    {entry.eventName}
                                  </span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500">
                                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({new Date(entry.timestamp).toLocaleDateString()})
                                </span>
                              </div>

                              <p className="text-[10px] text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed">
                                {entry.details}
                              </p>

                              <div className="pt-1.5 border-t border-dashed border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-y-1 text-[8px] font-mono text-zinc-400 dark:text-zinc-500">
                                <div className="flex items-center gap-1">
                                  <Fingerprint className="w-2.5 h-2.5 shrink-0" />
                                  <span>TX:</span>
                                  {entry.txHash ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(entry.txHash || '');
                                        showToast("Transaction hash copied!", "success");
                                      }}
                                      className="hover:text-black dark:hover:text-white underline cursor-pointer truncate max-w-[100px] sm:max-w-none text-left"
                                      title="Click to copy full transaction hash"
                                    >
                                      {entry.txHash.substring(0, 10)}...{entry.txHash.substring(54)}
                                    </button>
                                  ) : (
                                    <span>N/A</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span>OP:</span>
                                  <span className="text-zinc-600 dark:text-zinc-400">{entry.operatorWallet.length > 10 ? `${entry.operatorWallet.substring(0, 6)}...${entry.operatorWallet.substring(entry.operatorWallet.length - 4)}` : entry.operatorWallet}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-black/10 dark:border-white/10 flex justify-end gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 border border-black/10 dark:border-white/10 text-[10px] font-mono font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-all rounded-none cursor-pointer text-black dark:text-white"
                  id="settings-done-btn"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Alert Simulator Overlay */}
      <AnimatePresence>
        {isEmailAlertOpen && lastAlertEmail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex justify-center items-center p-4 overflow-y-auto"
            id="email-alert-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#fcfbfa] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl flex flex-col rounded-none shadow-2xl relative overflow-hidden"
              id="email-alert-modal-content"
            >
              {/* Inbox Client Header Bar */}
              <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 block" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider ml-2 font-bold">SMTP Mail Client - Simulated Inbox</span>
                </div>
                <button 
                  onClick={() => setIsEmailAlertOpen(false)}
                  className="p-1 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                  id="email-alert-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Email Envelope Metadata */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-left space-y-1.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                <div>
                  <span className="font-bold text-zinc-400 uppercase tracking-wider inline-block w-16">From:</span>
                  <span className="text-zinc-950 dark:text-zinc-200">watchdog-smtp-relay@creditbridge.stellar.org</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 uppercase tracking-wider inline-block w-16">To:</span>
                  <span className="text-zinc-950 dark:text-zinc-200 font-bold underline">{lastAlertEmail.recipient}</span>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-zinc-400 uppercase tracking-wider inline-block w-16">Subject:</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">
                      ⚠️ [CreditBridge Alert] Critical Risk Profile Downgrade for #{lastAlertEmail.invoiceId}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0 uppercase tracking-wider font-bold">Just now</span>
                </div>
              </div>

              {/* HTML Email Body Container */}
              <div className="p-4 sm:p-8 bg-zinc-100 dark:bg-zinc-900 flex justify-center text-left overflow-y-auto max-h-[50vh]">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 w-full max-w-lg shadow-sm space-y-6">
                  
                  {/* Branding Header */}
                  <div className="border-b-4 border-black dark:border-white pb-4 flex justify-between items-center">
                    <div>
                      <span className="font-display font-bold italic text-xl tracking-tight text-black dark:text-white">CreditBridge</span>
                      <span className="block text-[8px] font-mono text-zinc-400 uppercase tracking-widest">Autonomous Ledger Watchdog</span>
                    </div>
                    <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-mono uppercase tracking-widest px-2 py-0.5 font-bold">
                      Alert Level: High
                    </span>
                  </div>

                  {/* Core Alert Banner */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-black dark:text-white uppercase tracking-wider">
                      🚨 RECEIVABLE RISK PROFILE CHANGED SIGNIFICANTLY
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                      Our automated on-chain risk score evaluation oracles have updated the risk rating coefficients for Invoice Receivable <span className="font-mono font-bold text-black dark:text-white">#{lastAlertEmail.invoiceId}</span>. This change has triggered automatic system alerting protocols.
                    </p>
                  </div>

                  {/* Change Specification Table */}
                  <div className="border border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-[11px]">
                    <div className="grid grid-cols-2 p-3 bg-zinc-50 dark:bg-zinc-900/50">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider">Invoice ID:</span>
                      <span className="text-black dark:text-white font-bold text-right">#{lastAlertEmail.invoiceId}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider">Partner Debtor:</span>
                      <span className="text-black dark:text-white font-bold text-right truncate">{lastAlertEmail.partnerName}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 bg-zinc-50 dark:bg-zinc-900/50">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider">Industry Sector:</span>
                      <span className="text-black dark:text-white font-bold text-right">{lastAlertEmail.industry}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider">Asset Value:</span>
                      <span className="text-black dark:text-white font-bold text-right">${lastAlertEmail.amount.toLocaleString()} USD</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 bg-red-50/50 dark:bg-red-950/10 items-center">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider">Risk Shift Event:</span>
                      <div className="flex items-center justify-end gap-2 text-right">
                        <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[9px]">
                          {lastAlertEmail.oldRisk}
                        </span>
                        <span className="text-zinc-400">➡️</span>
                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-bold uppercase text-[9px] animate-pulse">
                          {lastAlertEmail.newRisk}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Impact Analysis Warning */}
                  <div className="bg-yellow-50 dark:bg-yellow-950/10 border-l-2 border-yellow-500 p-3.5 space-y-1">
                    <span className="block text-[9px] font-mono font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-widest">
                      Risk Rating Implication
                    </span>
                    <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-sans leading-normal">
                      A shift in rating indicates a fundamental variance inside the partner debtor's liquidity cycles. It can impact pool APR values, secondary market collateralization escrows, or Stellar escrow smart-contract parameters. Please inspect your position or allocation.
                    </p>
                  </div>

                  {/* Email Action */}
                  <div className="pt-2 text-center">
                    <button 
                      id="email-view-marketplace-btn"
                      onClick={() => {
                        setIsEmailAlertOpen(false);
                        setView('marketplace');
                      }}
                      className="inline-block px-6 py-3 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Inspect Marketplace Ledger
                    </button>
                  </div>

                  {/* Email Footer */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 text-[9px] text-zinc-400 dark:text-zinc-500 leading-normal space-y-1.5">
                    <p>
                      This is an automatic notification generated by CreditBridge Ledger Watchdog. You are receiving this because you subscribed to automatic Risk Alerts for your verified email <span className="font-bold underline">{lastAlertEmail.recipient}</span>.
                    </p>
                    <p className="text-center italic">
                      CreditBridge Protocol • Secure Invoice Tokenization • Stellar Core Node Network
                    </p>
                  </div>

                </div>
              </div>

              {/* Inbox client bottom status bar */}
              <div className="bg-zinc-100 dark:bg-zinc-900 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                <button 
                  onClick={() => setIsEmailAlertOpen(false)}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-mono font-bold uppercase transition-colors rounded-none cursor-pointer"
                  id="email-alert-dismiss-btn"
                >
                  Close Email Client
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
