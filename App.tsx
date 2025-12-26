
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wallet, Transaction, Category, WalletType, TransactionType, User } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import Layout from './components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getFinancialAdvice } from './services/geminiService';
import { listenToData, authenticateUser, saveData, updateWalletBalance, db } from './services/firebaseService';
import { doc, setDoc, deleteDoc, updateDoc, writeBatch, getDocs, collection, query, where, getDoc } from 'firebase/firestore';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 Menit dalam Milidetik

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInput, setAuthInput] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // Admin States
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newUserForm, setNewUserForm] = useState({ username: '', fullName: '', password: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  
  const [newTransaction, setNewTransaction] = useState({
    walletId: '', categoryId: '', amount: 0, type: TransactionType.EXPENSE, note: '', date: new Date().toISOString().split('T')[0]
  });

  const [newWallet, setNewWallet] = useState({
    name: '', type: WalletType.CASH, balance: 0, color: '#10b981'
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', username: '', email: '', phone: '', bio: '' });
  const [newCatForm, setNewCatForm] = useState({ name: '', icon: '📦', color: '#64748b' });

  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('sw_user_session');
    setCurrentUser(null);
    setAuthInput({ username: '', password: '' });
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('sw_user_session');
    if (savedSession) {
      try {
        setCurrentUser(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem('sw_user_session');
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let idleTimer: any;
    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        alert("Sesi Anda berakhir karena tidak ada aktivitas selama 30 menit.");
        handleLogout();
      }, IDLE_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [currentUser, handleLogout]);

  // Admin: Fetch all users
  useEffect(() => {
    if (currentUser?.username === 'admin' && activeTab === 'user-management') {
      const fetchUsers = async () => {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users = querySnapshot.docs.map(doc => doc.data() as User);
        setAllUsers(users);
      };
      fetchUsers();
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubWallets = listenToData(currentUser.username, "wallets", setWallets);
    const unsubTrans = listenToData(currentUser.username, "transactions", setTransactions);
    const unsubCats = listenToData(currentUser.username, "categories", (data) => {
      if (data.length > 0) {
        setCategories(data as Category[]);
      } else {
        DEFAULT_CATEGORIES.forEach(cat => saveData(currentUser.username, "categories", cat));
      }
    });

    setProfileForm({
      fullName: currentUser.fullName || '',
      username: currentUser.username || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      bio: currentUser.bio || ''
    });

    return () => {
      unsubWallets();
      unsubTrans();
      unsubCats();
    };
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let userData: User | null = null;

    if (authInput.username === 'admin' && authInput.password === 'admin123') {
      userData = { 
        username: 'admin', 
        password: 'admin123', 
        fullName: 'System Admin', 
        joinedDate: new Date().toISOString() 
      };
      await setDoc(doc(db, "users", "admin"), userData);
    } else {
      userData = await authenticateUser(authInput.username, authInput.password);
    }

    if (userData) {
      setCurrentUser(userData);
      localStorage.setItem('sw_user_session', JSON.stringify(userData));
    } else {
      alert('Kredensial salah!');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.fullName || !newUserForm.password) {
      alert("Lengkapi semua data user baru!");
      return;
    }

    try {
      const userRef = doc(db, "users", newUserForm.username.toLowerCase());
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        alert("Username sudah digunakan!");
        return;
      }

      const newUser: User = {
        username: newUserForm.username.toLowerCase(),
        fullName: newUserForm.fullName,
        password: newUserForm.password,
        joinedDate: new Date().toISOString()
      };

      await setDoc(userRef, newUser);
      setAllUsers([...allUsers, newUser]);
      setNewUserForm({ username: '', fullName: '', password: '' });
      alert("Pengguna baru berhasil dibuat!");
    } catch (e) {
      console.error(e);
      alert("Gagal membuat pengguna baru.");
    }
  };

  const formatIDRCurrency = (val: number) => {
    return val.toLocaleString('id-ID');
  };

  const handleAmountChange = (val: string, setter: (v: any) => void, state: any) => {
    const rawValue = val.replace(/\./g, '');
    const numValue = parseInt(rawValue) || 0;
    setter({...state, amount: numValue});
  };

  const handleBalanceChange = (val: string, setter: (v: any) => void, state: any) => {
    const rawValue = val.replace(/\./g, '');
    const numValue = parseInt(rawValue) || 0;
    setter({...state, balance: numValue});
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => t.date >= dateFilter.start && t.date <= dateFilter.end);
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.note.toLowerCase().includes(s) || 
        t.amount.toString().includes(s)
      );
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, dateFilter, searchTerm]);

  const stats = useMemo(() => {
    const totalBalance = wallets.reduce((acc, w) => acc + (Number(w.balance) || 0), 0);
    const totalExpense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const categoryData = categories.map(cat => {
      const value = filteredTransactions.filter(t => t.categoryId === cat.id && t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
      return { name: cat.name, value, color: cat.color };
    }).filter(d => d.value > 0);
    return { totalBalance, totalExpense, totalIncome, categoryData };
  }, [wallets, filteredTransactions, categories]);

  const addTransaction = async () => {
    if (!newTransaction.walletId || !newTransaction.categoryId || newTransaction.amount <= 0 || !currentUser) {
      alert("Lengkapi data transaksi!");
      return;
    }
    await saveData(currentUser.username, "transactions", newTransaction);
    const wallet = wallets.find(w => w.id === newTransaction.walletId);
    if (wallet) {
      const diff = newTransaction.type === TransactionType.INCOME ? newTransaction.amount : -newTransaction.amount;
      await updateWalletBalance(wallet.id, wallet.balance + diff);
    }
    setShowAddTransaction(false);
    setNewTransaction({ ...newTransaction, amount: 0, note: '' });
  };

  const deleteTransaction = async (t: Transaction) => {
    if (!confirm("Hapus transaksi ini? Saldo dompet akan dikembalikan.")) return;
    const wallet = wallets.find(w => w.id === t.walletId);
    if (wallet) {
      const diff = t.type === TransactionType.INCOME ? -t.amount : t.amount;
      await updateWalletBalance(wallet.id, wallet.balance + diff);
    }
    await deleteDoc(doc(db, "transactions", t.id));
  };

  const addWallet = async () => {
    if (!newWallet.name || !currentUser) return;
    await saveData(currentUser.username, "wallets", newWallet);
    setShowAddWallet(false);
    setNewWallet({ name: '', type: WalletType.CASH, balance: 0, color: '#10b981' });
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    const isUsernameChanging = profileForm.username !== currentUser.username;
    if (isUsernameChanging) {
      const confirmChange = confirm("Ganti username akan memindahkan seluruh data Anda ke username baru. Lanjutkan?");
      if (!confirmChange) return;
      try {
        const batch = writeBatch(db);
        const oldId = currentUser.username;
        const newId = profileForm.username;
        const newUserDoc: User = { ...currentUser, ...profileForm };
        batch.set(doc(db, "users", newId), newUserDoc);
        batch.delete(doc(db, "users", oldId));
        const collectionsToUpdate = ["wallets", "transactions", "categories"];
        for (const collName of collectionsToUpdate) {
          const q = query(collection(db, collName), where("owner", "==", oldId));
          const snapshot = await getDocs(q);
          snapshot.forEach((d) => {
            batch.update(d.ref, { owner: newId });
          });
        }
        await batch.commit();
        setCurrentUser(newUserDoc);
        localStorage.setItem('sw_user_session', JSON.stringify(newUserDoc));
        alert("Profil dan data berhasil dimigrasi!");
      } catch (e) {
        console.error(e);
        alert("Gagal memperbarui username.");
      }
    } else {
      try {
        const userRef = doc(db, "users", currentUser.username);
        await updateDoc(userRef, {
          fullName: profileForm.fullName,
          email: profileForm.email,
          phone: profileForm.phone,
          bio: profileForm.bio
        });
        const updatedUser = { ...currentUser, ...profileForm };
        setCurrentUser(updatedUser);
        localStorage.setItem('sw_user_session', JSON.stringify(updatedUser));
        alert("Profil berhasil diperbarui!");
      } catch (e) {
        console.error(e);
        alert("Gagal memperbarui profil.");
      }
    }
    setIsEditingProfile(false);
  };

  const addCategory = async () => {
    if (!newCatForm.name || !currentUser) return;
    await saveData(currentUser.username, "categories", { ...newCatForm, id: `custom-${Date.now()}` });
    setNewCatForm({ name: '', icon: '📦', color: '#64748b' });
  };

  const removeCategory = async (catId: string) => {
    if (confirm("Hapus kategori ini?")) {
      await deleteDoc(doc(db, "categories", catId));
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl w-full max-w-md border-8 border-slate-800 animate-in zoom-in duration-300">
          <div className="text-center mb-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-[30px] flex items-center justify-center text-4xl mb-6 shadow-xl shadow-emerald-500/20">💰</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Smart <span className="text-emerald-500">Wallet</span></h1>
            <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">Cloud Financial Monitoring</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" value={authInput.username} onChange={(e) => setAuthInput({...authInput, username: e.target.value})} placeholder="Username" className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none bg-slate-50 font-bold" />
            <input type="password" value={authInput.password} onChange={(e) => setAuthInput({...authInput, password: e.target.value})} placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none bg-slate-50 font-bold" />
            <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-emerald-600 transition-all text-sm uppercase tracking-widest shadow-xl">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} username={currentUser.username}>
      
      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl flex flex-wrap items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Rentang Waktu</span>
                <div className="flex gap-2">
                  <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})} className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold bg-slate-50" />
                  <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})} className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold bg-slate-50" />
                </div>
              </div>
              <button onClick={() => setShowAddTransaction(true)} className="ml-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                + Transaksi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Saldo</p>
              <h3 className="text-3xl font-black text-slate-900">Rp {formatIDRCurrency(stats.totalBalance)}</h3>
            </div>
            <div className="bg-emerald-600 text-white p-8 rounded-[40px] shadow-2xl">
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-2">Pemasukan</p>
              <h3 className="text-3xl font-black">Rp {formatIDRCurrency(stats.totalIncome)}</h3>
            </div>
            <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[40px] shadow-xl">
              <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-2">Pengeluaran</p>
              <h3 className="text-3xl font-black text-rose-600">Rp {formatIDRCurrency(stats.totalExpense)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl">
              <h4 className="font-black text-slate-800 mb-8 text-xl uppercase">Analisa Pengeluaran</h4>
              <div className="h-[350px]">
                {stats.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.categoryData} innerRadius="65%" outerRadius="95%" paddingAngle={8} dataKey="value" cornerRadius={12}>
                        {stats.categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `Rp ${formatIDRCurrency(v)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase text-xs">Belum ada data pengeluaran</div>}
              </div>
            </div>
            <div className="bg-slate-900 text-white p-10 rounded-[48px] shadow-2xl flex flex-col">
              <h4 className="font-black text-xl mb-6 flex items-center gap-4">
                <span className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-xl">✨</span> AI ADVISOR
              </h4>
              <div className="flex-1 text-slate-400 text-sm italic leading-relaxed overflow-y-auto no-scrollbar mb-6">
                {isAiLoading ? "Sedang menganalisa pola keuangan..." : aiAdvice || "Klik tombol di bawah agar AI dapat memberikan saran finansial berdasarkan riwayat transaksi Anda."}
              </div>
              <button 
                onClick={async () => { setIsAiLoading(true); setAiAdvice(await getFinancialAdvice(transactions, wallets, categories) || ''); setIsAiLoading(false); }} 
                className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-transform"
              >
                Analisa Pola Keuangan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin User Management Tab */}
      {activeTab === 'user-management' && currentUser?.username === 'admin' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
               <span className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-lg">➕</span>
               Buat Pengguna Baru
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Username</label>
                <input 
                  type="text" 
                  value={newUserForm.username} 
                  onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} 
                  placeholder="e.g. joni123" 
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-amber-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={newUserForm.fullName} 
                  onChange={e => setNewUserForm({...newUserForm, fullName: e.target.value})} 
                  placeholder="e.g. Joni Saputra" 
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-amber-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Password</label>
                <input 
                  type="text" 
                  value={newUserForm.password} 
                  onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} 
                  placeholder="Password User" 
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-amber-500 outline-none font-bold"
                />
              </div>
            </div>
            <button 
              onClick={handleCreateUser} 
              className="mt-8 w-full md:w-auto px-12 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all"
            >
              Daftarkan Pengguna
            </button>
          </div>

          <div className="bg-white rounded-[40px] shadow-xl overflow-hidden border border-slate-100">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h4 className="font-black text-slate-800 uppercase text-lg tracking-tight">Daftar Semua Pengguna</h4>
                <span className="bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 uppercase">{allUsers.length} Users</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 border-b border-slate-100">
                     <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Username</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama Lengkap</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Joined Date</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pass (Admin View)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {allUsers.map(user => (
                     <tr key={user.username} className="hover:bg-slate-50 transition-colors">
                       <td className="px-8 py-5 text-sm font-black text-amber-600">@{user.username}</td>
                       <td className="px-8 py-5 text-sm font-bold text-slate-700">{user.fullName}</td>
                       <td className="px-8 py-5 text-xs text-slate-400 font-medium">{new Date(user.joinedDate).toLocaleDateString()}</td>
                       <td className="px-8 py-5 text-xs font-mono text-slate-400">{user.username === 'admin' ? '******' : user.password}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Dompet Saya</h2>
            <button onClick={() => setShowAddWallet(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">+ Dompet</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {wallets.length > 0 ? wallets.map(w => (
              <div key={w.id} className="relative group">
                <div className="p-8 rounded-[40px] shadow-2xl h-56 flex flex-col justify-between text-white overflow-hidden transition-all group-hover:-translate-y-2" style={{ backgroundColor: w.color || '#10b981' }}>
                  <div className="absolute top-0 right-0 p-8 opacity-20 text-6xl">💳</div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{w.type}</p>
                    <h4 className="text-xl font-black">{w.name}</h4>
                  </div>
                  <h3 className="text-3xl font-black">Rp {formatIDRCurrency(w.balance)}</h3>
                </div>
                <button onClick={async () => { if(confirm("Hapus dompet ini?")) await deleteDoc(doc(db, "wallets", w.id)); }} className="absolute -top-3 -right-3 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-200 rounded-[40px]">
                <p className="text-slate-400 font-black uppercase text-sm">Belum ada dompet. Tambahkan sekarang!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-10">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Riwayat Transaksi</h2>
            <div className="w-full md:w-auto flex gap-4">
              <input type="text" placeholder="Cari catatan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 md:w-64 px-6 py-3 rounded-2xl border-2 border-slate-100 bg-white font-bold text-sm outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div className="bg-white rounded-[40px] shadow-xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tanggal</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Kategori</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Catatan</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Jumlah</th>
                    <th className="px-8 py-5 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.map(t => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 text-xs font-bold text-slate-500">{t.date}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg text-lg" style={{ backgroundColor: cat?.color + '20' }}>{cat?.icon}</span>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{cat?.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-slate-600 italic">{t.note || '-'}</td>
                        <td className={`px-8 py-5 text-right font-black text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'} Rp {formatIDRCurrency(t.amount)}
                        </td>
                        <td className="px-8 py-5 text-right">
                           <button onClick={() => deleteTransaction(t)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-12 py-10 animate-in slide-in-from-bottom-4 duration-500">
          <section className="bg-white p-8 md:p-12 rounded-[48px] shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl font-black">USER</div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Profil & Akun</h3>
              <button onClick={() => isEditingProfile ? handleUpdateProfile() : setIsEditingProfile(true)} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isEditingProfile ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{isEditingProfile ? 'Simpan Data' : 'Edit Profil'}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Username (Login ID)</label>
                 <input type="text" disabled={!isEditingProfile} value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} className={`w-full px-6 py-4 rounded-2xl font-bold border-2 transition-all outline-none ${isEditingProfile ? 'border-amber-500/20 bg-white focus:border-amber-500 shadow-inner' : 'border-slate-50 bg-slate-50 text-slate-400'}`} />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Nama Lengkap</label>
                 <input type="text" disabled={!isEditingProfile} value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className={`w-full px-6 py-4 rounded-2xl font-bold border-2 transition-all outline-none ${isEditingProfile ? 'border-emerald-500/20 bg-white focus:border-emerald-500 shadow-inner' : 'border-slate-50 bg-slate-50 text-slate-700'}`} />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Email Aktif</label>
                 <input type="email" disabled={!isEditingProfile} value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} placeholder="user@smartwallet.ai" className={`w-full px-6 py-4 rounded-2xl font-bold border-2 transition-all outline-none ${isEditingProfile ? 'border-emerald-500/20 bg-white focus:border-emerald-500 shadow-inner' : 'border-slate-50 bg-slate-50 text-slate-700'}`} />
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Nomor HP</label>
                 <input type="text" disabled={!isEditingProfile} value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+62 8..." className={`w-full px-6 py-4 rounded-2xl font-bold border-2 transition-all outline-none ${isEditingProfile ? 'border-emerald-500/20 bg-white focus:border-emerald-500 shadow-inner' : 'border-slate-50 bg-slate-50 text-slate-700'}`} />
               </div>
               <div className="md:col-span-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Biografi Keuangan</label>
                 <textarea disabled={!isEditingProfile} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} rows={3} placeholder="Sebutkan goal keuangan Anda..." className={`w-full px-6 py-4 rounded-2xl font-bold border-2 transition-all outline-none resize-none ${isEditingProfile ? 'border-emerald-500/20 bg-white focus:border-emerald-500 shadow-inner' : 'border-slate-50 bg-slate-50 text-slate-700'}`} />
               </div>
            </div>
          </section>
          
          <section className="bg-white p-8 md:p-12 rounded-[48px] shadow-xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">Master Kategori</h3>
            <div className="bg-slate-50 p-6 rounded-3xl mb-10 flex flex-col md:flex-row gap-4 items-end border border-slate-100">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Nama</label>
                <input type="text" value={newCatForm.name} onChange={e => setNewCatForm({...newCatForm, name: e.target.value})} className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 font-bold text-sm bg-white" />
              </div>
              <div className="w-full md:w-32">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Emoji</label>
                <input type="text" value={newCatForm.icon} onChange={e => setNewCatForm({...newCatForm, icon: e.target.value})} className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 font-bold text-center" />
              </div>
              <div className="w-full md:w-32">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Warna</label>
                <input type="color" value={newCatForm.color} onChange={e => setNewCatForm({...newCatForm, color: e.target.value})} className="w-full h-[46px] rounded-xl border-2 border-slate-200 p-1 bg-white" />
              </div>
              <button onClick={addCategory} className="w-full md:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Add Category</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="group relative p-6 bg-white rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: cat.color + '15' }}>{cat.icon}</div>
                  <span className="text-[10px] font-black uppercase text-slate-700">{cat.name}</span>
                  <button onClick={() => removeCategory(cat.id)} className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Modals... */}
      {showAddTransaction && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[64px] p-6 md:p-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-2xl font-black mb-8 text-slate-900 uppercase tracking-tighter">Transaksi Baru</h3>
            <div className="space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setNewTransaction({...newTransaction, type: TransactionType.EXPENSE})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase ${newTransaction.type === TransactionType.EXPENSE ? 'bg-white shadow text-rose-600' : 'text-slate-400'}`}>Keluar</button>
                <button onClick={() => setNewTransaction({...newTransaction, type: TransactionType.INCOME})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase ${newTransaction.type === TransactionType.INCOME ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Masuk</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={newTransaction.walletId} onChange={e => setNewTransaction({...newTransaction, walletId: e.target.value})} className="px-4 py-4 rounded-xl border-2 border-slate-50 bg-slate-50 font-bold text-xs">
                  <option value="">Pilih Dompet</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <select value={newTransaction.categoryId} onChange={e => setNewTransaction({...newTransaction, categoryId: e.target.value})} className="px-4 py-4 rounded-xl border-2 border-slate-50 bg-slate-50 font-bold text-xs">
                  <option value="">Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Jumlah Nominal (Rp)</label>
                <input type="text" value={formatIDRCurrency(newTransaction.amount)} onChange={(e) => handleAmountChange(e.target.value, setNewTransaction, newTransaction)} className="w-full px-8 py-6 rounded-3xl border-2 border-emerald-500/20 bg-slate-900 text-emerald-400 font-black text-4xl" />
              </div>
              <input type="text" value={newTransaction.note} onChange={e => setNewTransaction({...newTransaction, note: e.target.value})} placeholder="Catatan singkat..." className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 font-bold outline-none" />
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddTransaction(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Batal</button>
                <button onClick={addTransaction} className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddWallet && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[64px] p-6 md:p-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-2xl font-black mb-8 text-slate-900 uppercase tracking-tighter">Tambah Dompet</h3>
            <div className="space-y-6">
              <input type="text" placeholder="Nama Dompet" value={newWallet.name} onChange={e => setNewWallet({...newWallet, name: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 font-bold outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <select value={newWallet.type} onChange={e => setNewWallet({...newWallet, type: e.target.value as WalletType})} className="px-4 py-4 rounded-xl border-2 border-slate-50 bg-slate-50 font-bold text-xs">
                  {Object.values(WalletType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="color" value={newWallet.color} onChange={e => setNewWallet({...newWallet, color: e.target.value})} className="w-full h-12 rounded-xl border-none p-0 cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Saldo Awal (Rp)</label>
                <input type="text" value={formatIDRCurrency(newWallet.balance)} onChange={(e) => handleBalanceChange(e.target.value, setNewWallet, newWallet)} className="w-full px-8 py-4 rounded-2xl border-2 font-black text-2xl" />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddWallet(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Batal</button>
                <button onClick={addWallet} className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase">Buat Dompet</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
