'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, ArrowRight, AlertCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col justify-center py-10 px-4 sm:px-6 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-[360px] space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1 relative">
          <button
            onClick={toggleTheme}
            className="absolute right-0 top-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 border border-slate-200 dark:border-zinc-800 transition"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-slate-600" />
            )}
          </button>

          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white font-bold text-sm mx-auto flex items-center justify-center shadow-sm shadow-indigo-500/20">
            N
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">Create Account</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-500">Start drafting and sharing expiring notes</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-5 space-y-3.5 shadow-xl">
          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-2 text-rose-600 dark:text-rose-300 text-xs animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Google OAuth Button */}
          <a
            href="/api/auth/google"
            className="w-full py-2 px-3 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </a>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 dark:border-zinc-800 w-full" />
            <span className="bg-white whitespace-nowrap dark:bg-[#121215] px-2 text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider relative">
              Or with email
            </span>
            <div className="border-t border-slate-200 dark:border-zinc-800 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Harish Kumar"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <User className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </form>

          <div className="text-center pt-1 text-[11px] text-slate-500 dark:text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
