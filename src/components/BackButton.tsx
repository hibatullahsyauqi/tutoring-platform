import Link from 'next/link';

/** Round glass arrow that returns to the dashboard; the same on every page. */
export default function BackButton({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`glass-btn rail-icon ${className}`} aria-label="Back to dashboard" title="Back to dashboard">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
