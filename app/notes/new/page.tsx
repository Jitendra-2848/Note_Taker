'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { 
  Lock, Globe, Clock, RefreshCw, AlertCircle, ArrowLeft, 
  Eye, EyeOff, ShieldCheck, Share2, Flame, ArrowRight, LogIn, Calendar 
} from 'lucide-react';
import Link from 'next/link';
import { CopyButton } from '@/components/ui/CopyButton';

export default function NewNotePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shareType, setShareType] = useState<'ONE_TIME' | 'TIME_BASED'>('TIME_BASED');
  const [accessType, setAccessType] = useState<'PUBLIC' | 'PROTECTED'>('PUBLIC');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  
  const [expirySelection, setExpirySelection] = useState<string>('24');
  const [customDateTime, setCustomDateTime] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createdNote, setCreatedNote] = useState<{
    id: string;
    token: string;
    plainKey: string | null;
    accessType: string;
    shareType: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCurrentUser(data.data);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  const generateRandomKey = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 400);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let key = '';
    for (let i = 0; i < 12; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(key);
  };

  const handleAccessTypeChange = (type: 'PUBLIC' | 'PROTECTED') => {
    setAccessType(type);
    if (type === 'PROTECTED' && !customPassword) {
      generateRandomKey();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push('/login?redirect=/notes/new');
      return;
    }

    if (expirySelection === 'custom' && !customDateTime) {
      setError('Please select a custom expiration date and time');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload: any = {
        title,
        content,
        shareType,
        accessType,
        customPassword: accessType === 'PROTECTED' ? customPassword : null,
      };

      if (expirySelection === 'custom') {
        payload.customExpiresAt = new Date(customDateTime).toISOString();
      } else {
        payload.expiresInHours = Number(expirySelection);
      }

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          router.push('/login?redirect=/notes/new');
          return;
        }
        setError(data.error || 'Failed to create note');
        setLoading(false);
        return;
      }

      const link = data.data.shareLinks?.[0];
      setCreatedNote({
        id: data.data.id,
        token: link.token,
        plainKey: link.plainKey,
        accessType: link.accessType,
        shareType: link.shareType,
      });
      setLoading(false);
    } catch {
      setError('An error occurred while creating the note.');
      setLoading(false);
    }
  };

  const getShareUrl = (token: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/share/${token}`;
    }
    return `/share/${token}`;
  };

  const getFullPackageText = () => {
    if (!createdNote) return '';
    const url = getShareUrl(createdNote.token);
    let pkg = `Share Link: ${url}`;
    if (createdNote.plainKey) {
      pkg += `\nAccess Key: ${createdNote.plainKey}`;
    }
    pkg += `\nDuration: ${createdNote.shareType === 'ONE_TIME' ? 'One-Time Read' : 'Time-Based'}`;
    return pkg;
  };

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center space-x-2.5">
          <Link
            href="/"
            className="p-1.5 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:border-slate-300 dark:hover:border-zinc-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Create Note</h1>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500">Configure title, content, and expiring link settings</p>
          </div>
        </div>

        {!checkingAuth && !currentUser && (
          <div className="bg-white dark:bg-[#121215] border border-amber-500/30 rounded-xl p-6 text-center space-y-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-xl w-10 h-10 mx-auto flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Sign in required</h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-xs mx-auto">
                You must be signed in to your account to create and share notes.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center space-x-2">
              <Link
                href="/login?redirect=/notes/new"
                className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium"
              >
                Register
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2 text-rose-600 dark:text-rose-300 text-xs font-medium animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {createdNote ? (
          <div className="bg-white dark:bg-[#121215] border border-indigo-500/40 rounded-xl p-5 space-y-4 shadow-md">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Share Link Created</h2>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500">Your note link is active and ready to share</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">
                  Share URL
                </span>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#121215] p-2 rounded border border-slate-200 dark:border-zinc-800">
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-300 truncate">
                    {getShareUrl(createdNote.token)}
                  </span>
                  <CopyButton
                    textToCopy={getShareUrl(createdNote.token)}
                    label="Copy"
                    className="px-2 py-0.5 text-xs"
                  />
                </div>
              </div>

              {createdNote.plainKey && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-1">
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                    Access Key (Required to Unlock)
                  </span>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#121215] p-2 rounded border border-amber-500/30">
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-300 tracking-wider">
                      {createdNote.plainKey}
                    </span>
                    <CopyButton
                      textToCopy={createdNote.plainKey}
                      label="Copy Key"
                      className="px-2 py-0.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <CopyButton
                textToCopy={getFullPackageText()}
                label="Copy Full Package"
                copiedLabel="Copied!"
                className="py-1 px-3 text-xs"
              />

              <div className="flex items-center space-x-2">
                <Link
                  href={`/notes/${createdNote.id}`}
                  className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition"
                >
                  View Note
                </Link>
                <Link
                  href="/"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-xs"
                >
                  Done
                </Link>
              </div>
            </div>
          </div>
        ) : (
          currentUser && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title..."
                    className="w-full max-w-full px-3 py-2 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-slate-900 dark:text-zinc-100 text-sm placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Content (Markdown)
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write note content here..."
                    className="w-full max-w-full px-3 py-2 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs font-mono leading-relaxed transition"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-center space-x-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2.5 text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  <Share2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Share Settings</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Access Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAccessTypeChange('PUBLIC')}
                      className={`p-3 rounded-lg border text-left transition text-xs cursor-pointer ${
                        accessType === 'PUBLIC'
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5">
                        <Globe className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Public</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Anyone with link can read</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAccessTypeChange('PROTECTED')}
                      className={`p-3 rounded-lg border text-left transition text-xs cursor-pointer ${
                        accessType === 'PROTECTED'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                        <span>Password Protected</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Requires key to unlock</div>
                    </button>
                  </div>

                  {accessType === 'PROTECTED' && (
                    <div className="mt-2.5 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-amber-700 dark:text-amber-300 text-[11px]">Access Key</span>
                        <button
                          type="button"
                          onClick={generateRandomKey}
                          className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <RefreshCw className={`h-3 w-3 ${isRotating ? 'animate-spin' : ''}`} />
                          <span>Regen</span>
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          className="w-full max-w-full pl-3 pr-20 py-1.5 bg-white dark:bg-[#18181b] border border-amber-500/40 rounded text-xs font-mono text-amber-800 dark:text-amber-300 focus:outline-none focus:border-amber-500"
                        />
                        <div className="absolute right-1.5 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-100 cursor-pointer"
                            title={showPassword ? 'Hide' : 'Show'}
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <CopyButton
                            textToCopy={customPassword}
                            label="Copy"
                            className="px-2 py-0.5 text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Duration Setting
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShareType('TIME_BASED')}
                      className={`p-3 rounded-lg border text-left transition text-xs cursor-pointer ${
                        shareType === 'TIME_BASED'
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                        <span>Time-Based</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Active until expiry time</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareType('ONE_TIME')}
                      className={`p-3 rounded-lg border text-left transition text-xs cursor-pointer ${
                        shareType === 'ONE_TIME'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5">
                        <Flame className="h-3.5 w-3.5 text-purple-500" />
                        <span>One-Time Burn</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Burns on first view</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                    Expiration Window
                  </label>
                  
                  <div className="w-full max-w-full overflow-hidden">
                    <select
                      value={expirySelection}
                      onChange={(e) => setExpirySelection(e.target.value)}
                      className="w-full max-w-full truncate px-3 py-2 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="1">1 hour</option>
                      <option value="6">6 hours</option>
                      <option value="24">24 hours (1 day)</option>
                      <option value="72">72 hours (3 days)</option>
                      <option value="168">7 days (1 week)</option>
                      <option value="custom">Custom Expiry Date &amp; Time...</option>
                    </select>
                  </div>

                  {expirySelection === 'custom' && (
                    <div className="p-3 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700 rounded-lg space-y-1.5 animate-fade-in">
                      <label className="block text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Choose exact expiration date and time</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        min={minDateTime}
                        value={customDateTime}
                        onChange={(e) => setCustomDateTime(e.target.value)}
                        className="w-full max-w-full px-3 py-1.5 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                        The share link will automatically expire at this exact moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <Link
                  href="/"
                  className="px-3.5 py-1.5 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 rounded-lg text-xs font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition shadow-xs flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                >
                  <span>{loading ? 'Creating...' : 'Create Note'}</span>
                  {!loading && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </form>
          )
        )}
      </main>
    </div>
  );
}
