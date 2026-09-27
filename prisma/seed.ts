import { PrismaClient, EducationLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // -------------------------------------------------------------
  // 1. BULLETPROOF TUTOR SETUP
  // -------------------------------------------------------------
  let tutor = await prisma.tutor.findFirst();
  if (!tutor) {
    tutor = await prisma.tutor.create({
      data: {
        name: 'Syauqi',
        email: 'syauqi@tutor.local',
      },
    });
  } else {
    tutor = await prisma.tutor.update({
      where: { id: tutor.id },
      data: { name: 'Syauqi' },
    });
  }
  console.log(`✓ Tutor profile ready: ${tutor.name}`);

  // -------------------------------------------------------------
  // 2. TEACHING TOOLS
  // -------------------------------------------------------------
  const tools = [
    { name: 'GeoGebra', category: 'Dynamic Geometry & Graphing', url: 'https://www.geogebra.org/calculator' },
    { name: 'Desmos', category: 'Function Graphing & Rapid Checks', url: 'https://www.desmos.com/calculator' },
    { name: 'PhET Simulations', category: 'Physics & Interactive Sims', url: 'https://phet.colorado.edu/' },
    { name: 'Manim Clip', category: 'Hero Animation (Pre-rendered)', url: null },
    { name: 'Python Live Script', category: 'Numerical Verification & Matplotlib', url: null },
    { name: 'Past Paper PDF', category: 'Official Exam Standard Practice', url: null },
  ];

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { name: tool.name },
      update: {},
      create: tool,
    });
  }
  console.log(`✓ ${tools.length} Teaching tools seeded`);

  // -------------------------------------------------------------
  // 3. EXAM BOARDS (Cambridge, Edexcel, IB, College Board)
  // -------------------------------------------------------------
  const cie = await prisma.examBoard.upsert({
    where: { code: 'CIE' },
    update: {},
    create: {
      name: 'Cambridge Assessment International Education (CAIE)',
      code: 'CIE',
    },
  });

  const edexcel = await prisma.examBoard.upsert({
    where: { code: 'EDEXCEL' },
    update: {},
    create: {
      name: 'Pearson Edexcel International',
      code: 'EDEXCEL',
    },
  });

  const ib = await prisma.examBoard.upsert({
    where: { code: 'IB' },
    update: {},
    create: {
      name: 'International Baccalaureate (IB)',
      code: 'IB',
    },
  });

  const collegeBoard = await prisma.examBoard.upsert({
    where: { code: 'COLLEGEBOARD' },
    update: {},
    create: {
      name: 'College Board (USA / SAT)',
      code: 'COLLEGEBOARD',
    },
  });
  console.log('✓ Exam boards ready');

  // -------------------------------------------------------------
  // 4. FULL CONTRACT CURRICULUM (Math & Physics across all levels)
  // -------------------------------------------------------------
  const fullContractCourses = [
    // --- SD / PRIMARY LEVEL (60 min - Rp 60k) ---
    {
      boardId: cie.id,
      title: 'Cambridge Primary Mathematics',
      level: EducationLevel.PRIMARY,
      subjectCode: '0096',
    },
    {
      boardId: cie.id,
      title: 'Cambridge Primary Science (Physics focus)',
      level: EducationLevel.PRIMARY,
      subjectCode: '0097',
    },

    // --- SMP / LOWER SECONDARY LEVEL (90 min - Rp 75k) ---
    {
      boardId: cie.id,
      title: 'Cambridge Lower Secondary Mathematics',
      level: EducationLevel.LOWER_SECONDARY,
      subjectCode: '0862',
    },
    {
      boardId: cie.id,
      title: 'Cambridge Lower Secondary Science (Physics)',
      level: EducationLevel.LOWER_SECONDARY,
      subjectCode: '0893',
    },
    {
      boardId: ib.id,
      title: 'IB MYP Mathematics (Standard)',
      level: EducationLevel.MYP,
      subjectCode: 'MYP-MATH-STD',
    },
    {
      boardId: ib.id,
      title: 'IB MYP Sciences (Physics)',
      level: EducationLevel.MYP,
      subjectCode: 'MYP-SCI-PHY',
    },

    // --- IGCSE / UPPER SECONDARY LEVEL (90 min - Rp 100k) ---
    {
      boardId: cie.id,
      title: 'Cambridge IGCSE Mathematics',
      level: EducationLevel.IGCSE,
      subjectCode: '0580',
    },
    {
      boardId: cie.id,
      title: 'Cambridge IGCSE Additional Mathematics',
      level: EducationLevel.IGCSE,
      subjectCode: '0606',
    },
    {
      boardId: cie.id,
      title: 'Cambridge IGCSE Physics',
      level: EducationLevel.IGCSE,
      subjectCode: '0625',
    },
    {
      boardId: edexcel.id,
      title: 'Edexcel International GCSE Mathematics A',
      level: EducationLevel.IGCSE,
      subjectCode: '4MA1',
    },
    {
      boardId: edexcel.id,
      title: 'Edexcel International GCSE Physics',
      level: EducationLevel.IGCSE,
      subjectCode: '4PH1',
    },
    {
      boardId: ib.id,
      title: 'IB MYP Mathematics (Extended)',
      level: EducationLevel.MYP,
      subjectCode: 'MYP-MATH-EXT',
    },

    // --- A-LEVEL / IBDP / SAT LEVEL (90 min - Rp 150k) ---
    {
      boardId: cie.id,
      title: 'Cambridge International AS & A Level Mathematics',
      level: EducationLevel.A_LEVEL,
      subjectCode: '9709',
    },
    {
      boardId: cie.id,
      title: 'Cambridge International AS & A Level Physics',
      level: EducationLevel.A_LEVEL,
      subjectCode: '9702',
    },
    {
      boardId: edexcel.id,
      title: 'Edexcel International A Level Pure Mathematics',
      level: EducationLevel.A_LEVEL,
      subjectCode: 'WMA11',
    },
    {
      boardId: edexcel.id,
      title: 'Edexcel International A Level Physics',
      level: EducationLevel.A_LEVEL,
      subjectCode: 'WPH11',
    },
    {
      boardId: ib.id,
      title: 'IB DP Mathematics: Analysis and Approaches',
      level: EducationLevel.DP,
      subjectCode: 'DP-MATH-AA',
    },
    {
      boardId: ib.id,
      title: 'IB DP Physics',
      level: EducationLevel.DP,
      subjectCode: 'DP-PHYSICS',
    },
    {
      boardId: collegeBoard.id,
      title: 'Digital SAT: Mathematics Section',
      level: EducationLevel.OTHER,
      subjectCode: 'SAT-MATH',
    },
  ];

  for (const c of fullContractCourses) {
    await prisma.course.upsert({
      where: {
        boardId_subjectCode: {
          boardId: c.boardId,
          subjectCode: c.subjectCode,
        },
      },
      update: { title: c.title, level: c.level },
      create: c,
    });
  }
  console.log(`✓ Seeded ${fullContractCourses.length} Courses covering Math & Physics across all contract levels`);

  // -------------------------------------------------------------
  // 5. OFFICIAL TOPICS (Cambridge 0580)
  // -------------------------------------------------------------
  const igcseMaths = await prisma.course.findUnique({
    where: {
      boardId_subjectCode: {
        boardId: cie.id,
        subjectCode: '0580',
      },
    },
  });

  if (igcseMaths) {
    const cambridgeSourceUrl =
      'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/';

    const topics0580 = [
      { code: '1.1', title: 'Types of numbers (integers, primes, squares, cubes, factors, multiples, HCF, LCM)' },
      { code: '1.2', title: 'Sets and Venn diagrams (notation, union, intersection, subsets)' },
      { code: '1.3', title: 'Powers and roots (square roots, cube roots)' },
      { code: '1.4', title: 'Fractions, decimals, and percentages' },
      { code: '1.5', title: 'Ordering quantities and inequalities (<, >, ≤, ≥)' },
      { code: '1.6', title: 'The four operations and order of operations (BODMAS)' },
      { code: '1.7', title: 'Indices and index laws (positive, zero, negative, fractional)' },
      { code: '1.8', title: 'Standard form (A × 10^n)' },
      { code: '1.9', title: 'Estimation and rounding (decimal places, significant figures)' },
      { code: '1.10', title: 'Limits of accuracy (upper and lower bounds)' },
      { code: '1.11', title: 'Ratio and proportion (direct and inverse numerical proportion)' },
      { code: '1.12', title: 'Rates and compound measures (speed, density, pressure)' },
      { code: '1.13', title: 'Percentages (percentage increase/decrease, reverse percentages)' },
      { code: '1.14', title: 'Exponential growth and decay (compound interest, depreciation)' },
      { code: '1.15', title: 'Surds and rationalising denominators (Extended)' },
      { code: '2.1', title: 'Introduction to algebra and substitution' },
      { code: '2.2', title: 'Algebraic manipulation (collecting terms, expanding brackets, factorising)' },
      { code: '2.3', title: 'Algebraic fractions (simplifying, operations with fractions)' },
      { code: '2.4', title: 'Solution of linear equations and simultaneous linear equations' },
      { code: '2.5', title: 'Solution of quadratic equations (factorisation, completing square, quadratic formula)' },
      { code: '2.6', title: 'Linear inequalities and graphical regions' },
      { code: '2.7', title: 'Sequences (nth term of linear, quadratic, and geometric sequences)' },
      { code: '2.8', title: 'Graphs in practical situations (kinematics: distance-time and speed-time graphs)' },
      { code: '2.9', title: 'Graphs of functions (linear, quadratic, cubic, reciprocal, exponential)' },
      { code: '2.10', title: 'Sketching curves and recognizing transformations' },
      { code: '2.11', title: 'Differentiation and gradient of tangents (dy/dx, turning points)' },
    ];

    for (const topic of topics0580) {
      await prisma.syllabusTopic.upsert({
        where: {
          courseId_code: {
            courseId: igcseMaths.id,
            code: topic.code,
          },
        },
        update: { title: topic.title, sourceUrl: cambridgeSourceUrl },
        create: {
          courseId: igcseMaths.id,
          code: topic.code,
          title: topic.title,
          sourceUrl: cambridgeSourceUrl,
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 6. DEFAULT STUDENT: MAYA
  // -------------------------------------------------------------
  if (igcseMaths) {
    const maya = await prisma.student.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        tutorId: tutor.id,
        name: 'Maya',
        targetExamDate: new Date('2027-05-01'),
      },
    });

    await prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: maya.id,
          courseId: igcseMaths.id,
        },
      },
      update: { tier: 'Extended' } as any,
      create: {
        studentId: maya.id,
        courseId: igcseMaths.id,
        tier: 'Extended',
      },
    });
  }

  // -------------------------------------------------------------
  // 7. SEED MODULAR PORTAL VAULT (Clean, Non-misleading & Modular)
  // -------------------------------------------------------------
  if (igcseMaths) {
    // Wipe previous duplicates before seeding fresh
    await prisma.resource.deleteMany({});

    const modularVault = [
      {
        courseId: igcseMaths.id,
        title: 'Physics & Maths Tutor (PMT) Portal',
        authorOrPublisher: 'PMT Education',
        resourceType: 'PAST_PAPER' as const,
        locationDetails: 'Online repository for past exam papers, mark schemes, and topic questions',
        url: 'https://www.physicsandmathstutor.com/',
      },
      {
        courseId: igcseMaths.id,
        title: 'Save My Exams Portal',
        authorOrPublisher: 'Save My Exams',
        resourceType: 'WORKSHEET' as const,
        locationDetails: 'Curriculum-aligned revision notes, practice questions, and worked solutions',
        url: 'https://www.savemyexams.com/',
      },
      {
        courseId: igcseMaths.id,
        title: 'GeoGebra Graphing & Calculation Suite',
        authorOrPublisher: 'GeoGebra International',
        resourceType: 'SIMULATION' as const,
        locationDetails: 'Dynamic mathematics tool for graphing functions, geometric shapes, and sliders',
        url: 'https://www.geogebra.org/calculator',
      },
      {
        courseId: igcseMaths.id,
        title: 'PhET Interactive Simulations',
        authorOrPublisher: 'University of Colorado Boulder',
        resourceType: 'SIMULATION' as const,
        locationDetails: 'Interactive simulations for physics, chemistry, and mathematics',
        url: 'https://phet.colorado.edu/',
      },
      {
        courseId: igcseMaths.id,
        title: 'BetterExplained Concept Vault',
        authorOrPublisher: 'Kalid Azad',
        resourceType: 'INTUITION_ARTICLE' as const,
        locationDetails: 'High-level conceptual articles and visual analogies for mathematics',
        url: 'https://betterexplained.com/',
      },
      {
        courseId: igcseMaths.id,
        title: 'Cambridge IGCSE Mathematics Core and Extended Coursebook',
        authorOrPublisher: 'Ric Pimentel & Terry Wall (Hodder Education)',
        resourceType: 'TEXTBOOK' as const,
        locationDetails: 'Standard coursebook reference and problem sets',
        url: null,
      },
    ];

    for (const r of modularVault) {
      await prisma.resource.create({
        data: r,
      });
    }
    console.log(`✓ Seeded ${modularVault.length} modular teaching assets into the Library`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });