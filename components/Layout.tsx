
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  username: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout, username }) => {
  const isAdmin = username === 'admin';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop Only */}
      <aside className="w-72 bg-slate-900 text-white hidden md:flex flex-col flex-shrink-0 shadow-2xl z-20">
        <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">💰</div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none uppercase">
              SmartWallet
            </h1>
            <p className="text-[10px] text-emerald-400 mt-1 uppercase tracking-[0.3em] font-black">AI Control</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="text-2xl">📊</span> 
            <span className="font-bold tracking-tight">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 ${activeTab === 'wallets' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="text-2xl">💳</span> 
            <span className="font-bold tracking-tight">Wallets</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 ${activeTab === 'transactions' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="text-2xl">💸</span> 
            <span className="font-bold tracking-tight">Transactions</span>
          </button>

          {/* Admin Tab */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('user-management')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 ${activeTab === 'user-management' ? 'bg-amber-600 shadow-lg shadow-amber-900/40 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="text-2xl">👥</span> 
              <span className="font-bold tracking-tight">Manage Users</span>
            </button>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800/50">
          <div className="mb-6 px-2">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Authenticated</p>
            <p className="text-sm font-bold text-white truncate">{username}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 p-4 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              title="Settings"
            >
              <span className="text-2xl">⚙️</span>
            </button>
            <button 
              onClick={onLogout}
              className="p-4 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-2xl transition-all"
              title="Logout"
            >
              <span className="text-2xl leading-none">➔</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pb-24 md:pb-0">
        {/* Mobile Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-30 px-5 py-4 flex justify-between items-center md:hidden safe-top">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-lg shadow-sm">💰</div>
             <div>
               <h1 className="text-lg font-black text-slate-900 leading-tight uppercase">SmartWallet</h1>
               <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">AI Financials</p>
             </div>
           </div>
           <div className="flex items-center gap-1">
             <button 
              onClick={() => setActiveTab('settings')} 
              className={`p-2.5 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}
             >
               <span className="text-xl">⚙️</span>
             </button>
             <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-rose-500">
               <span className="text-2xl">➔</span>
             </button>
           </div>
        </header>
        
        {/* Content Wrapper */}
        <div className="p-4 md:p-12 min-h-full max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Mobile Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center pt-3 pb-7 px-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'dashboard' ? 'bg-emerald-50' : ''}`}>
              <span className="text-2xl leading-none">📊</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">Stats</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('wallets')} 
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === 'wallets' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'wallets' ? 'bg-emerald-50' : ''}`}>
              <span className="text-2xl leading-none">💳</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">Wallets</span>
          </button>

          {isAdmin && (
             <button 
              onClick={() => setActiveTab('user-management')} 
              className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === 'user-management' ? 'text-amber-600' : 'text-slate-400'}`}
            >
              <div className={`p-2 rounded-xl ${activeTab === 'user-management' ? 'bg-amber-50' : ''}`}>
                <span className="text-2xl leading-none">👥</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-tight">Users</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('transactions')} 
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === 'transactions' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'transactions' ? 'bg-emerald-50' : ''}`}>
              <span className="text-2xl leading-none">💸</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">Trans</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default Layout;
