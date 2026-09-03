'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BookOpen, Plus, LogOut, User as UserIcon, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Navbar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const displayName = user ? (user.name && user.name.trim() !== '' ? user.name : user.email.split('@')[0]) : '';

  return (
    <header className="border-b border-slate-200 dark:border-[#27272a] bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* CATEGORY 1: LEFT - Branding */}
        <div className="flex items-center space-x-3 shrink-0">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-500/20 group-hover:bg-indigo-500 transition">
              N
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-zinc-100">
                NoteTaker
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                POC
              </span>
            </div>
          </Link>
        </div>

        {/* CATEGORY 2: CENTER - Navigation Links (Desktop) */}
        <nav className="hidden sm:flex items-center space-x-1 text-xs font-medium text-slate-600 dark:text-zinc-400">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition"
          >
            All Notes
          </Link>
          <Link
            href="/notes/new"
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition"
          >
            New Note
          </Link>
        </nav>

        {/* CATEGORY 3: RIGHT - Theme Switcher & User Actions */}
        <div className="hidden sm:flex items-center space-x-2 shrink-0">
          {/* THEME TOGGLE BUTTON */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 transition cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {authLoading ? (
            <div className="flex items-center space-x-2 animate-pulse">
              <div className="h-7 w-24 bg-slate-200 dark:bg-zinc-800/80 rounded-lg" />
              <div className="h-7 w-20 bg-slate-200 dark:bg-zinc-800/80 rounded-lg" />
            </div>
          ) : user ? (
            <>
              <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700/80">
                <UserIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="font-medium max-w-[150px] truncate">{displayName}</span>
              </div>

              <Link
                href="/notes/new"
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Note</span>
              </Link>

              <button
                onClick={handleLogout}
                className="text-slate-400 dark:text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Actions: Theme Toggle & Hamburger */}
        <div className="flex sm:hidden items-center space-x-1">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] px-4 py-3 space-y-3">
          {authLoading ? (
            <div className="flex flex-col space-y-2 py-2 animate-pulse">
              <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-800 rounded" />
              <div className="h-6 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
            </div>
          ) : user ? (
            <>
              <div className="flex items-center space-x-2 text-xs text-slate-800 dark:text-zinc-200 pb-2 border-b border-slate-200 dark:border-zinc-800">
                <UserIcon className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold">{displayName}</span>
              </div>
              <div className="flex flex-col space-y-2 text-xs">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white"
                >
                  All Notes
                </Link>
                <Link
                  href="/notes/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 text-indigo-600 dark:text-indigo-400 font-semibold"
                >
                  + Create New Note
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-left py-1.5 text-rose-500 hover:underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-2 text-xs">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-slate-700 dark:text-zinc-300"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-indigo-600 dark:text-indigo-400 font-semibold"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
