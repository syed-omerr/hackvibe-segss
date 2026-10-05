'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Trash2,
  Plus,
  Copy,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Info,
} from 'lucide-react';
import CollegeCombobox from '@/components/CollegeCombobox';
import {
  TRACK_OPTIONS,
  YEAR_OPTIONS,
  BRANCH_OPTIONS,
  Track,
  Year,
  CANONICAL_VIGNAN,
} from '@/lib/types';

interface MemberFormState {
  id?: string;
  name: string;
  role: 'Leader' | 'Member';
  college: string;
  branch: string;
  year: Year;
  phone: string;
  phoneUnavailable: boolean;
}

export default function NewTeamPage() {
  const router = useRouter();

  const [teamName, setTeamName] = useState('');
  const [track, setTrack] = useState<Track>('Artificial Intelligence (AI)');
  const [customRegId, setCustomRegId] = useState('');
  const [useCustomRegId, setUseCustomRegId] = useState(false);

  const [collegesList, setCollegesList] = useState<string[]>([CANONICAL_VIGNAN]);

  const [members, setMembers] = useState<MemberFormState[]>([
    {
      name: '',
      role: 'Leader',
      college: CANONICAL_VIGNAN,
      branch: 'CSE',
      year: '2nd Year',
      phone: '',
      phoneUnavailable: false,
    },
    {
      name: '',
      role: 'Member',
      college: CANONICAL_VIGNAN,
      branch: 'CSE',
      year: '2nd Year',
      phone: '',
      phoneUnavailable: false,
    },
    {
      name: '',
      role: 'Member',
      college: CANONICAL_VIGNAN,
      branch: 'CSE',
      year: '2nd Year',
      phone: '',
      phoneUnavailable: false,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});

  // Override Warnings
  const [pendingWarning, setPendingWarning] = useState<{
    type: 'PHONE' | 'NAME';
    message: string;
    overridePayload: any;
  } | null>(null);

  // Success State
  const [successInfo, setSuccessInfo] = useState<{
    registrationId: string;
    teamName: string;
    teamId: string;
  } | null>(null);

  // Load existing colleges list for combobox
  useEffect(() => {
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
  }, []);

  const handleMemberChange = (index: number, field: keyof MemberFormState, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };

    // If role changed to Leader, ensure all other members are 'Member'
    if (field === 'role' && value === 'Leader') {
      updated.forEach((m, idx) => {
        if (idx !== index) m.role = 'Member';
      });
    }

    setMembers(updated);
    setInlineErrors({});
  };

  const addMember = () => {
    if (members.length >= 3) return;
    const leader = members.find((m) => m.role === 'Leader') || members[0];
    setMembers([
      ...members,
      {
        name: '',
        role: 'Member',
        college: leader?.college || CANONICAL_VIGNAN,
        branch: leader?.branch || 'CSE',
        year: leader?.year || '2nd Year',
        phone: '',
        phoneUnavailable: false,
      },
    ]);
  };

  const removeMember = (index: number) => {
    if (members.length <= 1) return;
    const removedWasLeader = members[index].role === 'Leader';
    const remaining = members.filter((_, idx) => idx !== index);

    // If the removed member was leader, make the first remaining member leader
    if (removedWasLeader && remaining.length > 0) {
      remaining[0].role = 'Leader';
    }

    setMembers(remaining);
  };

  const copyLeaderDetails = () => {
    const leader = members.find((m) => m.role === 'Leader') || members[0];
    if (!leader) return;

    const updated = members.map((m) => ({
      ...m,
      college: leader.college,
      branch: leader.branch,
      year: leader.year,
    }));
    setMembers(updated);
  };

  const executeSubmit = async (overrides?: { overrideDuplicatePhone?: boolean; overrideDuplicateName?: boolean }) => {
    setSubmitting(true);
    setErrorMessage(null);
    setInlineErrors({});
    setPendingWarning(null);

    const payload = {
      team_name: teamName,
      track,
      registration_id: useCustomRegId && customRegId ? customRegId.trim() : undefined,
      members: members.map((m) => ({
        name: m.name,
        role: m.role,
        college: m.college,
        branch: m.branch,
        year: m.year,
        phone: m.phoneUnavailable ? null : m.phone,
        phoneUnavailable: m.phoneUnavailable,
      })),
      overrideDuplicatePhone: overrides?.overrideDuplicatePhone ?? false,
      overrideDuplicateName: overrides?.overrideDuplicateName ?? false,
    };

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.warning) {
        // Warning that can be overridden
        if (data.warning === 'DUPLICATE_PHONE') {
          setPendingWarning({
            type: 'PHONE',
            message: data.message,
            overridePayload: { ...overrides, overrideDuplicatePhone: true },
          });
        } else if (data.warning === 'DUPLICATE_TEAM_NAME') {
          setPendingWarning({
            type: 'NAME',
            message: data.message,
            overridePayload: { ...overrides, overrideDuplicateName: true },
          });
        }
        return;
      }

      if (!res.ok) {
        if (data.issues && Array.isArray(data.issues)) {
          const errs: Record<string, string> = {};
          data.issues.forEach((iss: any) => {
            const key = iss.path.join('.');
            errs[key] = iss.message;
          });
          setInlineErrors(errs);
          setErrorMessage('Please fix the highlighted errors below.');
        } else {
          setErrorMessage(data.error || 'Failed to submit team registration.');
        }
        return;
      }

      setSuccessInfo({
        registrationId: data.registration_id,
        teamName,
        teamId: data.team.id,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmit();
  };

  const resetForm = () => {
    setTeamName('');
    setCustomRegId('');
    setUseCustomRegId(false);
    setMembers([
      {
        name: '',
        role: 'Leader',
        college: CANONICAL_VIGNAN,
        branch: 'CSE',
        year: '2nd Year',
        phone: '',
        phoneUnavailable: false,
      },
      {
        name: '',
        role: 'Member',
        college: CANONICAL_VIGNAN,
        branch: 'CSE',
        year: '2nd Year',
        phone: '',
        phoneUnavailable: false,
      },
      {
        name: '',
        role: 'Member',
        college: CANONICAL_VIGNAN,
        branch: 'CSE',
        year: '2nd Year',
        phone: '',
        phoneUnavailable: false,
      },
    ]);
    setSuccessInfo(null);
    setPendingWarning(null);
    setErrorMessage(null);
    setInlineErrors({});
  };

  // SUCCESS BANNER STATE
  if (successInfo) {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-in zoom-in-95 duration-200">
        <div className="rounded-3xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-xl p-8 text-center space-y-6 shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Team Successfully Registered!
            </h2>
            <p className="text-sm text-slate-300">
              Assigned Registration ID for{' '}
              <span className="text-white font-semibold">&quot;{successInfo.teamName}&quot;</span>:
            </p>
            <div className="inline-block py-2 px-6 rounded-2xl bg-slate-900 border border-emerald-500/40 font-mono text-2xl font-bold text-emerald-400 tracking-wider shadow-inner my-2">
              {successInfo.registrationId}
            </div>
            <p className="text-xs text-slate-400">
              The team is immediately segregated into the respective Track, Highest Year, and College sheets.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={resetForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Another Team</span>
            </button>
            <Link
              href={`/teams/${successInfo.teamId}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all border border-slate-700"
            >
              <span>View Team Details</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/teams"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-sm transition-all"
            >
              <span>All Registry</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-violet-400 uppercase tracking-wider mb-1">
            <UserPlus className="w-4 h-4" />
            <span>Team Registration Form</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Register New HackVibe Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fill team information and member details. Atomic Registration ID generated automatically.
          </p>
        </div>

        <Link
          href="/teams"
          className="text-xs text-slate-400 hover:text-slate-200 font-mono flex items-center gap-1 self-start sm:self-auto"
        >
          <span>← Back to Registry</span>
        </Link>
      </div>

      {/* Warning Override Modal / Alert */}
      {pendingWarning && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3 animate-in fade-in-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-300">
                Duplicate Warning Check
              </h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {pendingWarning.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => executeSubmit(pendingWarning.overridePayload)}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              Confirm &amp; Override
            </button>
            <button
              type="button"
              onClick={() => setPendingWarning(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Cancel &amp; Edit
            </button>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Team Meta */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>1. Team Specifications</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Team Name */}
            <div>
              <label htmlFor="team_name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Team Name *
              </label>
              <input
                id="team_name"
                type="text"
                required
                placeholder="e.g. AI Mavericks"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setInlineErrors((prev) => ({ ...prev, team_name: '' }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 ${
                  inlineErrors['team_name'] ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {inlineErrors['team_name'] && (
                <p className="mt-1 text-xs text-rose-400">{inlineErrors['team_name']}</p>
              )}
            </div>

            {/* Track */}
            <div>
              <label htmlFor="track" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Competition Track *
              </label>
              <select
                id="track"
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

          {/* Registration ID Override Toggle */}
          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <label htmlFor="chk-custom-id" className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                <input
                  id="chk-custom-id"
                  type="checkbox"
                  checked={useCustomRegId}
                  onChange={(e) => setUseCustomRegId(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-violet-600 focus:ring-0"
                />
                <span>Override Registration ID (External platform ID, e.g. UCQP3790)</span>
              </label>
              {!useCustomRegId && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Default format: HV2-2026-OCT-NNNN (Auto-assigned)
                </span>
              )}
            </div>

            {useCustomRegId && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Enter external Registration ID..."
                  value={customRegId}
                  onChange={(e) => setCustomRegId(e.target.value)}
                  className="w-full max-w-sm px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-violet-300 uppercase focus:outline-none focus:border-violet-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Member Rows */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>2. Team Members ({members.length} / 3)</span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyLeaderDetails}
                title="Copy leader's College, Branch, and Year to all member rows"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Leader&apos;s College/Branch/Year</span>
              </button>

              {members.length < 3 && (
                <button
                  type="button"
                  onClick={addMember}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>
          </div>

          {inlineErrors['members'] && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {inlineErrors['members']}
            </div>
          )}

          <div className="space-y-4">
            {members.map((member, index) => {
              const isLeader = member.role === 'Leader';
              return (
                <div
                  key={index}
                  className={`rounded-xl border p-4 transition-colors relative ${
                    isLeader
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  {/* Row Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMemberChange(index, 'role', isLeader ? 'Member' : 'Leader')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          isLeader
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <Crown className={`w-3.5 h-3.5 ${isLeader ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span>{isLeader ? 'Leader' : 'Set as Leader'}</span>
                      </button>
                    </div>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        title="Remove member row"
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Member Input Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Participant Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 ${
                          inlineErrors[`members.${index}.name`] ? 'border-rose-500' : 'border-slate-800'
                        }`}
                      />
                      {inlineErrors[`members.${index}.name`] && (
                        <p className="mt-1 text-[11px] text-rose-400">{inlineErrors[`members.${index}.name`]}</p>
                      )}
                    </div>

                    {/* College Combobox */}
                    <div className="sm:col-span-2 lg:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        College / Institution *
                      </label>
                      <CollegeCombobox
                        value={member.college}
                        onChange={(val) => handleMemberChange(index, 'college', val)}
                        colleges={collegesList}
                        error={inlineErrors[`members.${index}.college`]}
                      />
                    </div>

                    {/* Branch */}
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

                    {/* Year of Study */}
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

                    {/* Phone Number with Unavailable Toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Mobile Number {!member.phoneUnavailable && '*'}
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={member.phoneUnavailable}
                            onChange={(e) => handleMemberChange(index, 'phoneUnavailable', e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-violet-600 focus:ring-0 w-3 h-3"
                          />
                          <span>Unavailable</span>
                        </label>
                      </div>

                      <input
                        type="tel"
                        disabled={member.phoneUnavailable}
                        placeholder={member.phoneUnavailable ? 'Not provided' : '10-digit mobile (e.g. 9876543210)'}
                        value={member.phoneUnavailable ? '' : member.phone}
                        onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed font-mono ${
                          inlineErrors[`members.${index}.phone`] ? 'border-rose-500' : 'border-slate-800'
                        }`}
                      />
                      {inlineErrors[`members.${index}.phone`] && (
                        <p className="mt-1 text-[11px] text-rose-400">{inlineErrors[`members.${index}.phone`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Submission Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            href="/teams"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>

          <button
            id="btn-register-submit"
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 active:scale-95 transition-all disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Team...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Submit &amp; Assign ID</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
