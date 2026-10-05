'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Building2, Plus, AlertCircle } from 'lucide-react';
import { CANONICAL_VIGNAN } from '@/lib/types';

interface CollegeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  colleges: string[];
  id?: string;
  error?: string;
}

export default function CollegeCombobox({
  value,
  onChange,
  colleges,
  id,
  error,
}: CollegeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCustomConfirmed, setIsCustomConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = colleges.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const isExactMatch = colleges.some(
    (c) => c.toLowerCase() === search.trim().toLowerCase()
  );

  const isCanonical = value.trim() === CANONICAL_VIGNAN;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        id={id}
        onClick={() => {
          setOpen(!open);
          if (!open) setSearch('');
        }}
        className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 border text-sm flex items-center justify-between cursor-pointer transition-colors ${
          error
            ? 'border-rose-500 ring-1 ring-rose-500/30'
            : open
            ? 'border-violet-500 ring-2 ring-violet-500/20'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <Building2 className={`w-4 h-4 shrink-0 ${isCanonical ? 'text-violet-400' : 'text-slate-400'}`} />
          <span className={`truncate ${value ? 'text-slate-100 font-medium' : 'text-slate-500'}`}>
            {value || 'Select or type college...'}
          </span>
          {isCanonical && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
              Vignan
            </span>
          )}
        </div>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-800">
            <input
              type="text"
              autoFocus
              placeholder="Search or enter college name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsCustomConfirmed(false);
              }}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-800/40">
            {filtered.map((college) => {
              const selected = value === college;
              const isVignan = college === CANONICAL_VIGNAN;
              return (
                <div
                  key={college}
                  onClick={() => {
                    onChange(college);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-colors ${
                    selected
                      ? 'bg-violet-600/20 text-violet-200'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{college}</span>
                    {isVignan && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Canonical
                      </span>
                    )}
                  </div>
                  {selected && <Check className="w-4 h-4 text-violet-400 shrink-0" />}
                </div>
              );
            })}

            {search.trim().length > 1 && !isExactMatch && (
              <div className="p-2 bg-slate-950/60 rounded-lg mt-1 border border-slate-800">
                <div className="text-xs text-amber-400 flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>College not in list. Confirm to add:</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onChange(search.trim());
                    setIsCustomConfirmed(true);
                    setOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-medium flex items-center justify-between"
                >
                  <span className="truncate">Use &quot;{search.trim()}&quot;</span>
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            )}

            {filtered.length === 0 && search.trim().length <= 1 && (
              <div className="py-4 text-center text-xs text-slate-500">
                Type at least 2 characters to search or add college.
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
