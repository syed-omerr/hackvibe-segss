'use client';

import React, { useState } from 'react';
import { AttendanceStatus } from '@/lib/types';
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';

interface AttendanceBadgeProps {
  memberId: string;
  initialStatus: AttendanceStatus;
  memberName?: string;
  onStatusChange?: (newStatus: AttendanceStatus) => void;
  readOnly?: boolean;
}

export default function AttendanceBadge({
  memberId,
  initialStatus,
  memberName,
  onStatusChange,
  readOnly = false,
}: AttendanceBadgeProps) {
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  const cycleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || loading) return;

    let nextStatus: AttendanceStatus = 'PRESENT';
    if (status === 'UNMARKED') nextStatus = 'PRESENT';
    else if (status === 'PRESENT') nextStatus = 'ABSENT';
    else nextStatus = 'UNMARKED';

    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update attendance');

      setStatus(nextStatus);
      if (onStatusChange) onStatusChange(nextStatus);
    } catch (err) {
      console.error('Attendance toggle error:', err);
      alert('Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStyle = () => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60';
      case 'ABSENT':
        return 'bg-rose-950/60 text-rose-300 border-rose-700/60 hover:bg-rose-900/60';
      case 'UNMARKED':
      default:
        return 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700/60';
    }
  };

  const getIcon = () => {
    if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    switch (status) {
      case 'PRESENT':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ABSENT':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'UNMARKED':
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'PRESENT':
        return 'Present';
      case 'ABSENT':
        return 'Absent';
      case 'UNMARKED':
      default:
        return 'Unmarked';
    }
  };

  return (
    <button
      type="button"
      onClick={cycleStatus}
      disabled={readOnly || loading}
      title={readOnly ? getLabel() : `Click to change attendance for ${memberName || 'member'}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${getBadgeStyle()} ${
        readOnly ? 'cursor-default' : 'cursor-pointer active:scale-95 shadow-sm'
      }`}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </button>
  );
}
