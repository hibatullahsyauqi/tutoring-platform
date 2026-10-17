import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import LibraryView from './LibraryView';

export const dynamic = 'force-dynamic';

const PARTNERS = [
  {
    name: 'Save My Exams',
    tag: 'IGCSE / A-Level / IB',
    blurb: 'Topic revision notes, model answers & mark schemes.',
    account: 'hisensei.k12@gmail.com',
    url: 'https://www.savemyexams.com/igcse/',
  },
  {
    name: 'PMT (Physics & Maths)',
    tag: 'Free Vault',
    blurb: 'Topical past paper packs & flashcards for CAIE/Edexcel.',
    account: 'Open Access',
    url: 'https://www.physicsandmathstutor.com/past-papers/gcse-maths/cie-paper-4/',
  },
  {
    name: 'Twinkl Primary',
    tag: 'Primary / Checkpoint',
    blurb: 'Curriculum worksheets & visual aids for young learners.',
    account: 'Institutional',
    url: 'https://www.twinkl.co.id/',
  },
  {
    name: 'IXL Learning',
    tag: 'Diagnostic ELA/Math',
    blurb: 'Adaptive skill drills and baseline diagnostics.',
    account: 'k12dev',
    url: 'https://www.ixl.com/',
  },
];

export default async function LibraryPage() {
  const resourcesQuery = prisma.resource.findMany({
    include: {
      course: {
        include: {
          board: true,
        },
      },
      topic: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const coursesQuery = prisma.course.findMany({
    include: {
      board: true,
      topics: {
        orderBy: { code: 'asc' },
      },
    },
    orderBy: [
      { board: { code: 'asc' } },
      { level: 'asc' },
      { title: 'asc' },
    ],
  });

  const [resources, courses] = await Promise.all([resourcesQuery, coursesQuery]);

  const formattedResources = resources.map((r) => ({
    id: r.id,
    title: r.title,
    authorOrPublisher: r.authorOrPublisher || 'Standard Reference',
    resourceType: r.resourceType,
    url: r.url,
    locationDetails: r.locationDetails,
    courseTitle: `${r.course.title} (${r.course.subjectCode})`,
    boardCode: r.course.board.code,
    topicCode: r.topic?.code || null,
    topicTitle: r.topic?.title || null,
  }));

  const formattedCourses = courses.map((c) => ({
    id: c.id,
    title: `${c.title} (${c.subjectCode}) — ${c.board.code}`,
    topics: c.topics.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
    })),
  }));

  return (
    <main className="min-h-screen text-[#0f172a] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="glass-panel p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="glass-pill text-[11px] font-bold uppercase tracking-wider px-3 py-1 inline-block">
              Teaching Vault
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] mt-2">
              Curated Teaching Vault & Bibliography
            </h1>
            <p className="text-xs font-medium text-slate-700 mt-0.5">
              Verified past papers, textbooks and intuitive media for Cambridge, Edexcel and IB ·{' '}
              <span className="font-bold text-[#0f172a]">{resources.length}</span> assets indexed
            </p>
          </div>
          <Link href="/" className="glass-btn self-start md:self-auto">
            ← Dashboard
          </Link>
        </header>

        {/* 3RD-PARTY INSTITUTIONAL LAUNCHER */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-3">
            <h2 className="text-base font-bold text-[#0f172a]">Institutional 3rd-Party Materials</h2>
            <span className="glass-pill text-xs font-bold px-2.5 py-0.5">Active Subscriptions</span>
          </div>

          <div className="divide-y divide-black/5">
            {PARTNERS.map((p) => (
              <div
                key={p.name}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#0f172a]">{p.name}</h3>
                    <span className="glass-chip px-2 py-0.5 text-[11px] font-bold text-[#2d523e]">{p.tag}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{p.blurb}</p>
                  <p className="text-[11px] font-mono text-slate-600">{p.account}</p>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-btn self-start sm:self-auto"
                >
                  Launch ↗
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* CLIENT FILTERABLE VAULT & ADD FORM */}
        <LibraryView resources={formattedResources} courses={formattedCourses} />

      </div>
    </main>
  );
}