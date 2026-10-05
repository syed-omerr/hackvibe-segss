'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  Crown,
  Trash2,
  RotateCcw,
  Save,
  ArrowLeft,
  Sparkles,
  Info,
  Building,
  GraduationCap,
  Cpu,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  Team,
  Member,
  TRACK_OPTIONS,
  YEAR_OPTIONS,
  BRANCH_OPTIONS,
  Track,
  Year,
  CANONICAL_VIGNAN,
} from '@/lib/types';
import CollegeCombobox from '@/components/CollegeCombobox';
import AttendanceBadge from '@/components/AttendanceBadge';

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable Form State
  const [teamName, setTeamName] = useState('');
  const [track, setTrack] = useState<Track>('Artificial Intelligence (AI)');
  const [members, setMembers] = useState<Member[]>([]);
  const [collegesList, setCollegesList] = useState<string[]>([CANONICAL_VIGNAN]);

  useEffect(() => {
    // Load colleges
    fetch('/api/colleges')
      .then((res) => res.json())
      .then((data) => {
        if (data.colleges) {
          const names: string[] = data.colleges.map((c: any) => c.name);
          if (!names.includes(CANONICAL_VIGNAN)) names.unshift(CANONICAL_VIGNAN);
          setCollegesList(names);
        }
      })
      .catch((err) => console.error('Failed to load colleges', err));

    // Load team
    fetch(`/api/teams/${teamId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.team) {
          setTeam(data.team);
          setTeamName(data.team.team_name);
          setTrack(data.team.track);
          setMembers(data.team.members || []);
        } else {
          setError(data.error || 'Team not found');
        }
      })
      .catch((err) => setError(err.message || 'Failed to fetch team'))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleMemberChange = (index: number, field: keyof Member, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'role' && value === 'Leader') {
      updated.forEach((m, idx) => {
        if (idx !== index) m.role = 'Member';
      });
    }

    setMembers(updated);
  };

  const handleAddMember = () => {
    if (members.length >= 3) return;
    const leader = members.find((m) => m.role === 'Leader') || members[0];
    setMembers([
      ...members,
      {
        id: `new-${Date.now()}`,
        team_id: teamId,
        position: members.length + 1,
        name: '',
        role: 'Member',
        college: leader?.college || CANONICAL_VIGNAN,
        branch: leader?.branch || 'CSE',
        year: leader?.year || '2nd Year',
        phone: null,
        attendance: 'UNMARKED',
      },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length <= 1) return;
    const removedWasLeader = members[index].role === 'Leader';
    const remaining = members.filter((_, idx) => idx !== index);
    if (removedWasLeader && remaining.length > 0) {
      remaining[0].role = 'Leader';
    }
    setMembers(remaining);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      team_name: teamName,
      track,
      version: team.version, // Optimistic locking
      members: members.map((m) => ({
        id: m.id.startsWith('new-') ? undefined : m.id,
        name: m.name,
        role: m.role,
        college: m.college,
        branch: m.branch,
        year: m.year,
        phone: m.phone,
        attendance: m.attendance,
      })),
      overrideDuplicatePhone: true,
      overrideDuplicateName: true,
    };

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update team');
      }

      setTeam(data.team);
      setSuccessMsg('Team changes saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to soft-delete this team?')) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/teams');
      } else {
        alert('Failed to delete team.');
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleRestore = async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/restore`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error('Restore error', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <p className="text-sm text-slate-400 font-mono">Loading team details...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Team Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'This record does not exist.'}</p>
        <Link
          href="/teams"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          Return to Registry
        </Link>
      </div>
    );
  }

  const isDeleted = Boolean(team.deleted_at);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/teams"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-violet-400 font-bold">
                {team.registration_id}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">Version {team.version}</span>
              {isDeleted && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  SOFT DELETED
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
              {team.team_name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isDeleted ? (
            <button
              onClick={handleRestore}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Team</span>
            </button>
          ) : (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Segregation Explanation Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span>Track Sheet</span>
          </span>
          <p className="font-bold text-white text-sm">{team.track}</p>
          <p className="text-[11px] text-slate-500">Appears in sheet: {team.track.split(' ')[0]}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Year Sheet</span>
          </span>
          <p className="font-bold text-white text-sm">{team.highest_year} Sheet</p>
          <p className="text-[11px] text-slate-500">
            {team.is_mixed_year
              ? 'Placed by highest member year (Mixed team)'
              : 'All members in same year'}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
            <Building className="w-3.5 h-3.5 text-emerald-400" />
            <span>College Sheet</span>
          </span>
          <p className="font-bold text-white text-sm">{team.college_group}</p>
          <p className="text-[11px] text-slate-500">
            Decided by Leader&apos;s college ({team.college_group === 'VIGNAN' ? 'Canonical match' : 'External institution'})
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Team Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Team Name *
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Competition Track *
              </label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value as Track)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {TRACK_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Team Members ({members.length} / 3)</span>
            </h2>

            {members.length < 3 && (
              <button
                type="button"
                onClick={handleAddMember}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-medium border border-violet-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {members.map((member, index) => {
              const isLeader = member.role === 'Leader';
              return (
                <div
                  key={member.id || index}
                  className={`rounded-xl border p-4 transition-colors space-y-4 ${
                    isLeader
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500">#{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleMemberChange(index, 'role', isLeader ? 'Member' : 'Leader')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isLeader
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <Crown className={`w-3.5 h-3.5 ${isLeader ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span>{isLeader ? 'Leader' : 'Set as Leader'}</span>
                      </button>
                      <AttendanceBadge
                        memberId={member.id}
                        initialStatus={member.attendance}
                        memberName={member.name}
                        onStatusChange={(newStatus) => handleMemberChange(index, 'attendance', newStatus)}
                      />
                    </div>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Participant Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        College / Institution *
                      </label>
                      <CollegeCombobox
                        value={member.college}
                        onChange={(val) => handleMemberChange(index, 'college', val)}
                        colleges={collegesList}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Branch *
                      </label>
                      <select
                        value={member.branch}
                        onChange={(e) => handleMemberChange(index, 'branch', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        {BRANCH_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Year of Study *
                      </label>
                      <select
                        value={member.year}
                        onChange={(e) => handleMemberChange(index, 'year', e.target.value as Year)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="10 digits or leave empty"
                        value={member.phone || ''}
                        onChange={(e) => handleMemberChange(index, 'phone', e.target.value || null)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            href="/teams"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Back
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
