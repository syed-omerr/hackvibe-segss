'use client';

import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';

interface ExcelDownloadButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'compact';
  filterParams?: { track?: string; year?: string; college?: string };
}

export default function ExcelDownloadButton({
  className = '',
  variant = 'primary',
  filterParams,
}: ExcelDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloaded(false);

    try {
      const query = new URLSearchParams();
      if (filterParams?.track && filterParams.track !== 'ALL') query.set('track', filterParams.track);
      if (filterParams?.year && filterParams.year !== 'ALL') query.set('year', filterParams.year);
      if (filterParams?.college && filterParams.college !== 'ALL') query.set('college', filterParams.college);

      const url = `/api/export/xlsx${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('Export request failed');
      }

      // Extract filename from header
      let filename = 'HackVibe_Registration_Details.xlsx';
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download Excel file. Please ensure you are logged in and try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        id="btn-download-excel-compact"
        onClick={handleDownload}
        disabled={downloading}
        title="Download latest 12-sheet Excel"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm ${
          downloaded
            ? 'bg-emerald-600 text-white'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-emerald-500/20'
        } ${className}`}
      >
        {downloading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : downloaded ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>{downloading ? 'Building...' : downloaded ? 'Downloaded!' : 'Excel'}</span>
      </button>
    );
  }

  return (
    <button
      id="btn-download-excel-main"
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg active:scale-95 ${
        downloaded
          ? 'bg-emerald-500 text-white ring-2 ring-emerald-400'
          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
      } ${downloading ? 'opacity-80 cursor-wait' : ''} ${className}`}
    >
      {downloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Generating 12 Sheets...</span>
        </>
      ) : downloaded ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>Downloaded Workbook!</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-emerald-100" />
          <span>Download Latest Excel</span>
        </>
      )}
    </button>
  );
}
