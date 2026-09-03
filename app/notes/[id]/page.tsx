'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { 
  ArrowLeft, Clock, Eye, Copy, Check, ExternalLink, 
  ShieldAlert, KeyRound, Share2, Flame, Plus, BookOpen, 
  Pencil, Save, X, CheckCircle2, Calendar 
} from 'lucide-react';
import { StatusBadge, StatusType } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';

interface AccessLog {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  accessedAt: string;
}

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
  accessLogs?: AccessLog[];
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  shareLinks: ShareLink[];
}

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showNewLinkModal, setShowNewLinkModal] = useState(false);
  const [newShareType, setNewShareType] = useState<'ONE_TIME' | 'TIME_BASED'>('TIME_BASED');
  const [newAccessType, setNewAccessType] = useState<'PUBLIC' | 'PROTECTED'>('PUBLIC');
  const [newCustomPassword, setNewCustomPassword] = useState('');
  const [newExpirySelection, setNewExpirySelection] = useState<string>('24');
  const [newCustomDateTime, setNewCustomDateTime] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const [revokeModalToken, setRevokeModalToken] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchNote = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${id}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to load note');
      } else {
        setNote(data.data);
        setEditTitle(data.data.title);
        setEditContent(data.data.content);
      }
    } catch {
      setError('An error occurred while fetching note details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNote();
  }, [id]);

  const handleSaveNote = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNote((prev) => (prev ? { ...prev, title: data.data.title, content: data.data.content } : data.data));
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to save changes');
      }
    } catch {
      alert('Error updating note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAdditionalLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newExpirySelection === 'custom' && !newCustomDateTime) {
      alert('Please select a custom expiration date and time');
      return;
    }

    setIsCreatingLink(true);
    try {
      const payload: any = {
        shareType: newShareType,
        accessType: newAccessType,
        customPassword: newAccessType === 'PROTECTED' ? newCustomPassword : null,
      };

      if (newExpirySelection === 'custom') {
        payload.customExpiresAt = new Date(newCustomDateTime).toISOString();
      } else {
        payload.expiresInHours = Number(newExpirySelection);
      }

      const res = await fetch(`/api/notes/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewLinkModal(false);
        setNewCustomPassword('');
        fetchNote();
      } else {
        alert(data.error || 'Failed to create share link');
      }
    } catch {
      alert('Error creating share link');
    } finally {
      setIsCreatingLink(false);
    }
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

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  const confirmRevoke = async () => {
    if (!revokeModalToken) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/api/share/${revokeModalToken}/revoke`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRevokeModalToken(null);
        fetchNote();
      } else {
        alert(data.error || 'Failed to revoke link');
      }
    } catch {
      alert('Error revoking share link');
    } finally {
      setIsRevoking(false);
    }
  };

  const metadata = note ? {
    words: note.content.trim() ? note.content.trim().split(/\s+/).length : 0,
    chars: note.content.length,
    readTime: Math.max(1, Math.ceil((note.content.trim().split(/\s+/).length || 1) / 200)),
    totalViews: note.shareLinks.reduce((acc, l) => acc + l.viewCount, 0),
  } : null;

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Link
              href="/"
              className="p-1.5 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:border-slate-300 dark:hover:border-zinc-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">
                {note ? note.title : 'Note Details'}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                {note ? `Created ${new Date(note.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}` : 'Loading...'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing && note && (
              <button
                onClick={() => {
                  setEditTitle(note.title);
                  setEditContent(note.content);
                  setIsEditing(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5 text-indigo-500" />
                <span>Edit Note</span>
              </button>
            )}

            <button
              onClick={() => setShowNewLinkModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Create Link</span>
            </button>
          </div>
        </div>

        {metadata && note && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-3 text-xs shadow-sm">
            <div className="border-r border-slate-100 dark:border-zinc-800/80 pr-2">
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">Words</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block">{metadata.words} words</span>
            </div>
            <div className="sm:border-r border-slate-100 dark:border-zinc-800/80 pr-2">
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">Reading Time</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block">~{metadata.readTime} min</span>
            </div>
            <div className="border-r border-slate-100 dark:border-zinc-800/80 pr-2">
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">Total Views</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{metadata.totalViews} views</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">Active Links</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 block">{note.shareLinks.length} links</span>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-lg flex items-center space-x-2 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>Note saved successfully.</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-500 dark:text-zinc-500 text-xs">Loading note details...</div>
        ) : error || !note ? (
          <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-300 text-xs">
            {error || 'Note not found'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Editing Note
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded text-xs hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={isSaving}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="h-3 w-3" />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full max-w-full px-3 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Content
                    </label>
                    <textarea
                      required
                      rows={10}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full max-w-full px-3 py-2 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg text-slate-900 dark:text-zinc-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                      Content
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditTitle(note.title);
                          setEditContent(note.content);
                          setIsEditing(true);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center space-x-1 mr-1 cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <CopyButton
                        textToCopy={note.content}
                        label="Copy"
                        className="px-2 py-0.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-xs font-mono text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed py-1">
                    {note.content}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Share Links ({note.shareLinks.length})</h2>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500">Active links grant access to this note only</p>
                </div>
                <button
                  onClick={() => setShowNewLinkModal(true)}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Link</span>
                </button>
              </div>

              <div className="space-y-3">
                {note.shareLinks.length === 0 ? (
                  <div className="py-6 text-center space-y-1.5">
                    <p className="text-xs text-slate-500 dark:text-zinc-500">No share links generated yet.</p>
                    <button
                      onClick={() => setShowNewLinkModal(true)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-medium underline cursor-pointer"
                    >
                      Create a share link
                    </button>
                  </div>
                ) : (
                  note.shareLinks.map((link) => {
                    const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                    const remaining = getTimeRemaining(link.expiresAt);

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
                        className="bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg p-3 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800">
                              {link.token.slice(0, 8)}...
                            </span>
                            <StatusBadge status={statusKey} />
                            <StatusBadge status={link.shareType} />
                            <StatusBadge status={link.accessType} />
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800">
                              {link.viewCount} views
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                            <span>
                              {link.expiresAt ? (
                                <>
                                  Expires: {new Date(link.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                                  {remaining && !isExpired && !link.isUsed && !link.isRevoked && (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">({remaining})</span>
                                  )}
                                </>
                              ) : (
                                'No expiration limit'
                              )}
                            </span>
                          </div>

                          {link.plainKey && (
                            <div className="flex items-center space-x-1 font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                              <KeyRound className="h-3 w-3" />
                              <span>Key: <strong>{link.plainKey}</strong></span>
                            </div>
                          )}
                        </div>

                        {link.accessLogs && link.accessLogs.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">
                              Access History ({link.accessLogs.length}):
                            </span>
                            <div className="max-h-28 overflow-y-auto space-y-1">
                              {link.accessLogs.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between bg-white dark:bg-zinc-900 px-2 py-1 rounded text-[11px] text-slate-700 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-800/50"
                                >
                                  <div className="flex items-center space-x-2 truncate">
                                    <span className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                                      log.status === 'SUCCESS'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : log.status === 'WRONG_PASSWORD'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}>
                                      {log.status}
                                    </span>
                                    <span className="font-mono text-slate-800 dark:text-zinc-300">{log.ipAddress || '127.0.0.1'}</span>
                                    <span className="text-slate-500 dark:text-zinc-500 truncate max-w-[150px]">
                                      {log.userAgent?.split(' ')[0] || 'Browser'}
                                    </span>
                                  </div>
                                  <span className="text-slate-500 dark:text-zinc-500 shrink-0 text-[10px]">
                                    {new Date(log.accessedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                          <div className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 truncate">
                            URL: <span className="text-slate-900 dark:text-zinc-200">{getShareUrl(link.token)}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <CopyButton
                              textToCopy={getShareUrl(link.token)}
                              label="URL"
                              className="px-2 py-0.5 text-xs"
                            />

                            <CopyButton
                              textToCopy={getFullPackageText(link)}
                              label="Package"
                              className="px-2 py-0.5 text-xs"
                            />

                            <Link
                              href={`/share/${link.token}`}
                              target="_blank"
                              className="p-1 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-transparent rounded transition"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>

                            {!link.isRevoked && (
                              <button
                                onClick={() => setRevokeModalToken(link.token)}
                                className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded text-xs font-medium flex items-center space-x-1 transition cursor-pointer"
                              >
                                <ShieldAlert className="h-3 w-3" />
                                <span>Revoke</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {showNewLinkModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-xl max-w-md w-full max-w-[calc(100vw-2rem)] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Share2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Create Share Link</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewLinkModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAdditionalLink} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Access Protection
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAccessType('PUBLIC')}
                      className={`p-2 rounded-lg border text-xs font-semibold transition text-center cursor-pointer ${
                        newAccessType === 'PUBLIC'
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAccessType('PROTECTED')}
                      className={`p-2 rounded-lg border text-xs font-semibold transition text-center cursor-pointer ${
                        newAccessType === 'PROTECTED'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Password Protected
                    </button>
                  </div>
                </div>

                {newAccessType === 'PROTECTED' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Custom Key (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCustomPassword}
                      onChange={(e) => setNewCustomPassword(e.target.value)}
                      placeholder="Leave blank for random key"
                      className="w-full max-w-full px-3 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Duration Setting
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewShareType('TIME_BASED')}
                      className={`p-2 rounded-lg border text-xs font-semibold transition text-center cursor-pointer ${
                        newShareType === 'TIME_BASED'
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Time-Based
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewShareType('ONE_TIME')}
                      className={`p-2 rounded-lg border text-xs font-semibold transition text-center cursor-pointer ${
                        newShareType === 'ONE_TIME'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-200'
                          : 'bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      One-Time Read
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                    Expires In
                  </label>
                  <div className="w-full max-w-full overflow-hidden">
                    <select
                      value={newExpirySelection}
                      onChange={(e) => setNewExpirySelection(e.target.value)}
                      className="w-full max-w-full truncate px-3 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="1">1 hour</option>
                      <option value="6">6 hours</option>
                      <option value="24">24 hours (1 day)</option>
                      <option value="72">72 hours (3 days)</option>
                      <option value="168">7 days (1 week)</option>
                      <option value="custom">Custom Date &amp; Time...</option>
                    </select>
                  </div>

                  {newExpirySelection === 'custom' && (
                    <div className="p-2.5 bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700 rounded-lg space-y-1">
                      <label className="block text-[10px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Exact expiration date &amp; time</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        min={minDateTime}
                        value={newCustomDateTime}
                        onChange={(e) => setNewCustomDateTime(e.target.value)}
                        className="w-full max-w-full px-2.5 py-1.5 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewLinkModal(false)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded text-xs font-medium hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingLink}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingLink ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {revokeModalToken && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121215] border border-rose-500/30 rounded-xl max-w-sm w-full max-w-[calc(100vw-2rem)] p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center space-x-2 text-rose-500">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Revoke Share Link</h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Revoking this link will permanently remove it from your notes and disable access for anyone using this URL.
              </p>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeModalToken(null)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRevoke}
                  disabled={isRevoking}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  <span>{isRevoking ? 'Revoking...' : 'Revoke & Remove'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
