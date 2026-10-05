'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Search, Filter, RefreshCw, UserCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { AuditLogEntry } from '@/lib/types';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit?limit=200');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search.trim() ||
      (log.registration_id && log.registration_id.toLowerCase().includes(search.toLowerCase().trim())) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase().trim())) ||
      log.actor.toLowerCase().includes(search.toLowerCase().trim());

    const matchesEvent = selectedEvent === 'ALL' || log.event === selectedEvent;

    return matchesSearch && matchesEvent;
  });

  const getEventBadge = (event: string) => {
    switch (event) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'UPDATE':
        return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'RESTORE':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      case 'IMPORT':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'EXPORT':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'ATTENDANCE':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-violet-400 uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Audit Trail &amp; Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Security &amp; Action Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tamper-evident record of all create, update, delete, restore, attendance, import, and export operations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Log</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by Reg ID, actor, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-violet-500 font-mono"
        >
          <option value="ALL">All Event Types</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="RESTORE">RESTORE</option>
          <option value="ATTENDANCE">ATTENDANCE</option>
          <option value="IMPORT">IMPORT</option>
          <option value="EXPORT">EXPORT</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Timestamp (IST)</th>
                <th className="px-5 py-3.5">Event</th>
                <th className="px-5 py-3.5">Registration ID</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                      <span>Loading audit history...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour12: true,
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}{' '}
                      IST
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getEventBadge(
                          log.event
                        )}`}
                      >
                        {log.event}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold text-violet-300 whitespace-nowrap">
                      {log.registration_id || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-300 font-medium whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="px-5 py-3 text-slate-400 max-w-md truncate font-mono text-[11px]">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
