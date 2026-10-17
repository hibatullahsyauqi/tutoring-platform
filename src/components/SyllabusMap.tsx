import {
  groupTopics,
  shortTitle,
  type Suggestion,
  type TopicProgress,
  type TopicState,
} from '@/lib/syllabus-progress';

const STATE_STYLE: Record<TopicState, { label: string; chip: string; dot: string }> = {
  UNTOUCHED: { label: 'Not covered', chip: 'bg-[#faf9f6] text-[#6f6b62] border-[#ddd8cd]', dot: 'bg-[#ddd8cd]' },
  STRUGGLING: { label: 'Struggling', chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  DEVELOPING: { label: 'Developing', chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  IMPROVING: { label: 'Improving', chip: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-400' },
  MASTERED: { label: 'Mastered', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const KIND_LABEL: Record<Suggestion['kind'], string> = {
  struggling: 'Fix',
  practice: 'Firm up',
  new: 'Introduce',
  recall: 'Recall',
};

const LEGEND: TopicState[] = ['UNTOUCHED', 'STRUGGLING', 'DEVELOPING', 'IMPROVING', 'MASTERED'];

export default function SyllabusMap({
  courseTitle,
  progress,
  suggestions,
}: {
  courseTitle: string;
  progress: TopicProgress[];
  suggestions: Suggestion[];
}) {
  if (progress.length === 0) {
    return (
      <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm text-xs text-[#6f6b62]">
        No syllabus topics are loaded for {courseTitle} yet, so there is no map to show.
      </section>
    );
  }

  const groups = groupTopics(progress);
  const counts = LEGEND.map((state) => ({
    state,
    n: progress.filter((t) => t.state === state).length,
  }));

  return (
    <div className="space-y-4">
      {/* SUGGESTED NEXT */}
      <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">Suggested Next</h2>
        {suggestions.length === 0 ? (
          <p className="text-xs text-[#6f6b62]">
            Nothing pressing. Everything covered is fresh, and no new topics are left to introduce.
          </p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map(({ topic, kind, reason }) => (
              <li
                key={topic.id}
                className="flex items-start gap-3 p-3 bg-[#faf9f6] border border-[#ddd8cd]/70 rounded-lg text-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#3d6b52] bg-[#e8efe9] px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                  {KIND_LABEL[kind]}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-[#2b2b28]">
                    {topic.code} {shortTitle(topic.title)}
                  </div>
                  <div className="text-[11px] text-[#6f6b62]">{reason}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SYLLABUS MAP */}
      <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">Syllabus Map</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {counts.map(({ state, n }) => (
              <span key={state} className="inline-flex items-center gap-1 text-[11px] text-[#6f6b62]">
                <span className={`w-2 h-2 rounded-full ${STATE_STYLE[state].dot}`} />
                {STATE_STYLE[state].label} {n}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {groups.map((group) => {
            const covered = group.topics.filter((t) => t.state !== 'UNTOUCHED').length;
            const needsAttention = group.topics.some((t) => t.state === 'STRUGGLING');
            return (
              <details key={group.label} className="group border border-[#ddd8cd] rounded-lg" open={needsAttention}>
                <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span className="font-bold text-[#2b2b28]">{group.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {group.topics.map((t) => (
                        <span key={t.id} className={`w-1.5 h-3 rounded-sm ${STATE_STYLE[t.state].dot}`} />
                      ))}
                    </span>
                    <span className="text-[11px] text-[#6f6b62]">
                      {covered}/{group.topics.length}
                    </span>
                  </span>
                </summary>
                <ul className="px-3 pb-3 pt-1 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {group.topics.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 p-2 bg-[#faf9f6] border border-[#ddd8cd]/60 rounded-md text-[11px]"
                    >
                      <span className="min-w-0 text-[#2b2b28]">
                        <span className="font-semibold">{t.code}</span> {shortTitle(t.title)}
                      </span>
                      <span
                        className={`flex-shrink-0 border font-bold px-1.5 py-0.5 rounded ${STATE_STYLE[t.state].chip}`}
                        title={
                          t.lastTaught
                            ? `Taught ${t.lessons}×, last ${t.lastTaught.toLocaleDateString('en-GB')}`
                            : 'Not taught yet'
                        }
                      >
                        {STATE_STYLE[t.state].label}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
