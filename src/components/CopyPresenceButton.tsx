'use client';

import { useState } from 'react';
import LiquidText from '@/components/LiquidText';
import { useDialog } from '@/components/DialogProvider';

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
  const dialog = useDialog();

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
      void dialog.notify({ message: 'Could not copy. Your browser blocked clipboard access.' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="glass-btn glass-btn-sm"
      title="Copy tab-separated row to paste into Google Sheets presence"
    >
      <LiquidText text={copied ? '✓ Copied' : '📋 Copy Row for Sheets'} />
    </button>
  );
}
