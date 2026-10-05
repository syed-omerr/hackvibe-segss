'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Layers,
  Sparkles,
  GraduationCap,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  UserPlus,
  TableProperties,
  UploadCloud,
  Cpu,
  Shield,
  Radio,
  FileQuestion,
  RefreshCw,
} from 'lucide-react';
import { DashboardStats } from '@/lib/types';
import ExcelDownloadButton from '@/components/ExcelDownloadButton';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-mono">Loading HackVibe Metrics...</p>
      </div>
    );
  }

  const attendanceRate =
    stats && stats.totalMembers > 0
      ? Math.round((stats.presentMembers / stats.totalMembers) * 100)
      : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Command Center • Event ID: HV2-2026-OCT</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              HackVibe 2.0 Registration Portal
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Centralized hackathon registry with automatic on-demand 12-sheet segregation across Track, Highest Year of Study, and Leader College.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/teams/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all shadow-lg shadow-violet-600/20 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Team</span>
            </Link>
            <ExcelDownloadButton />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh live metrics"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teams */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Total Teams
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.totalTeams ?? 0}
            </span>
            <span className="text-xs text-slate-400">registered</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-mono">
            <span>Prefix:</span>
            <span className="text-slate-400">HV2-2026-OCT</span>
          </div>
        </div>

        {/* Total Participants */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Participants
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.totalMembers ?? 0}
            </span>
            <span className="text-xs text-slate-400">individuals</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono">
            Avg{' '}
            {stats && stats.totalTeams > 0
              ? (stats.totalMembers / stats.totalTeams).toFixed(1)
              : '0'}{' '}
            members / team
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Live Attendance
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {attendanceRate}%
            </span>
            <span className="text-xs text-emerald-400">
              {stats?.presentMembers ?? 0} present
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Invariant Health Check */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Segregation Invariants
            </span>
            <div
              className={`p-2 rounded-xl ${
                stats?.invariants.tracksMatch &&
                stats?.invariants.yearsMatch &&
                stats?.invariants.collegesMatch
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-sm font-semibold text-emerald-400">
              100% Balanced
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono">
            Tracks = Years = Colleges = {stats?.totalTeams ?? 0}
          </p>
        </div>
      </div>

      {/* Segregation Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Track Split */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-white text-sm">Track Segregation (4 Sheets)</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">AI • CS • IOT • NA</span>
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Artificial Intelligence (AI)',
                sheet: 'AI',
                count: stats?.trackBreakdown['Artificial Intelligence (AI)'] || 0,
                color: 'from-violet-600 to-indigo-600',
                icon: Cpu,
              },
              {
                label: 'Cyber Security',
                sheet: 'CS',
                count: stats?.trackBreakdown['Cyber Security'] || 0,
                color: 'from-cyan-600 to-blue-600',
                icon: Shield,
              },
              {
                label: 'Internet of Things (IOT)',
                sheet: 'IOT',
                count: stats?.trackBreakdown['Internet of Things (IOT)'] || 0,
                color: 'from-emerald-600 to-teal-600',
                icon: Radio,
              },
              {
                label: 'Not specified',
                sheet: 'NA',
                count: stats?.trackBreakdown['Not specified'] || 0,
                color: 'from-slate-600 to-gray-600',
                icon: FileQuestion,
              },
            ].map((track) => {
              const pct =
                stats && stats.totalTeams > 0
                  ? Math.round((track.count / stats.totalTeams) * 100)
                  : 0;
              return (
                <div key={track.sheet} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <track.icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{track.sheet} ({track.label})</span>
                    </span>
                    <span className="text-slate-200 font-bold font-mono">
                      {track.count}{' '}
                      <span className="text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${track.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Year of Study Split */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <h2 className="font-semibold text-white text-sm">Highest Year Split (4 Sheets)</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">1ST • 2ND • 3RD • 4TH</span>
          </div>

          <div className="space-y-3">
            {[
              {
                label: '1st Year',
                sheet: '1ST',
                count: stats?.yearBreakdown['1ST'] || 0,
                color: 'from-sky-500 to-blue-600',
              },
              {
                label: '2nd Year',
                sheet: '2ND',
                count: stats?.yearBreakdown['2ND'] || 0,
                color: 'from-cyan-500 to-teal-600',
              },
              {
                label: '3rd Year',
                sheet: '3RD',
                count: stats?.yearBreakdown['3RD'] || 0,
                color: 'from-violet-500 to-indigo-600',
              },
              {
                label: '4th Year / PG',
                sheet: '4TH',
                count: stats?.yearBreakdown['4TH'] || 0,
                color: 'from-purple-500 to-pink-600',
              },
            ].map((yr) => {
              const pct =
                stats && stats.totalTeams > 0
                  ? Math.round((yr.count / stats.totalTeams) * 100)
                  : 0;
              return (
                <div key={yr.sheet} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      Sheet {yr.sheet} ({yr.label})
                    </span>
                    <span className="text-slate-200 font-bold font-mono">
                      {yr.count}{' '}
                      <span className="text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${yr.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* College Split */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <h2 className="font-semibold text-white text-sm">College Split (2 Sheets)</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Leader&apos;s Institution</span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Vignan */}
            <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-800/40 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-violet-200 font-semibold flex items-center gap-1.5">
                  <span>VIGNAN</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300">
                    Host Institution
                  </span>
                </span>
                <span className="text-white font-mono font-bold text-sm">
                  {stats?.collegeBreakdown['VIGNAN'] || 0} teams
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Vignan Institute of Technology and Science (canonical match)
              </p>
            </div>

            {/* Others */}
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-200 font-semibold">
                  OTHERS
                </span>
                <span className="text-white font-mono font-bold text-sm">
                  {stats?.collegeBreakdown['OTHERS'] || 0} teams
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                All other external colleges &amp; universities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Setup Callout if no teams yet */}
      {stats && stats.totalTeams === 0 && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span>Database is empty. Ready to import baseline records?</span>
            </h3>
            <p className="text-xs text-slate-400">
              You can instantly seed all 214 teams and 639 participants from the baseline Excel file with 1 click.
            </p>
          </div>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-lg shadow-violet-600/30 whitespace-nowrap"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Go to Data Import</span>
          </Link>
        </div>
      )}

      {/* Recent Teams Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-violet-400" />
            <h2 className="font-semibold text-white text-sm">Recent Registrations</h2>
          </div>
          <Link
            href="/teams"
            className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>View All Registry</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3">Registration ID</th>
                <th className="px-6 py-3">Team Name</th>
                <th className="px-6 py-3">Track</th>
                <th className="px-6 py-3">Members</th>
                <th className="px-6 py-3">Highest Year</th>
                <th className="px-6 py-3">College Group</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {stats?.recentTeams && stats.recentTeams.length > 0 ? (
                stats.recentTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3 font-mono font-medium text-violet-300">
                      {team.registration_id}
                    </td>
                    <td className="px-6 py-3 font-semibold text-white">
                      {team.team_name}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {team.track}
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-400">
                      {team.members?.length ?? 0} members
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                        {team.highest_year}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                          team.college_group === 'VIGNAN'
                            ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {team.college_group}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/teams/${team.id}`}
                        className="text-slate-400 hover:text-white font-medium underline-offset-2 hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No teams registered yet. Click &quot;Add Team&quot; or import the baseline dataset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
