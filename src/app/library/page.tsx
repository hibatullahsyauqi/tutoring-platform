import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import LibraryView from './LibraryView';

export const dynamic = 'force-dynamic';

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6">
          <div>
            <Link href="/" className="text-xs font-semibold text-[#3d6b52] hover:underline mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Curated Teaching Vault & Bibliography
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Curate verified past papers, textbooks, and intuitive media for Cambridge, Edexcel, and IB.
            </p>
          </div>

          <span className="glass-pill text-xs font-bold uppercase tracking-wider px-3 py-1.5 self-start md:self-auto">
            {resources.length} Teaching Assets Indexed
          </span>
        </div>

        {/* 3RD-PARTY INSTITUTIONAL LAUNCHER (From Support Kit) */}
        <section className="glass-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Institutional 3rd-Party Materials
            </h2>
            <span className="text-[11px] text-[#3d6b52] font-semibold">Active Subscriptions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Save My Exams */}
            <div className="p-3 space-y-1.5 glass-inset">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0f172a]">Save My Exams</span>
                <span className="glass-chip text-[10px] text-[#2d523e] font-bold px-2 py-0.5">
                  IGCSE / A-Level / IB
                </span>
              </div>
              <p className="text-[11px] text-slate-600">Topic revision notes, model answers & mark schemes.</p>
              <div className="pt-1 flex items-center justify-between border-t border-black/10">
                <span className="text-[10px] font-mono text-slate-600">hisensei.k12@gmail.com</span>
                <a
                  href="https://www.savemyexams.com/igcse/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#3d6b52] hover:underline"
                >
                  Launch ↗
                </a>
              </div>
            </div>

            {/* Physics & Maths Tutor */}
            <div className="p-3 space-y-1.5 glass-inset">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0f172a]">PMT (Physics & Maths)</span>
                <span className="glass-chip text-[10px] text-[#2d523e] font-bold px-2 py-0.5">
                  Free Vault
                </span>
              </div>
              <p className="text-[11px] text-slate-600">Topical past paper packs & flashcards for CAIE/Edexcel.</p>
              <div className="pt-1 flex items-center justify-between border-t border-black/10">
                <span className="text-[10px] font-mono text-slate-600">Open Access</span>
                <a
                  href="https://www.physicsandmathstutor.com/past-papers/gcse-maths/cie-paper-4/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#3d6b52] hover:underline"
                >
                  Launch ↗
                </a>
              </div>
            </div>

            {/* Twinkl */}
            <div className="p-3 space-y-1.5 glass-inset">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0f172a]">Twinkl Primary</span>
                <span className="glass-badge bg-amber-50 text-amber-700 border-amber-200">
                  Primary / Checkpoint
                </span>
              </div>
              <p className="text-[11px] text-slate-600">Curriculum worksheets & visual aids for young learners.</p>
              <div className="pt-1 flex items-center justify-between border-t border-black/10">
                <span className="text-[10px] font-mono text-slate-600">Institutional</span>
                <a
                  href="https://www.twinkl.co.id/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#3d6b52] hover:underline"
                >
                  Launch ↗
                </a>
              </div>
            </div>

            {/* IXL Learning */}
            <div className="p-3 space-y-1.5 glass-inset">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0f172a]">IXL Learning</span>
                <span className="glass-badge bg-amber-50 text-amber-700 border-amber-200">
                  Diagnostic ELA/Math
                </span>
              </div>
              <p className="text-[11px] text-slate-600">Adaptive skill drills and baseline diagnostics.</p>
              <div className="pt-1 flex items-center justify-between border-t border-black/10">
                <span className="text-[10px] font-mono text-slate-600">k12dev</span>
                <a
                  href="https://www.ixl.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#3d6b52] hover:underline"
                >
                  Launch ↗
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CLIENT FILTERABLE VAULT & ADD FORM */}
        <LibraryView resources={formattedResources} courses={formattedCourses} />

      </div>
    </main>
  );
}