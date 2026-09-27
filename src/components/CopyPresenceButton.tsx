'use client';

import { useState } from 'react';

type PresencePayload = {
  date: string;         // DD/MM/YYYY
  meetingNumber: string;// e.g. "Meeting 1"
  sessionType: string;  // e.g. "Cambridge/ Adaptive Trial" or "IGCSE"
  grade: string;        // e.g. "IGCSE", "A level / AS Level", "SMP"
  subject: string;      // e.g. "Math", "Physics"
  place: string;        // "Online"
  notes: string;        // Topic summary
};

export default function CopyPresenceButton({ payload }: { payload: PresencePayload }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Format as Tab-Separated Values (TSV) for seamless Google Sheets paste
    // Columns: Date \t Class Session \t Type \t Grade \t Subject \t Place \t Notes
    const tsvRow = [
      payload.date,
      payload.meetingNumber,
      payload.sessionType,
      payload.grade,
      payload.subject,
      payload.place,
      payload.notes,
    ].join('\t');

    try {
      await navigator.clipboard.writeText(tsvRow);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 border ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
          : 'bg-[#faf9f6] text-[#3d6b52] border-[#ddd8cd] hover:bg-[#e8efe9]'
      }`}
      title="Copy tab-separated row to paste into Google Sheets presence"
    >
      {copied ? '✓ Copied for Sheets!' : '📋 Copy Row for Sheets'}
    </button>
  );
}