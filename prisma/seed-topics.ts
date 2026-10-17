import { PrismaClient } from '@prisma/client';

// Chapter-level topics taken from the tables of contents of:
//  - Cambridge International AS & A Level Physics Coursebook (Sang, Jones, Chadha, Woodside) -> 9702
//  - Cambridge International AS & A Level Mathematics: Pure Mathematics 1 Coursebook (Pemberton) -> 9709, paper 1 only
// Mechanics, Statistics and Pure Mathematics 3 are not covered yet.

const PHYSICS_9702: [string, string][] = [
  ['1', 'Kinematics'],
  ['2', 'Accelerated motion'],
  ['3', 'Dynamics'],
  ['4', 'Forces'],
  ['5', 'Work, energy and power'],
  ['6', 'Momentum'],
  ['7', 'Matter and materials'],
  ['8', 'Electric current'],
  ['9', 'Kirchhoff’s laws'],
  ['10', 'Resistance and resistivity'],
  ['11', 'Practical circuits'],
  ['12', 'Waves'],
  ['13', 'Superposition of waves'],
  ['14', 'Stationary waves'],
  ['15', 'Atomic structure'],
  ['16', 'Circular motion'],
  ['17', 'Gravitational fields'],
  ['18', 'Oscillations'],
  ['19', 'Thermal physics'],
  ['20', 'Ideal gases'],
  ['21', 'Uniform electric fields'],
  ['22', 'Coulomb’s law'],
  ['23', 'Capacitance'],
  ['24', 'Magnetic fields and electromagnetism'],
  ['25', 'Motion of charged particles'],
  ['26', 'Electromagnetic induction'],
  ['27', 'Alternating currents'],
  ['28', 'Quantum physics'],
  ['29', 'Nuclear physics'],
  ['30', 'Medical imaging'],
  ['31', 'Astronomy and cosmology'],
];

const PURE_MATHS_1_9709: [string, string][] = [
  ['P1.1', 'Quadratics'],
  ['P1.2', 'Functions'],
  ['P1.3', 'Coordinate geometry'],
  ['P1.4', 'Circular measure'],
  ['P1.5', 'Trigonometry'],
  ['P1.6', 'Series'],
  ['P1.7', 'Differentiation'],
  ['P1.8', 'Further differentiation'],
  ['P1.9', 'Integration'],
];

const TOPIC_SETS = [
  { subjectCode: '9702', topics: PHYSICS_9702 },
  { subjectCode: '9709', topics: PURE_MATHS_1_9709 },
];

/** Idempotent: safe to run repeatedly, never deletes anything. */
export async function seedAlevelTopics(prisma: PrismaClient) {
  const cie = await prisma.examBoard.findUnique({ where: { code: 'CIE' } });
  if (!cie) throw new Error('CIE exam board not found; run the main seed first.');

  for (const set of TOPIC_SETS) {
    const course = await prisma.course.findUnique({
      where: { boardId_subjectCode: { boardId: cie.id, subjectCode: set.subjectCode } },
    });
    if (!course) {
      console.warn(`! Course ${set.subjectCode} not found, skipping`);
      continue;
    }
    for (const [code, title] of set.topics) {
      await prisma.syllabusTopic.upsert({
        where: { courseId_code: { courseId: course.id, code } },
        update: { title },
        create: { courseId: course.id, code, title },
      });
    }
    console.log(`✓ ${set.subjectCode}: ${set.topics.length} topics`);
  }
}

if (import.meta.main) {
  const prisma = new PrismaClient();
  seedAlevelTopics(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
