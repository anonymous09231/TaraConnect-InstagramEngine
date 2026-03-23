/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { 
  Instagram, Search, Loader2, AlertCircle, Users, List, 
  BadgeCheck, Lock, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, 
  X, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { fetchProfile, fetchProfilesBulk, parseUsername } from './services/apifyService';
import { InstagramProfile } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const queryClient = new QueryClient();

// --- Components ---

function StatCard({ label, value, icon: Icon, highlight = false }: { label: string, value: string | number, icon?: any, highlight?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-2xl glass glass-hover border border-slate-100",
        highlight && "bg-cyan-50 border-cyan-100"
      )}
    >
      {Icon && <Icon size={16} className="mb-2 text-slate-400" />}
      <span className={cn("text-2xl font-bold font-display", highlight ? "text-gradient" : "text-slate-900")}>
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-1">
        {label}
      </span>
    </motion.div>
  );
}

function formatCount(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000)         return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
}

// --- Main App Content ---

function Main() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [searchVal, setSearchVal] = useState("");
  const [searchInput, setSearchInput] = useState<string | null>(null);
  const [bulkRaw, setBulkRaw] = useState("");
  const [bulkInputs, setBulkInputs] = useState<string[] | null>(null);
  const [sortKey, setSortKey] = useState<keyof InstagramProfile>("followers");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Queries
  const { data: profile, isLoading: singleLoading, error: singleErr } = useQuery({
    queryKey: ["ig-profile", searchInput],
    queryFn: () => fetchProfile(searchInput!),
    enabled: !!searchInput && mode === "single",
    retry: false,
  });

  const { data: bulkProfiles, isLoading: bulkLoading, error: bulkErr } = useQuery({
    queryKey: ["ig-bulk", bulkInputs],
    queryFn: () => fetchProfilesBulk(bulkInputs!),
    enabled: !!bulkInputs && mode === "bulk",
    retry: false,
  });

  const sortedBulk = useMemo(() => {
    if (!bulkProfiles) return [];
    return [...bulkProfiles].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
  }, [bulkProfiles, sortKey, sortDir]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      setSearchInput(searchVal.trim());
    }
  };

  const handleBulkSubmit = (e: FormEvent) => {
    e.preventDefault();
    const p = bulkRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (p.length) setBulkInputs(p);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center px-4 py-12 font-sans">
      <div className="atmosphere" />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-500/10 animate-float overflow-hidden glass border border-white/10">
          <img 
            src="https://www.taraconnect.in/finallogo.png" 
            alt="Tara Connect Logo" 
            className="w-full h-full object-contain p-2"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tighter mb-4 text-gradient">
          Tara Insight
        </h1>
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Intelligent Social Analytics Engine
        </p>
      </motion.header>

      {/* Mode Toggle */}
      <div className="flex p-1 bg-slate-100 rounded-2xl glass mb-8">
        <button 
          onClick={() => setMode('single')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
            mode === 'single' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Users size={16} /> Single Profile
        </button>
        <button 
          onClick={() => setMode('bulk')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
            mode === 'bulk' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <List size={16} /> Bulk Lookup
        </button>
      </div>

      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {mode === 'single' ? (
            <motion.div 
              key="single"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-cyan-500 transition-colors">
                  <Search size={20} />
                </div>
                <input 
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Enter username or profile URL..."
                  className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-32 text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all placeholder:text-slate-400"
                />
                <button 
                  type="submit"
                  disabled={singleLoading || !searchVal.trim()}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  {singleLoading ? <Loader2 size={18} className="animate-spin" /> : "Analyze"}
                </button>
              </form>

              {singleErr && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{(singleErr as Error).message}</p>
                </motion.div>
              )}

              {profile && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden"
                >
                  {/* Profile Header */}
                  <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full blur opacity-40 animate-pulse" />
                      <img 
                        src={profile.profilePic} 
                        alt={profile.displayName}
                        className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
                      />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h2 className="text-3xl font-display font-bold text-slate-900">{profile.displayName}</h2>
                        {profile.isVerified && <BadgeCheck size={24} className="text-blue-500" />}
                        {profile.isPrivate && <Lock size={18} className="text-slate-400" />}
                      </div>
                      <p className="text-slate-500 font-medium mb-4">@{profile.username}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        {profile.category && (
                          <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {profile.category}
                          </span>
                        )}
                        <a 
                          href={`https://instagram.com/${profile.username}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1 hover:bg-cyan-500/20 transition-colors"
                        >
                          View Profile <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Stats Display - Only Followers */}
                  <div className="flex justify-center mb-8">
                    <StatCard label="Followers" value={formatCount(profile.followers)} highlight />
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 mb-8">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line italic">
                        "{profile.bio}"
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="bulk"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <form onSubmit={handleBulkSubmit} className="glass rounded-3xl p-6 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Bulk Username Input</label>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-600">One per line or comma-separated</span>
                </div>
                <textarea 
                  value={bulkRaw}
                  onChange={(e) => setBulkRaw(e.target.value)}
                  placeholder="cristiano, leomessi, selenagomez..."
                  className="w-full h-40 bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all resize-none font-mono text-slate-700"
                />
                <button 
                  type="submit"
                  disabled={bulkLoading || !bulkRaw.trim()}
                  className="w-full py-4 bg-cyan-600 text-white font-bold rounded-2xl hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
                >
                  {bulkLoading ? <Loader2 size={18} className="animate-spin" /> : "Fetch All Profiles"}
                </button>
              </form>

              {bulkErr && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{(bulkErr as Error).message}</p>
                </div>
              )}

              {bulkProfiles && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass rounded-3xl border border-white/10 overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Profile</th>
                          <th 
                            className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-900 transition-colors"
                            onClick={() => {
                              if (sortKey === 'followers') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                              else { setSortKey('followers'); setSortDir('desc'); }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Followers {sortKey === 'followers' && (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedBulk.map((p, i) => (
                          <tr key={p.username} className="border-t border-slate-100 hover:bg-slate-50 transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img src={p.profilePic} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-slate-900">{p.displayName}</span>
                                    {p.isVerified && <BadgeCheck size={12} className="text-blue-500" />}
                                  </div>
                                  <span className="text-xs text-slate-500">@{p.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-display font-bold text-cyan-600">{formatCount(p.followers)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Main />
    </QueryClientProvider>
  );
}
