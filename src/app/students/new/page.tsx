import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import NewStudentForm from './NewStudentForm';

export const dynamic = 'force-dynamic';

const LEVEL_LABELS: Record<string, string> = {
  PRIMARY: 'Primary Level',
  LOWER_SECONDARY: 'Lower Secondary',
  IGCSE: 'IGCSE Level',
  A_LEVEL: 'A Level',
  MYP: 'IB MYP',
  DP: 'IB Diploma (DP)',
  OTHER: 'General / SAT',
};

export default async function NewStudentPage() {
  const courses = await prisma.course.findMany({
    include: {
      board: true,
    },
    orderBy: [
      { board: { code: 'asc' } },
      { level: 'asc' },
      { title: 'asc' },
    ],
  });

  const formattedCourses = courses.map((c) => {
    let tiers: { val: string; label: string; sub: string }[] = [];

    // CAMBRIDGE (CAIE)
    if (c.board.code === 'CIE') {
      if (c.subjectCode === '0580') {
        tiers = [
          { val: 'Extended', label: 'Extended Tier', sub: 'Papers 2 & 4 (Grades A* to E)' },
          { val: 'Core', label: 'Core Tier', sub: 'Papers 1 & 3 (Grades C to G)' },
        ];
      } else if (c.subjectCode === '0625') {
        tiers = [
          { val: 'Extended', label: 'Extended Physics', sub: 'Theory Paper 4 + Multiple Choice P2 + Alt to Practical P6' },
          { val: 'Core', label: 'Core Physics', sub: 'Core Theory P3 + Multiple Choice P1 + Alt to Practical P6' },
        ];
      } else if (c.subjectCode === '0606') {
        tiers = [{ val: 'Standard', label: 'Single Tier (Extended Level)', sub: 'Papers 1 & 2 (Grades A* to E)' }];
      } else if (c.subjectCode === '9709') {
        tiers = [
          { val: 'Pure Maths & Stats', label: 'Pure Maths + Probability & Statistics', sub: 'Papers 1 & 5 (AS) or 1, 3, 5, 6 (A2)' },
          { val: 'Pure Maths & Mechanics', label: 'Pure Maths + Mechanics', sub: 'Papers 1 & 4 (AS) or 1, 3, 4, 5 (A2)' },
        ];
      } else if (c.subjectCode === '9702') {
        tiers = [
          { val: 'Complete A Level', label: 'Full A Level (A2)', sub: 'Papers 1, 2, 3 (AS) + Papers 4 & 5 (A2)' },
          { val: 'AS Level Only', label: 'AS Level Standalone', sub: 'Paper 1 (MCQ), Paper 2 (Theory), Paper 3 (Practical)' },
        ];
      } else {
        tiers = [{ val: 'Standard', label: 'Standard Progression', sub: 'Continuous internal progression' }];
      }
    } 
    // PEARSON EDEXCEL
    else if (c.board.code === 'EDEXCEL') {
      if (c.subjectCode === '4MA1') {
        tiers = [
          { val: 'Higher', label: 'Higher Tier', sub: 'Papers 1H & 2H (Grades 4 to 9)' },
          { val: 'Foundation', label: 'Foundation Tier', sub: 'Papers 1F & 2F (Grades 1 to 5)' },
        ];
      } else if (c.subjectCode === '4PH1') {
        tiers = [{ val: 'Single Tier', label: 'Single Unified Tier', sub: 'Paper 1P (2 hrs) + Paper 2P (1 hr 15 mins)' }];
      } else if (c.subjectCode.startsWith('W')) {
        tiers = [{ val: 'International A Level', label: 'Modular IAL Units', sub: 'Unit 1, 2, 3 (IAS) + Unit 4, 5, 6 (IA2)' }];
      } else {
        tiers = [{ val: 'Standard', label: 'General Specification', sub: 'Standard curriculum progression' }];
      }
    } 
    // IB
    else if (c.board.code === 'IB') {
      if (c.level === 'DP') {
        tiers = [
          { val: 'Higher Level (HL)', label: 'Higher Level (HL)', sub: '240 teaching hours (Deep derivations & Paper 3)' },
          { val: 'Standard Level (SL)', label: 'Standard Level (SL)', sub: '150 teaching hours (Core syllabus & Papers 1, 2)' },
        ];
      } else if (c.level === 'MYP') {
        tiers = [
          { val: 'Extended', label: 'Extended Framework', sub: 'Standard MYP criteria + extended advanced modules' },
          { val: 'Standard', label: 'Standard Framework', sub: 'Core MYP Criteria A, B, C, D' },
        ];
      }
    } 
    // SAT
    else if (c.board.code === 'COLLEGEBOARD') {
      tiers = [
        { val: 'Digital SAT', label: 'Digital SAT (Adaptive)', sub: 'Module 1 (Routing) + Module 2 (Adaptive Difficulty)' },
      ];
    } else {
      tiers = [{ val: 'Standard', label: 'Standard Track', sub: 'Standard curriculum specification' }];
    }

    return {
      id: c.id,
      title: c.title,
      subjectCode: c.subjectCode,
      level: LEVEL_LABELS[c.level] || c.level, // Clean human-readable label without underscores!
      boardCode: c.board.code,
      boardName: c.board.name,
      availableTiers: tiers,
    };
  });

  return (
    <main className="min-h-screen text-[#0f172a] p-6 md:p-10 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="md:sticky md:top-3 z-30 glass-panel glass-sticky p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <span className="glass-pill text-[11px] font-bold uppercase tracking-wider px-3 py-1 inline-block">
              New Student
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] mt-2">Onboard New Student</h1>
            <p className="text-xs font-medium text-slate-700 mt-0.5">
              Configure student identity, board curriculum, and fluid examination tiering.
            </p>
          </div>
          <BackButton className="self-start" />
        </header>

        <NewStudentForm courses={formattedCourses} />
      </div>
    </main>
  );
}