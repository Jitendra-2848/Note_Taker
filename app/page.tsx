'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { 
  Plus, Clock, Eye, Trash2, ExternalLink, RefreshCw, 
  Search, X, ShieldAlert, CheckCircle2, ChevronRight, FileText, Share2 
} from 'lucide-react';
import { StatusBadge, StatusType } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';

interface ShareLink {
  id: string;
  token: string;
  shareType: 'ONE_TIME' | 'TIME_BASED';
  accessType: 'PUBLIC' | 'PROTECTED';
  expiresAt: string | null;
  isUsed: boolean;
  isRevoked: boolean;
  viewCount: number;
  plainKey: string | null;
  createdAt: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  shareLinks: ShareLink[];
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'PROTECTED' | 'ONE_TIME' | 'PUBLIC'>('ALL');
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchNotes = async () => {
    setLoading(true); 
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (data.success) {
        setNotes(data.data);
      }
    } catch (err) {
      console.error('Failed to load notes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getShareUrl = (token: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/share/${token}`;
    }
    return `/share/${token}`;
  };

  const getFullPackageText = (link: ShareLink) => {
    const url = getShareUrl(link.token);
    let pkg = `Share Link: ${url}`;
    if (link.plainKey) {
      pkg += `\nAccess Key: ${link.plainKey}`;
    }
    pkg += `\nDuration: ${link.shareType === 'ONE_TIME' ? 'One-Time Read' : 'Time-Based'}`;
    return pkg;
  };

  const handleRevokeFromHome = async (token: string) => {
    if (!confirm('Revoke and remove this share link immediately?')) return;
    setRevokingToken(token);
    try {
      const res = await fetch(`/api/share/${token}/revoke`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Link revoked and removed.');
        fetchNotes();
      } else {
        alert(data.error || 'Failed to revoke link');
      }
    } catch {
      alert('Error revoking share link');
    } finally {
      setRevokingToken(null);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note and all its links?')) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotes(notes.filter((n) => n.id !== id));
        showToast('Note deleted.');
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const getNoteMetadata = (content: string) => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, readTime };
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'ACTIVE') {
        return note.shareLinks.some((l) => {
          const isExpired = l.expiresAt && new Date(l.expiresAt) < new Date();
          return !l.isRevoked && !l.isUsed && !isExpired;
        });
      }
      if (activeFilter === 'PROTECTED') {
        return note.shareLinks.some((l) => l.accessType === 'PROTECTED');
      }
      if (activeFilter === 'ONE_TIME') {
        return note.shareLinks.some((l) => l.shareType === 'ONE_TIME');
      }
      if (activeFilter === 'PUBLIC') {
        return note.shareLinks.some((l) => l.accessType === 'PUBLIC');
      }
      return true;
    });
  }, [notes, searchQuery, activeFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-zinc-800 border border-slate-700 dark:border-zinc-700 text-white dark:text-zinc-100 text-xs px-3.5 py-2 rounded-xl shadow-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* 1. PAGE HEADER ROW */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              Notes
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700">
              {notes.length}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={fetchNotes}
              className="p-2 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 rounded-lg transition cursor-pointer shadow-xs"
              title="Refresh notes"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <Link
              href="/notes/new"
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg font-medium text-xs transition shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Note</span>
            </Link>
          </div>
        </div>

        {/* 2. UNIFIED SEARCH & FILTER TOOLBAR (RESPONSIVE ON ALL SCREENS) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-2.5 sm:p-3 shadow-xs transition-colors duration-200">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="block w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* FILTER TABS */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 sm:pb-0 text-xs shrink-0">
            {(
              [
                { key: 'ALL', label: 'All' },
                { key: 'ACTIVE', label: 'Active' },
                { key: 'PROTECTED', label: 'Protected' },
                { key: 'ONE_TIME', label: 'One-Time' },
                { key: 'PUBLIC', label: 'Public' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                  activeFilter === tab.key
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold shadow-xs'
                    : 'bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. NOTES GRID */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 dark:text-zinc-500 text-xs">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-10 text-center space-y-3">
            <FileText className="h-8 w-8 text-slate-400 dark:text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">No notes found</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-xs mx-auto">
              {searchQuery ? 'No notes match your search query.' : 'Create your first note to begin.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <Link
                href="/notes/new"
                className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Note</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredNotes.map((note) => {
              const { words, readTime } = getNoteMetadata(note.content);
              const totalViews = note.shareLinks.reduce((acc, l) => acc + l.viewCount, 0);

              return (
                <div
                  key={note.id}
                  className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] hover:border-slate-300 dark:hover:border-zinc-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition shadow-sm"
                >
                  {/* Top Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/notes/${note.id}`}
                        className="group flex items-center space-x-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      >
                        <h2 className="font-semibold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                          {note.title}
                        </h2>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition" />
                      </Link>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-slate-400 dark:text-zinc-600 hover:text-rose-500 rounded transition cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Metadata Line */}
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-zinc-500 mt-1">
                      <span>{new Date(note.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      <span>•</span>
                      <span>{words} words</span>
                      <span>•</span>
                      <span>{readTime}m read</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{totalViews} views</span>
                    </div>

                    {/* Content Preview */}
                    <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 mt-2 bg-slate-50 dark:bg-[#18181b] p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800/80 leading-relaxed font-mono">
                      {note.content}
                    </p>
                  </div>

                  {/* Share Links Box */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                        Share Links ({note.shareLinks.length})
                      </span>
                      <Link
                        href={`/notes/${note.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                      >
                        Manage
                      </Link>
                    </div>

                    {note.shareLinks.length === 0 ? (
                      <p className="text-[11px] text-slate-400 dark:text-zinc-600 italic">No links generated yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {note.shareLinks.slice(0, 2).map((link) => {
                          const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                          const statusKey: StatusType = link.isRevoked
                            ? 'REVOKED'
                            : link.isUsed
                            ? 'CONSUMED'
                            : isExpired
                            ? 'EXPIRED'
                            : 'ACTIVE';

                          return (
                            <div
                              key={link.id}
                              className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={statusKey} />
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                                  {link.viewCount} views
                                </span>
                                {link.plainKey && (
                                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    {link.plainKey}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1 shrink-0">
                                <CopyButton
                                  textToCopy={getShareUrl(link.token)}
                                  label="URL"
                                  copiedLabel="Copied"
                                  className="px-2 py-0.5 text-[11px]"
                                />
                                <CopyButton
                                  textToCopy={getFullPackageText(link)}
                                  label="Pkg"
                                  copiedLabel="Copied"
                                  className="px-2 py-0.5 text-[11px]"
                                />

                                {/* Direct Revoke from Home */}
                                {!link.isRevoked && (
                                  <button
                                    onClick={() => handleRevokeFromHome(link.token)}
                                    disabled={revokingToken === link.token}
                                    className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                                    title="Revoke and remove link"
                                  >
                                    {revokingToken === link.token ? '...' : 'Revoke'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {note.shareLinks.length > 2 && (
                          <Link
                            href={`/notes/${note.id}`}
                            className="block text-center text-[11px] text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300 pt-0.5"
                          >
                            + {note.shareLinks.length - 2} more links...
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
