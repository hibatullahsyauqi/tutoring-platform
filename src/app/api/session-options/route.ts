import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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

  const formatted = courses.map((c) => {
    let tiers: { val: string; label: string; sub: string }[] = [];

    // --- CAMBRIDGE (CAIE) ---
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
        tiers = [{ val: 'Standard', label: 'Standard Progression', sub: 'Continuous internal & checkpoint progression' }];
      }
    } 
    // --- EDEXCEL ---
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
    // --- INTERNATIONAL BACCALAUREATE (IB) ---
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
    // --- SAT (COLLEGE BOARD) ---
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
      level: c.level,
      boardCode: c.board.code,
      boardName: c.board.name,
      availableTiers: tiers,
    };
  });

  return NextResponse.json(formatted);
}