'use client';

import { useState, useEffect, useRef, use } from 'react';
import { 
  Lock, Globe, Clock, AlertTriangle, ShieldX, KeyRound, 
  Eye, EyeOff, ShieldCheck, Flame, BookOpen, Sun, Moon 
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { useTheme } from '@/components/ThemeProvider';

interface ShareData {
  token: string;
  title: string;
  content?: string;
  accessType: 'PUBLIC' | 'PROTECTED';
  shareType: 'ONE_TIME' | 'TIME_BASED';
  expiresAt?: string | null;
  requiresPassword?: boolean;
}

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockedContent, setUnlockedContent] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);

  const fetchShareLink = async () => {
    if (unlocked || unlockedContent) return;

    setLoading(true);
    setError('');
    setErrorCode(null);

    try {
      const res = await fetch(`/api/share/${token}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Unable to access note');
        setErrorCode(json.code || 'UNKNOWN_ERROR');
      } else {
        setData(json.data);
        if (json.data.content) {
          setUnlocked(true);
          setUnlockedContent(json.data.content);
        }
      }
    } catch {
      setError('An error occurred while opening the share link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchShareLink();
  }, [token]);

  const handleUnlockOrRead = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUnlockError('');
    setIsShaking(false);
    setUnlocking(true);

    try {
      const res = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();
      if (!json.success) {
        if (json.code === 'RACE_CONDITION_BLOCKED' || json.code === 'ALREADY_USED') {
          setError(json.error || 'This note was already claimed on a first-come, first-served basis.');
          setErrorCode(json.code);
        } else {
          setUnlockError(json.error || 'Incorrect access key.');
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 400);
        }
        setUnlocking(false);
        return;
      }

      setUnlocked(true);
      setUnlockedContent(json.data.content);
      setData((prev) => (prev ? { ...prev, content: json.data.content } : json.data));
    } catch {
      setUnlockError('Error validating request. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-5 sm:p-7 space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">
                Secure Note Reader
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">Expiring Link Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-100 border border-slate-200 dark:border-zinc-800 transition"
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600" />
              )}
            </button>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              Encrypted
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-12 text-slate-500 dark:text-zinc-500 space-y-2">
            <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs">Verifying link...</p>
          </div>
        )}

        {/* Consumed / Error Notice */}
        {!loading && error && !unlocked && (
          <div className="bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 text-center space-y-2.5">
            <div className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg w-10 h-10 mx-auto flex items-center justify-center">
              {errorCode === 'REVOKED' ? (
                <ShieldX className="h-5 w-5 text-rose-500" />
              ) : errorCode === 'EXPIRED' ? (
                <Clock className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
              ) : errorCode === 'ALREADY_USED' || errorCode === 'RACE_CONDITION_BLOCKED' ? (
                <Flame className="h-5 w-5 text-purple-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                {errorCode === 'REVOKED'
                  ? 'Link Revoked'
                  : errorCode === 'EXPIRED'
                  ? 'Link Expired'
                  : errorCode === 'ALREADY_USED' || errorCode === 'RACE_CONDITION_BLOCKED'
                  ? 'One-Time Note Consumed'
                  : 'Access Denied'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Pre-Unlock Phase */}
        {!loading && !error && data && !unlocked && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">
                    Document
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">{data.title}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={data.accessType} />
                  <StatusBadge status={data.shareType} />
                </div>
              </div>

              {/* Reader Notice */}
              <div className="p-2.5 bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-lg space-y-1 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex items-center space-x-1 text-slate-800 dark:text-zinc-300 font-medium text-[11px]">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  <span>Reader Notice:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-zinc-400 pl-0.5">
                  {data.shareType === 'ONE_TIME' ? (
                    <li className="text-purple-700 dark:text-purple-300 font-medium">
                      One-Time: Access is first-come, first-served. Burns upon reading.
                    </li>
                  ) : (
                    <li>Accessible until the set expiration limit.</li>
                  )}
                  {data.requiresPassword && (
                    <li>Incorrect keys will not open the note or increment views.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Case 1: Password Protected */}
            {data.requiresPassword ? (
              <div className="bg-amber-500/5 dark:bg-[#18181b] border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 font-medium text-xs">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Enter Access Key to Unlock</span>
                </div>

                {unlockError && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center space-x-1.5 animate-shake">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{unlockError}</span>
                  </div>
                )}

                <form onSubmit={handleUnlockOrRead} className="space-y-2.5">
                  <div className={`relative ${isShaking ? 'animate-shake' : ''}`}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Access key"
                      className="w-full pl-3 pr-10 py-2 bg-white dark:bg-[#121215] border border-amber-500/40 rounded-lg text-amber-800 dark:text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 p-0.5 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-100 cursor-pointer"
                      title={showPassword ? 'Hide' : 'Show'}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={unlocking}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{unlocking ? 'Unlocking...' : 'Unlock & Read Note'}</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Case 2: Public One-Time Read */
              data.shareType === 'ONE_TIME' && (
                <div className="bg-purple-50 dark:bg-[#18181b] border border-purple-200 dark:border-purple-500/30 rounded-xl p-4 space-y-2.5 text-center">
                  <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg w-8 h-8 mx-auto flex items-center justify-center">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-purple-900 dark:text-purple-200">Ready to Reveal Note</h3>
                    <p className="text-[11px] text-purple-700 dark:text-zinc-400 max-w-xs mx-auto">
                      Click below to claim and view this note. It burns permanently after first read.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlockOrRead()}
                    disabled={unlocking}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs transition shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{unlocking ? 'Opening Note...' : 'Open & Read Note'}</span>
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Unlocked Reading View */}
        {unlocked && (unlockedContent || data?.content) && (
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">
                  {data?.title || 'Note'}
                </h2>
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Unlocked</span>
                  <span>•</span>
                  <span>
                    {data?.shareType === 'ONE_TIME' ? 'One-Time Read' : 'Time-Based'}
                  </span>
                </div>
              </div>

              <CopyButton
                textToCopy={unlockedContent || data?.content || ''}
                label="Copy"
                className="text-xs"
              />
            </div>

            {/* Note Text */}
            <div className="bg-slate-50 dark:bg-[#18181b] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {unlockedContent || data?.content}
            </div>

            {data?.shareType === 'ONE_TIME' && (
              <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg flex items-start space-x-2 text-xs text-purple-900 dark:text-purple-200">
                <Flame className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-purple-800 dark:text-purple-300">
                  This note has been burned. You may finish reading and copying it. Further requests will see an already-consumed notice.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
