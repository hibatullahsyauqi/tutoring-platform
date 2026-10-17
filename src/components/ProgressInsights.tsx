import type { ExamPace } from '@/lib/exam-pace';
import type { MonthMomentum } from '@/lib/momentum';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const STATUS_STYLE = {
  ON_TRACK: { label: 'On track', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BEHIND: { label: 'Behind pace', chip: 'bg-red-50 text-red-700 border-red-200' },
  ALL_COVERED: { label: 'Fully covered', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NO_DATA: { label: 'No pace yet', chip: 'bg-white/50 text-slate-600 border-white/70' },
} as const;

function paceMessage(pace: Extract<ExamPace, { kind: 'active' }>): string {
  switch (pace.status) {
    case 'ALL_COVERED':
      return pace.toFirmUp > 0
        ? `Every topic has been covered. Use the remaining time to firm up ${pace.toFirmUp} weaker topic${pace.toFirmUp !== 1 ? 's' : ''} and practise past papers.`
        : 'Every topic has been covered and none are weak. Use the remaining time for past papers.';
    case 'NO_DATA':
      return `Log a few lessons and the pace will appear. To finish in time you need about ${fmt(pace.requiredPerWeek)} new topics a week.`;
    case 'ON_TRACK':
      return `At ${fmt(pace.actualPerWeek ?? 0)} new topics a week you meet the ${fmt(pace.requiredPerWeek)} needed, with time left for revision.`;
    case 'BEHIND':
      return pace.weeksNeeded !== null
        ? `You need ${fmt(pace.requiredPerWeek)} new topics a week but are doing ${fmt(pace.actualPerWeek ?? 0)}. At this pace the rest takes about ${Math.ceil(pace.weeksNeeded)} weeks, with ${fmt(pace.weeksLeft)} left.`
        : `You need ${fmt(pace.requiredPerWeek)} new topics a week, but no new topic was covered recently.`;
  }
}

export default function ProgressInsights({
  pace,
  momentum,
}: {
  pace: ExamPace;
  momentum: MonthMomentum[];
}) {
  const max = Math.max(1, ...momentum.map((m) => Math.max(m.covered, m.mastered)));
  const hasActivity = momentum.some((m) => m.covered > 0 || m.mastered > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* EXAM COUNTDOWN */}
      <section className="glass-panel rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Exam Countdown</h2>
        {pace.kind === 'none' && (
          <p className="text-xs text-slate-600">
            No exam date is set for this student, so there is no countdown or pace to show.
          </p>
        )}
        {pace.kind === 'passed' && (
          <p className="text-xs text-slate-600">
            The target exam date passed {pace.daysAgo} day{pace.daysAgo !== 1 ? 's' : ''} ago.
          </p>
        )}
        {pace.kind === 'active' && (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-2xl font-bold text-[#0f172a]">
                  {pace.daysLeft} <span className="text-sm font-semibold text-slate-600">days left</span>
                </div>
                <div className="text-[11px] text-slate-600">About {fmt(pace.weeksLeft)} weeks</div>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLE[pace.status].chip}`}
              >
                {STATUS_STYLE[pace.status].label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 glass-inset">
                <div className="text-[10px] text-slate-600">To cover</div>
                <div className="font-bold text-[#0f172a]">{pace.toCover}</div>
              </div>
              <div className="p-2 glass-inset">
                <div className="text-[10px] text-slate-600">To firm up</div>
                <div className="font-bold text-[#0f172a]">{pace.toFirmUp}</div>
              </div>
              <div className="p-2 glass-inset">
                <div className="text-[10px] text-slate-600">Needed / week</div>
                <div className="font-bold text-[#0f172a]">{fmt(pace.requiredPerWeek)}</div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{paceMessage(pace)}</p>
          </>
        )}
      </section>

      {/* MOMENTUM */}
      <section className="glass-panel rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Momentum</h2>
          <div className="flex gap-3 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#3d6b52]/40" /> New topics
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#3d6b52]" /> Mastered
            </span>
          </div>
        </div>
        {hasActivity ? (
          <div className="flex items-end gap-2 h-28">
            {momentum.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="flex items-end gap-1 h-20 w-full justify-center">
                  <div
                    className="w-3 bg-[#3d6b52]/40 rounded-t"
                    style={{ height: `${(m.covered / max) * 100}%` }}
                    title={`${m.covered} new topics`}
                  />
                  <div
                    className="w-3 bg-[#3d6b52] rounded-t"
                    style={{ height: `${(m.mastered / max) * 100}%` }}
                    title={`${m.mastered} mastered`}
                  />
                </div>
                <div className="text-[10px] text-slate-600">{m.label}</div>
                <div className="text-[10px] font-semibold text-[#0f172a]">
                  {m.covered}/{m.mastered}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600">
            Nothing to chart yet. New and mastered topics per month will appear as you log lessons.
          </p>
        )}
      </section>
    </div>
  );
}
