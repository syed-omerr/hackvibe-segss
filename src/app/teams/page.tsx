'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  UserPlus,
  Trash2,
  RefreshCw,
  Crown,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Team, TRACK_OPTIONS, YEAR_OPTIONS } from '@/lib/types';
import AttendanceBadge from '@/components/AttendanceBadge';
import ExcelDownloadButton from '@/components/ExcelDownloadButton';

export default function RegistryPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedCollege, setSelectedCollege] = useState('ALL');
  const [selectedAttendance, setSelectedAttendance] = useState('ALL');
  const [showDeleted, setShowDeleted] = useState(false);

  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (selectedTrack !== 'ALL') query.set('track', selectedTrack);
      if (selectedYear !== 'ALL') query.set('year', selectedYear);
      if (selectedCollege !== 'ALL') query.set('college', selectedCollege);
      if (selectedAttendance !== 'ALL') query.set('attendance', selectedAttendance);
      if (showDeleted) query.set('includeDeleted', 'true');

      const res = await fetch(`/api/teams?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list: Team[] = data.teams || [];

        // Check if there are any locally registered teams that should be present
        if (typeof window !== 'undefined') {
          try {
            const delStored = localStorage.getItem('hackvibe_deleted_teams');
            const deletedSet = new Set<string>(delStored ? JSON.parse(delStored) : []);

            // If not showing deleted, filter out any deleted IDs
            if (!showDeleted && deletedSet.size > 0) {
              list = list.filter(
                (t) => !deletedSet.has(t.id) && !deletedSet.has(t.registration_id)
              );
            } else if (showDeleted && deletedSet.size > 0) {
              list = list.map((t) =>
                deletedSet.has(t.id) || deletedSet.has(t.registration_id)
                  ? { ...t, deleted_at: t.deleted_at || new Date().toISOString() }
                  : t
              );
            }

            const stored = localStorage.getItem('hackvibe_custom_teams');
            if (stored) {
              const customTeams: Team[] = JSON.parse(stored);
              const existingRegIds = new Set(list.map((t) => t.registration_id.toUpperCase()));
              const missingTeams = customTeams.filter(
                (ct) =>
                  ct.registration_id &&
                  !existingRegIds.has(ct.registration_id.toUpperCase()) &&
                  !deletedSet.has(ct.id) &&
                  !deletedSet.has(ct.registration_id)
              );

              if (missingTeams.length > 0) {
                // Prepend missing teams (they are recent additions)
                list = [...missingTeams, ...list];

                // Trigger self-healing background sync to server
                missingTeams.forEach((mt) => {
                  fetch('/api/teams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      team_name: mt.team_name,
                      track: mt.track,
                      registration_id: mt.registration_id,
                      members: mt.members,
                      overrideDuplicatePhone: true,
                      overrideDuplicateName: true,
                    }),
                  }).catch(() => {});
                });
              }
            }
          } catch (e) {
            console.warn('LocalStorage custom teams merge error', e);
          }
        }

        setTeams(list);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedTrack, selectedYear, selectedCollege, selectedAttendance, showDeleted]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to soft-delete team "${name}"? It can be restored later.`)) {
      return;
    }

    // Optimistic UI update immediately
    setTeams((prev) => {
      if (!showDeleted) {
        return prev.filter((t) => t.id !== id && t.registration_id !== id);
      } else {
        return prev.map((t) =>
          t.id === id || t.registration_id === id
            ? { ...t, deleted_at: new Date().toISOString() }
            : t
        );
      }
    });

    // Clean up localStorage immediately so it doesn't resurrect
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hackvibe_custom_teams');
        if (stored) {
          const customTeams: Team[] = JSON.parse(stored);
          const updated = customTeams.filter((t) => t.id !== id && t.registration_id !== id);
          localStorage.setItem('hackvibe_custom_teams', JSON.stringify(updated));
        }

        const delStored = localStorage.getItem('hackvibe_deleted_teams');
        const deletedSet: string[] = delStored ? JSON.parse(delStored) : [];
        if (!deletedSet.includes(id)) {
          deletedSet.push(id);
          localStorage.setItem('hackvibe_deleted_teams', JSON.stringify(deletedSet));
        }
      } catch (e) {
        console.warn('LocalStorage delete cleanup error', e);
      }
    }

    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTeams();
      } else {
        alert('Failed to delete team.');
        fetchTeams();
      }
    } catch (err) {
      console.error('Delete error:', err);
      fetchTeams();
    }
  };

  const handleRestore = async (id: string) => {
    // Optimistic UI update immediately
    setTeams((prev) =>
      prev.map((t) =>
        t.id === id || t.registration_id === id ? { ...t, deleted_at: null } : t
      )
    );

    // Remove from deleted set in localStorage
    if (typeof window !== 'undefined') {
      try {
        const delStored = localStorage.getItem('hackvibe_deleted_teams');
        if (delStored) {
          const deletedSet: string[] = JSON.parse(delStored);
          const updated = deletedSet.filter((dId) => dId !== id);
          localStorage.setItem('hackvibe_deleted_teams', JSON.stringify(updated));
        }
      } catch {}
    }

    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(id)}/restore`, { method: 'POST' });
      if (res.ok) {
        fetchTeams();
      } else {
        alert('Failed to restore team.');
        fetchTeams();
      }
    } catch (err) {
      console.error('Restore error:', err);
      fetchTeams();
    }
  };

  const handleExportCsv = () => {
    window.open('/api/export/csv', '_blank');
  };

  const toggleExpand = (id: string) => {
    setExpandedTeamId(expandedTeamId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Teams Registry</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
              {teams.length} {teams.length === 1 ? 'team' : 'teams'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse, search, edit, mark 1-tap attendance, and download segregated Excel data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/teams/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Team</span>
          </Link>

          <ExcelDownloadButton
            variant="compact"
            filterParams={{
              track: selectedTrack,
              year: selectedYear,
              college: selectedCollege,
            }}
          />

          <button
            onClick={handleExportCsv}
            title="Export flat members table as CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={fetchTeams}
            title="Refresh list"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by team name, member name, phone, registration ID, or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Track Filter */}
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Tracks</option>
              {TRACK_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Years</option>
              <option value="1ST">1ST Year</option>
              <option value="2ND">2ND Year</option>
              <option value="3RD">3RD Year</option>
              <option value="4TH">4TH Year</option>
            </select>

            {/* College Group Filter */}
            <select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Colleges</option>
              <option value="VIGNAN">VIGNAN (Canonical)</option>
              <option value="OTHERS">OTHERS (External)</option>
            </select>

            {/* Attendance Filter */}
            <select
              value={selectedAttendance}
              onChange={(e) => setSelectedAttendance(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Attendance</option>
              <option value="PRESENT">Has Present</option>
              <option value="ABSENT">Has Absent</option>
              <option value="UNMARKED">Unmarked</option>
            </select>
          </div>
        </div>

        {/* Show Deleted Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[11px] text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-violet-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Include soft-deleted teams</span>
          </label>

          {(selectedTrack !== 'ALL' || selectedYear !== 'ALL' || selectedCollege !== 'ALL' || selectedAttendance !== 'ALL' || search.trim()) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedTrack('ALL');
                setSelectedYear('ALL');
                setSelectedCollege('ALL');
                setSelectedAttendance('ALL');
              }}
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Teams Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Reg ID</th>
                <th className="px-4 py-3.5">Team Name</th>
                <th className="px-4 py-3.5">Track</th>
                <th className="px-4 py-3.5">Segregation</th>
                <th className="px-4 py-3.5">Members &amp; Attendance</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                      <span>Loading teams...</span>
                    </div>
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm text-slate-400">No teams found matching the filters.</p>
                    {(selectedTrack !== 'ALL' || selectedYear !== 'ALL' || selectedCollege !== 'ALL' || selectedAttendance !== 'ALL' || search.trim()) && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setSelectedTrack('ALL');
                          setSelectedYear('ALL');
                          setSelectedCollege('ALL');
                          setSelectedAttendance('ALL');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
                      >
                        Reset filters to view all teams
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                teams.map((team) => {
                  const isExpanded = expandedTeamId === team.id;
                  const isDeleted = Boolean(team.deleted_at);

                  return (
                    <React.Fragment key={team.id}>
                      <tr
                        onClick={() => toggleExpand(team.id)}
                        className={`cursor-pointer transition-colors ${
                          isDeleted
                            ? 'bg-rose-950/10 opacity-70'
                            : isExpanded
                            ? 'bg-slate-800/50'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Reg ID */}
                        <td className="px-4 py-3 font-mono font-medium text-violet-300 whitespace-nowrap">
                          {team.registration_id}
                          {isDeleted && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              DELETED
                            </span>
                          )}
                        </td>

                        {/* Team Name */}
                        <td className="px-4 py-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{team.team_name}</span>
                            {team.is_mixed_year && (
                              <span
                                title="Team members are from different years"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono"
                              >
                                Mixed-Year
                              </span>
                            )}
                            {team.is_mixed_college && (
                              <span
                                title="Team members are from different colleges"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono"
                              >
                                Mixed-College
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Track */}
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {team.track}
                        </td>

                        {/* Segregation Badges */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                              {team.highest_year}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                                team.college_group === 'VIGNAN'
                                  ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {team.college_group}
                            </span>
                          </div>
                        </td>

                        {/* Member Attendance Pills */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(team.members || []).map((m) => (
                              <div key={m.id} className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-300 font-medium">
                                  {m.name.split(' ')[0]}:
                                </span>
                                <AttendanceBadge
                                  memberId={m.id}
                                  initialStatus={m.attendance}
                                  memberName={m.name}
                                />
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/teams/${team.registration_id || team.id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                            >
                              Edit
                            </Link>

                            {isDeleted ? (
                              <button
                                onClick={() => handleRestore(team.id)}
                                title="Restore team"
                                className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(team.id, team.team_name)}
                                title="Soft delete team"
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => toggleExpand(team.id)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Team Member Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
                                <span>Members Breakdown ({team.members?.length || 0})</span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  Registered: {new Date(team.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(team.members || []).map((m) => (
                                  <div
                                    key={m.id}
                                    className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                                        {m.role === 'Leader' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                                        <span>{m.name}</span>
                                      </span>
                                      <AttendanceBadge
                                        memberId={m.id}
                                        initialStatus={m.attendance}
                                        memberName={m.name}
                                      />
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate" title={m.college}>
                                      {m.college}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                      <span>
                                        {m.branch} • {m.year}
                                      </span>
                                      <span>{m.phone || 'No phone'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
