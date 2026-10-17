export type TimelineView = 'all' | 'logged' | 'pending' | 'cancelled';

export const TIMELINE_VIEWS: { value: TimelineView; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'logged', label: 'Logged' },
  { value: 'pending', label: 'To log / upcoming' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Lessons per timeline page. */
export const TIMELINE_PAGE_SIZE = 8;

/** Safety ceiling on how many of a student's lessons the dossier will read for its stats. */
export const SESSION_HISTORY_CAP = 3000;

export function parseTimelineView(value: string | undefined): TimelineView {
  return TIMELINE_VIEWS.some((v) => v.value === value) ? (value as TimelineView) : 'all';
}

export function matchesView(status: string, view: TimelineView): boolean {
  switch (view) {
    case 'all':
      return true;
    case 'logged':
      return status === 'COMPLETED';
    case 'pending':
      return status === 'SCHEDULED';
    case 'cancelled':
      return status !== 'COMPLETED' && status !== 'SCHEDULED';
  }
}
