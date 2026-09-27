import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import LibraryView from './LibraryView';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const resources = await prisma.resource.findMany({
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

  const courses = await prisma.course.findMany({
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
    <main className="min-h-screen bg-[#faf9f6] text-[#2b2b28] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ddd8cd] pb-6">
          <div>
            <Link href="/" className="text-xs font-semibold text-[#3d6b52] hover:underline mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#2b2b28]">
              Curated Teaching Vault & Bibliography
            </h1>
            <p className="text-xs text-[#6f6b62] mt-1">
              Curate verified past papers, textbooks, and intuitive media for Cambridge, Edexcel, and IB.
            </p>
          </div>

          <span className="text-xs font-bold uppercase tracking-wider bg-[#3d6b52]/10 text-[#3d6b52] px-3 py-1.5 rounded-full border border-[#3d6b52]/20 self-start md:self-auto">
            {resources.length} Teaching Assets Indexed
          </span>
        </div>

        {/* 3RD-PARTY INSTITUTIONAL LAUNCHER (From Support Kit) */}
        <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">
              Institutional 3rd-Party Materials
            </h2>
            <span className="text-[11px] text-[#3d6b52] font-semibold">Active Subscriptions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Save My Exams */}
            <div className="p-3.5 bg-[#faf9f6] border border-[#ddd8cd] rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2b2b28]">Save My Exams</span>
                <span className="text-[10px] bg-[#e8efe9] text-[#3d6b52] font-bold px-1.5 py-0.5 rounded">
                  IGCSE / A-Level / IB
                </span>
              </div>
              <p className="text-[11px] text-[#6f6b62]">Topic revision notes, model answers & mark schemes.</p>
              <div className="pt-1 flex items-center justify-between border-t border-[#ddd8cd]/40">
                <span className="text-[10px] font-mono text-[#6f6b62]">hisensei.k12@gmail.com</span>
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
            <div className="p-3.5 bg-[#faf9f6] border border-[#ddd8cd] rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2b2b28]">PMT (Physics & Maths)</span>
                <span className="text-[10px] bg-[#e8efe9] text-[#3d6b52] font-bold px-1.5 py-0.5 rounded">
                  Free Vault
                </span>
              </div>
              <p className="text-[11px] text-[#6f6b62]">Topical past paper packs & flashcards for CAIE/Edexcel.</p>
              <div className="pt-1 flex items-center justify-between border-t border-[#ddd8cd]/40">
                <span className="text-[10px] font-mono text-[#6f6b62]">Open Access</span>
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
            <div className="p-3.5 bg-[#faf9f6] border border-[#ddd8cd] rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2b2b28]">Twinkl Primary</span>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                  Primary / Checkpoint
                </span>
              </div>
              <p className="text-[11px] text-[#6f6b62]">Curriculum worksheets & visual aids for young learners.</p>
              <div className="pt-1 flex items-center justify-between border-t border-[#ddd8cd]/40">
                <span className="text-[10px] font-mono text-[#6f6b62]">Institutional</span>
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
            <div className="p-3.5 bg-[#faf9f6] border border-[#ddd8cd] rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2b2b28]">IXL Learning</span>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                  Diagnostic ELA/Math
                </span>
              </div>
              <p className="text-[11px] text-[#6f6b62]">Adaptive skill drills and baseline diagnostics.</p>
              <div className="pt-1 flex items-center justify-between border-t border-[#ddd8cd]/40">
                <span className="text-[10px] font-mono text-[#6f6b62]">k12dev</span>
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