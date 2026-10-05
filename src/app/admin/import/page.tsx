'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  GraduationCap,
  Building,
  Loader2,
  FileUp,
} from 'lucide-react';
import { ImportPreviewResult } from '@/lib/excel-importer';

export default function ImportPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ importedCount: number; membersCount: number } | null>(null);

  const runPreview = async (useBaseline = false) => {
    setAnalyzing(true);
    setError(null);
    setPreview(null);
    setSuccessResult(null);

    try {
      let res: Response;
      if (useBaseline) {
        res = await fetch('/api/import/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useBaseline: true }),
        });
      } else {
        if (!file) {
          setError('Please select an Excel file (.xlsx) first.');
          setAnalyzing(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch('/api/import/preview', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse workbook');
      }

      setPreview(data.preview);
    } catch (err: any) {
      setError(err.message || 'Import preview failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || preview.newTeams.length === 0) return;

    setCommitting(true);
    setError(null);

    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: preview.newTeams }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transactional commit failed');
      }

      setSuccessResult({
        importedCount: data.importedCount,
        membersCount: data.membersCount,
      });
      setPreview(null);
    } catch (err: any) {
      setError(err.message || 'Commit failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-violet-400 uppercase tracking-wider mb-1">
          <UploadCloud className="w-4 h-4" />
          <span>Data Ingestion &amp; Seeding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Import Registration Workbook
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload or seed an existing workbook (.xlsx). The system parses the Team Wise sheet, resolves merged cells, runs dry-run checks, and commits transactionally.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Success state */}
      {successResult && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-8 text-center space-y-5 animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Import Committed Successfully!</h2>
            <p className="text-sm text-slate-300">
              Transactionally imported{' '}
              <span className="text-emerald-400 font-bold">{successResult.importedCount} teams</span> and{' '}
              <span className="text-emerald-400 font-bold">{successResult.membersCount} participants</span> into the database.
            </p>
            <p className="text-xs text-slate-500">
              All 12 sheets can now be downloaded or inspected in the Registry.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-violet-600/20"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/teams"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
            >
              Open Registry Table
            </Link>
          </div>
        </div>
      )}

      {/* Upload & Seed Cards */}
      {!successResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option A: 1-Click Baseline Seed */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Option A: Seed from Baseline File</h3>
                  <span className="text-[11px] font-mono text-violet-400">Hackathon Registration Details.xlsx</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Directly parse and import the baseline dataset present in the project workspace (214 teams, 639 participants, 12 sheets).
              </p>
            </div>

            <button
              id="btn-seed-baseline"
              type="button"
              onClick={() => runPreview(true)}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/30 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inspecting Baseline File...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Dry-Run Baseline File (214 Teams)</span>
                </>
              )}
            </button>
          </div>

          {/* Option B: Custom File Upload */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Option B: Upload Custom .xlsx</h3>
                  <span className="text-[11px] font-mono text-slate-400">Excel OpenXML Format</span>
                </div>
              </div>

              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            <button
              id="btn-upload-preview"
              type="button"
              onClick={() => runPreview(false)}
              disabled={!file || analyzing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-semibold text-xs border border-slate-700 transition-all disabled:opacity-40"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Uploaded File...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Analyze Uploaded File</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dry Run Preview Report */}
      {preview && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 animate-in fade-in duration-200 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Dry-Run Analysis Report</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Summary of parsed teams and validation checks prior to database commit.
              </p>
            </div>

            <button
              id="btn-commit-import"
              type="button"
              onClick={handleCommit}
              disabled={committing || preview.newTeams.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-40"
            >
              {committing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Committing Transaction...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Commit {preview.newTeams.length} Teams to Database</span>
                </>
              )}
            </button>
          </div>

          {/* Counts Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Teams Found</span>
              <p className="text-xl font-bold text-white mt-1">{preview.totalTeamsInFile}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Participants</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">{preview.totalMembersInFile}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-800/40">
              <span className="text-[10px] text-emerald-400 uppercase font-mono">Ready to Add</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">{preview.newTeams.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-amber-400 uppercase font-mono">Duplicates (Skip)</span>
              <p className="text-xl font-bold text-amber-400 mt-1">{preview.duplicateTeams.length}</p>
            </div>
          </div>

          {/* Breakdown Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Tracks */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono text-[11px]">
                <Cpu className="w-3.5 h-3.5 text-violet-400" />
                <span>Track Segregation</span>
              </span>
              <div className="space-y-1 font-mono text-slate-400">
                {Object.entries(preview.trackBreakdown).map(([track, count]) => (
                  <div key={track} className="flex justify-between">
                    <span className="truncate pr-2">{track.split(' ')[0]}:</span>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Years */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono text-[11px]">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Year Segregation</span>
              </span>
              <div className="space-y-1 font-mono text-slate-400">
                {Object.entries(preview.yearBreakdown).map(([year, count]) => (
                  <div key={year} className="flex justify-between">
                    <span>{year}:</span>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Colleges */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono text-[11px]">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                <span>College Segregation</span>
              </span>
              <div className="space-y-1 font-mono text-slate-400">
                {Object.entries(preview.collegeBreakdown).map(([col, count]) => (
                  <div key={col} className="flex justify-between">
                    <span>{col}:</span>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Warnings Log */}
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Data Quality Notes ({preview.warnings.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {preview.warnings.slice(0, 5).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
                {preview.warnings.length > 5 && (
                  <li className="text-slate-500 italic">
                    ...and {preview.warnings.length - 5} more informational warnings handled automatically.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Duplicates notice */}
          {preview.duplicateTeams.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-700/40 text-amber-300 text-xs space-y-2">
              <div className="font-semibold">
                Duplicate Registration IDs ({preview.duplicateTeams.length}) will be skipped to protect existing records:
              </div>
              <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-0.5">
                {preview.duplicateTeams.map((d) => (
                  <div key={d.registration_id}>
                    {d.registration_id} - {d.team_name}: {d.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
