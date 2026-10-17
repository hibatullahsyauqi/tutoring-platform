import { PrismaClient } from '@prisma/client';

// Syllabus topics, taken from each course's official document (source URL on every set, except the two coursebook-based ones).
// Chapter-level for the two Cambridge A Level coursebooks; sub-topic level for the specifications.
// Not covered yet: Cambridge Primary / Lower Secondary (frameworks sit behind Cambridge's teacher login)
// and IB MYP / DP (ibo.org blocks automated downloads). Add them by hand or from files you download.

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

const IGCSE_PHYSICS_0625: [string, string][] = [
  ['1.1', 'Physical quantities and measurement techniques'],
  ['1.2', 'Motion'],
  ['1.3', 'Mass and weight'],
  ['1.4', 'Density'],
  ['1.5', 'Forces'],
  ['1.6', 'Momentum'],
  ['1.7', 'Energy, work and power'],
  ['1.8', 'Pressure'],
  ['2.1', 'Kinetic particle model of matter'],
  ['2.2', 'Thermal properties and temperature'],
  ['2.3', 'Transfer of thermal energy'],
  ['3.1', 'General properties of waves'],
  ['3.2', 'Light'],
  ['3.3', 'Electromagnetic spectrum'],
  ['3.4', 'Sound'],
  ['4.1', 'Simple phenomena of magnetism'],
  ['4.2', 'Electrical quantities'],
  ['4.3', 'Electric circuits'],
  ['4.4', 'Electrical safety'],
  ['4.5', 'Electromagnetic effects'],
  ['5.1', 'The nuclear model of the atom'],
  ['5.2', 'Radioactivity'],
  ['6.1', 'The Earth and the Solar System'],
  ['6.2', 'Stars and the Universe'],
];

const IGCSE_ADD_MATHS_0606: [string, string][] = [
  ['1', 'Functions'],
  ['2', 'Quadratic functions'],
  ['3', 'Factors of polynomials'],
  ['4', 'Equations, inequalities and graphs'],
  ['5', 'Simultaneous equations'],
  ['6', 'Logarithmic and exponential functions'],
  ['7', 'Straight-line graphs'],
  ['8', 'Coordinate geometry of the circle'],
  ['9', 'Circular measure'],
  ['10', 'Trigonometry'],
  ['11', 'Permutations and combinations'],
  ['12', 'Series'],
  ['13', 'Vectors in two dimensions'],
  ['14', 'Calculus'],
];

const EDEXCEL_IGCSE_MATHS_4MA1: [string, string][] = [
  ['1.1', 'Integers'],
  ['1.2', 'Fractions'],
  ['1.3', 'Decimals'],
  ['1.4', 'Powers and roots'],
  ['1.5', 'Set language and notation'],
  ['1.6', 'Percentages'],
  ['1.7', 'Ratio and proportion'],
  ['1.8', 'Degree of accuracy'],
  ['1.9', 'Standard form'],
  ['1.10', 'Applying number'],
  ['1.11', 'Electronic calculators'],
  ['2.1', 'Use of symbols'],
  ['2.2', 'Algebraic manipulation'],
  ['2.3', 'Expressions and formulae'],
  ['2.4', 'Linear equations'],
  ['2.5', 'Proportion'],
  ['2.6', 'Simultaneous linear equations'],
  ['2.7', 'Quadratic equations'],
  ['2.8', 'Inequalities'],
  ['3.1', 'Sequences'],
  ['3.2', 'Function notation'],
  ['3.3', 'Graphs'],
  ['3.4', 'Calculus'],
  ['4.1', 'Angles, lines and triangles'],
  ['4.2', 'Polygons'],
  ['4.3', 'Symmetry'],
  ['4.4', 'Measures'],
  ['4.5', 'Construction'],
  ['4.6', 'Circle properties'],
  ['4.7', 'Geometrical reasoning'],
  ['4.8', 'Trigonometry and Pythagoras’ theorem'],
  ['4.9', 'Mensuration of 2D shapes'],
  ['4.10', '3D shapes and volume'],
  ['4.11', 'Similarity'],
  ['5.1', 'Vectors'],
  ['5.2', 'Transformation geometry'],
  ['6.1', 'Graphical representation of data'],
  ['6.2', 'Statistical measures'],
  ['6.3', 'Probability'],
];

const EDEXCEL_IGCSE_PHYSICS_4PH1: [string, string][] = [
  ['1.1', 'Forces and motion: Movement and position'],
  ['1.2', 'Forces and motion: Forces, movement, shape and momentum'],
  ['2.1', 'Electricity: Mains electricity'],
  ['2.2', 'Electricity: Energy and voltage in circuits'],
  ['2.3', 'Electricity: Electric charge'],
  ['3.1', 'Waves: Properties of waves'],
  ['3.2', 'Waves: The electromagnetic spectrum'],
  ['3.3', 'Waves: Light and sound'],
  ['4.1', 'Energy resources and energy transfers: Energy transfers'],
  ['4.2', 'Energy resources and energy transfers: Work and power'],
  ['4.3', 'Energy resources and energy transfers: Energy resources and electricity generation'],
  ['5.1', 'Solids, liquids and gases: Density and pressure'],
  ['5.2', 'Solids, liquids and gases: Change of state'],
  ['5.3', 'Solids, liquids and gases: Ideal gas molecules'],
  ['6.1', 'Magnetism and electromagnetism: Magnetism'],
  ['6.2', 'Magnetism and electromagnetism: Electromagnetism'],
  ['6.3', 'Magnetism and electromagnetism: Electromagnetic induction'],
  ['7.1', 'Radioactivity and particles: Radioactivity'],
  ['7.2', 'Radioactivity and particles: Fission and fusion'],
  ['8.1', 'Astrophysics: Motion in the universe'],
  ['8.2', 'Astrophysics: Stellar evolution'],
  ['8.3', 'Astrophysics: Cosmology'],
];

const IGCSE_MATHS_0580: [string, string][] = [
  ['1.1', 'Number: Types of number'],
  ['1.2', 'Number: Sets'],
  ['1.3', 'Number: Powers and roots'],
  ['1.4', 'Number: Fractions, decimals and percentages'],
  ['1.5', 'Number: Ordering'],
  ['1.6', 'Number: The four operations'],
  ['1.7', 'Number: Indices I'],
  ['1.8', 'Number: Standard form'],
  ['1.9', 'Number: Estimation'],
  ['1.10', 'Number: Limits of accuracy'],
  ['1.11', 'Number: Ratio and proportion'],
  ['1.12', 'Number: Rates'],
  ['1.13', 'Number: Percentages'],
  ['1.14', 'Number: Using a calculator'],
  ['1.15', 'Number: Time'],
  ['1.16', 'Number: Money'],
  ['1.17', 'Number: Exponential growth and decay (Extended)'],
  ['1.18', 'Number: Surds (Extended)'],
  ['2.1', 'Algebra and graphs: Introduction to algebra'],
  ['2.2', 'Algebra and graphs: Algebraic manipulation'],
  ['2.3', 'Algebra and graphs: Algebraic fractions (Extended)'],
  ['2.4', 'Algebra and graphs: Indices II'],
  ['2.5', 'Algebra and graphs: Equations'],
  ['2.6', 'Algebra and graphs: Inequalities'],
  ['2.7', 'Algebra and graphs: Sequences'],
  ['2.8', 'Algebra and graphs: Proportion (Extended)'],
  ['2.9', 'Algebra and graphs: Graphs in practical situations'],
  ['2.10', 'Algebra and graphs: Graphs of functions'],
  ['2.11', 'Algebra and graphs: Sketching curves'],
  ['2.12', 'Algebra and graphs: Differentiation (Extended)'],
  ['2.13', 'Algebra and graphs: Functions (Extended)'],
  ['3.1', 'Coordinate geometry: Coordinates'],
  ['3.2', 'Coordinate geometry: Drawing linear graphs'],
  ['3.3', 'Coordinate geometry: Gradient of linear graphs'],
  ['3.4', 'Coordinate geometry: Length and midpoint (Extended)'],
  ['3.5', 'Coordinate geometry: Equations of linear graphs'],
  ['3.6', 'Coordinate geometry: Parallel lines'],
  ['3.7', 'Coordinate geometry: Perpendicular lines (Extended)'],
  ['4.1', 'Geometry: Geometrical terms'],
  ['4.2', 'Geometry: Geometrical constructions'],
  ['4.3', 'Geometry: Scale drawings'],
  ['4.4', 'Geometry: Similarity'],
  ['4.5', 'Geometry: Symmetry'],
  ['4.6', 'Geometry: Angles'],
  ['4.7', 'Geometry: Circle theorems'],
  ['4.8', 'Geometry: Circle theorems II (Extended)'],
  ['5.1', 'Mensuration: Units of measure'],
  ['5.2', 'Mensuration: Area and perimeter'],
  ['5.3', 'Mensuration: Circles, arcs and sectors'],
  ['5.4', 'Mensuration: Surface area and volume'],
  ['5.5', 'Mensuration: Compound shapes and parts of shapes'],
  ['6.1', 'Trigonometry: Pythagoras’ theorem'],
  ['6.2', 'Trigonometry: Right-angled triangles'],
  ['6.3', 'Trigonometry: Exact trigonometric values (Extended)'],
  ['6.4', 'Trigonometry: Trigonometric functions (Extended)'],
  ['6.5', 'Trigonometry: Non-right-angled triangles (Extended)'],
  ['6.6', 'Trigonometry: Pythagoras’ theorem and trigonometry in 3D (Extended)'],
  ['7.1', 'Transformations and vectors: Transformations'],
  ['7.2', 'Transformations and vectors: Vectors in two dimensions (Extended)'],
  ['7.3', 'Transformations and vectors: Magnitude of a vector (Extended)'],
  ['7.4', 'Transformations and vectors: Vector geometry (Extended)'],
  ['8.1', 'Probability: Introduction to probability'],
  ['8.2', 'Probability: Relative and expected frequencies'],
  ['8.3', 'Probability: Probability of combined events'],
  ['8.4', 'Probability: Conditional probability (Extended)'],
  ['9.1', 'Statistics: Classifying statistical data'],
  ['9.2', 'Statistics: Interpreting statistical data'],
  ['9.3', 'Statistics: Averages and range'],
  ['9.4', 'Statistics: Statistical charts and diagrams'],
  ['9.5', 'Statistics: Scatter diagrams'],
  ['9.6', 'Statistics: Cumulative frequency diagrams (Extended)'],
  ['9.7', 'Statistics: Histograms (Extended)'],
];

// Pure Mathematics units P1 to P4 (WMA11 to WMA14). Further Pure, Mechanics, Statistics and Decision units are not included.
const EDEXCEL_IAL_PURE_MATHS: [string, string][] = [
  ['P1-1.1', 'P1 Algebra and functions: Laws of indices for all rational exponents'],
  ['P1-1.2', 'P1 Algebra and functions: Use and manipulation of surds'],
  ['P1-1.3', 'P1 Algebra and functions: Quadratic functions and their graphs'],
  ['P1-1.4', 'P1 Algebra and functions: The discriminant of a quadratic function'],
  ['P1-1.5', 'P1 Algebra and functions: Completing the square; solving quadratic equations'],
  ['P1-1.6', 'P1 Algebra and functions: Simultaneous equations'],
  ['P1-1.7', 'P1 Algebra and functions: Interpret linear and quadratic inequalities graphically'],
  ['P1-1.8', 'P1 Algebra and functions: Represent linear and quadratic inequalities graphically'],
  ['P1-1.9', 'P1 Algebra and functions: Solutions of linear and quadratic inequalities'],
  ['P1-1.10', 'P1 Algebra and functions: Algebraic manipulation of polynomials'],
  ['P1-1.11', 'P1 Algebra and functions: Graphs of functions and curve sketching'],
  ['P1-1.12', 'P1 Algebra and functions: Effect of simple transformations on graphs'],
  ['P1-2.1', 'P1 Coordinate geometry: Equation of a straight line'],
  ['P1-2.2', 'P1 Coordinate geometry: Parallel and perpendicular lines'],
  ['P1-3.1', 'P1 Trigonometry: Sine and cosine rules; area of a triangle'],
  ['P1-3.2', 'P1 Trigonometry: Radian measure, arc length and area of a sector'],
  ['P1-3.3', 'P1 Trigonometry: Sine, cosine and tangent functions'],
  ['P1-4.1', 'P1 Differentiation: The derivative as the gradient of the tangent'],
  ['P1-4.2', 'P1 Differentiation: Differentiation of x^n and related sums'],
  ['P1-4.3', 'P1 Differentiation: Gradients, tangents and normals'],
  ['P1-5.1', 'P1 Integration: Indefinite integration as the reverse of differentiation'],
  ['P1-5.2', 'P1 Integration: Integration of x^n and related sums'],
  ['P2-1.1', 'P2 Proof: Structure of mathematical proof'],
  ['P2-1.2', 'P2 Proof: Proof by exhaustion'],
  ['P2-1.3', 'P2 Proof: Disproof by counter example'],
  ['P2-2.1', 'P2 Algebra and functions: Algebraic division; Factor and Remainder Theorems'],
  ['P2-3.1', 'P2 Coordinate geometry: The circle (equation and circle properties)'],
  ['P2-4.1', 'P2 Sequences and series: Sequences from a formula or recurrence relation'],
  ['P2-4.2', 'P2 Sequences and series: Arithmetic sequences and series'],
  ['P2-4.3', 'P2 Sequences and series: Increasing, decreasing and periodic sequences'],
  ['P2-4.4', 'P2 Sequences and series: Geometric sequences and series'],
  ['P2-4.5', 'P2 Sequences and series: Binomial expansion of (a + bx)^n'],
  ['P2-5.1', 'P2 Exponentials and logarithms: y = a^x and its graph'],
  ['P2-5.2', 'P2 Exponentials and logarithms: Laws of logarithms'],
  ['P2-5.3', 'P2 Exponentials and logarithms: Solving equations of the form a^x = b'],
  ['P2-6.1', 'P2 Trigonometry: tan θ = sin θ / cos θ and sin² θ + cos² θ = 1'],
  ['P2-6.2', 'P2 Trigonometry: Solving simple trigonometric equations in an interval'],
  ['P2-7.1', 'P2 Differentiation: Maxima, minima and stationary points'],
  ['P2-8.1', 'P2 Integration: Evaluation of definite integrals'],
  ['P2-8.2', 'P2 Integration: The definite integral as area under a curve'],
  ['P2-8.3', 'P2 Integration: Approximating area with the trapezium rule'],
  ['P3-1.1', 'P3 Algebra and functions: Simplifying rational expressions'],
  ['P3-1.2', 'P3 Algebra and functions: Functions, domain and range, composite and inverse functions'],
  ['P3-1.3', 'P3 Algebra and functions: The modulus function'],
  ['P3-1.4', 'P3 Algebra and functions: Combinations of transformations of graphs'],
  ['P3-2.1', 'P3 Trigonometry: Sec, cosec, cot and inverse trigonometric functions'],
  ['P3-2.2', 'P3 Trigonometry: sec² θ = 1 + tan² θ and cosec² θ = 1 + cot² θ'],
  ['P3-2.3', 'P3 Trigonometry: Double angle and addition formulae'],
  ['P3-3.1', 'P3 Exponentials and logarithms: The function e^x and its graph'],
  ['P3-3.2', 'P3 Exponentials and logarithms: The function ln x and its graph'],
  ['P3-3.3', 'P3 Exponentials and logarithms: Logarithmic graphs to estimate parameters'],
  ['P3-4.1', 'P3 Differentiation: e^kx, ln kx, sin kx, cos kx, tan kx and their sums'],
  ['P3-4.2', 'P3 Differentiation: Product, quotient and chain rules'],
  ['P3-4.3', 'P3 Differentiation: dy/dx = 1 / (dx/dy)'],
  ['P3-4.4', 'P3 Differentiation: Exponential growth and decay'],
  ['P3-5.1', 'P3 Integration: e^kx, 1/x, sin kx, cos kx and related sums'],
  ['P3-5.2', 'P3 Integration: Integration by recognition of known derivatives'],
  ['P3-6.1', 'P3 Numerical methods: Locating roots by sign change'],
  ['P3-6.2', 'P3 Numerical methods: Iterative solutions and recurrence relations'],
  ['P4-1.1', 'P4 Proof: Proof by contradiction'],
  ['P4-2.1', 'P4 Algebra and functions: Partial fractions'],
  ['P4-3.1', 'P4 Coordinate geometry: Parametric equations of curves'],
  ['P4-4.1', 'P4 Binomial expansion: Binomial series for any rational n'],
  ['P4-5.1', 'P4 Differentiation: Implicit and parametric differentiation'],
  ['P4-5.2', 'P4 Differentiation: Forming simple differential equations'],
  ['P4-6.1', 'P4 Integration: Volumes of revolution'],
  ['P4-6.2', 'P4 Integration: Integration by substitution and by parts'],
  ['P4-6.3', 'P4 Integration: Integration using partial fractions'],
  ['P4-6.4', 'P4 Integration: Separable first order differential equations'],
  ['P4-6.5', 'P4 Integration: Area under a curve given parametric equations'],
  ['P4-7.1', 'P4 Vectors: Vectors in two and three dimensions'],
  ['P4-7.2', 'P4 Vectors: Magnitude of a vector'],
  ['P4-7.3', 'P4 Vectors: Vector addition and scalar multiples'],
  ['P4-7.4', 'P4 Vectors: Position vectors'],
  ['P4-7.5', 'P4 Vectors: Distance between two points'],
  ['P4-7.6', 'P4 Vectors: Vector equations of lines'],
  ['P4-7.7', 'P4 Vectors: The scalar product and angle between lines'],
];

// All six units of the qualification, including the two practical-skills units.
const EDEXCEL_IAL_PHYSICS_WPH11: [string, string][] = [
  ['U1.3', 'Unit 1 Mechanics'],
  ['U1.4', 'Unit 1 Materials'],
  ['U2.3', 'Unit 2 Waves and the particle nature of light'],
  ['U2.4', 'Unit 2 Electric circuits'],
  ['U3.3', 'Unit 3 Practical skills I: Planning'],
  ['U3.4', 'Unit 3 Practical skills I: Implementation and measurements'],
  ['U3.5', 'Unit 3 Practical skills I: Processing results'],
  ['U4.3', 'Unit 4 Further mechanics'],
  ['U4.4', 'Unit 4 Electric and magnetic fields'],
  ['U4.5', 'Unit 4 Nuclear and particle physics'],
  ['U5.3', 'Unit 5 Thermodynamics'],
  ['U5.4', 'Unit 5 Nuclear decay'],
  ['U5.5', 'Unit 5 Oscillations'],
  ['U5.6', 'Unit 5 Astrophysics and cosmology'],
  ['U6.3', 'Unit 6 Practical skills II: Planning'],
  ['U6.4', 'Unit 6 Practical skills II: Implementation and measurements'],
  ['U6.5', 'Unit 6 Practical skills II: Analysis'],
];

const DIGITAL_SAT_MATH: [string, string][] = [
  ['ALG.1', 'Algebra: Linear equations in one variable'],
  ['ALG.2', 'Algebra: Linear equations in two variables'],
  ['ALG.3', 'Algebra: Linear functions'],
  ['ALG.4', 'Algebra: Systems of two linear equations in two variables'],
  ['ALG.5', 'Algebra: Linear inequalities in one or two variables'],
  ['ADV.1', 'Advanced Math: Equivalent expressions'],
  ['ADV.2', 'Advanced Math: Nonlinear equations in one variable and systems of equations in two variables'],
  ['ADV.3', 'Advanced Math: Nonlinear functions'],
  ['PSD.1', 'Problem-Solving and Data Analysis: Ratios, rates, proportional relationships, and units'],
  ['PSD.2', 'Problem-Solving and Data Analysis: Percentages'],
  ['PSD.3', 'Problem-Solving and Data Analysis: One-variable data: distributions and measures of center and spread'],
  ['PSD.4', 'Problem-Solving and Data Analysis: Two-variable data: models and scatterplots'],
  ['PSD.5', 'Problem-Solving and Data Analysis: Probability and conditional probability'],
  ['PSD.6', 'Problem-Solving and Data Analysis: Inference from sample statistics and margin of error'],
  ['PSD.7', 'Problem-Solving and Data Analysis: Evaluating statistical claims: observational studies and experiments'],
  ['GEO.1', 'Geometry and Trigonometry: Area and volume'],
  ['GEO.2', 'Geometry and Trigonometry: Lines, angles, and triangles'],
  ['GEO.3', 'Geometry and Trigonometry: Right triangles and trigonometry'],
  ['GEO.4', 'Geometry and Trigonometry: Circles'],
];

export type TopicSet = {
  boardCode: string;
  subjectCode: string;
  sourceUrl: string | null;
  topics: [string, string][];
};

const CIE = 'https://www.cambridgeinternational.org/Images';
const PEARSON = 'https://qualifications.pearson.com/content/dam/pdf';

export const TOPIC_SETS: TopicSet[] = [
  {
    boardCode: 'CIE',
    subjectCode: '9702',
    sourceUrl: null, // from the Sang et al. coursebook contents
    topics: PHYSICS_9702,
  },
  {
    boardCode: 'CIE',
    subjectCode: '9709',
    sourceUrl: null, // from the Pemberton Pure Mathematics 1 coursebook contents
    topics: PURE_MATHS_1_9709,
  },
  { boardCode: 'CIE', subjectCode: '0580', sourceUrl: `${CIE}/662466-2025-2027-syllabus.pdf`, topics: IGCSE_MATHS_0580 },
  { boardCode: 'CIE', subjectCode: '0625', sourceUrl: `${CIE}/697209-2026-2028-syllabus.pdf`, topics: IGCSE_PHYSICS_0625 },
  { boardCode: 'CIE', subjectCode: '0606', sourceUrl: `${CIE}/662470-2025-2027-syllabus.pdf`, topics: IGCSE_ADD_MATHS_0606 },
  {
    boardCode: 'EDEXCEL',
    subjectCode: '4MA1',
    sourceUrl: `${PEARSON}/International%20GCSE/Mathematics%20A/2016/Specification%20and%20sample%20assessments/international-gcse-in-mathematics-spec-a.pdf`,
    topics: EDEXCEL_IGCSE_MATHS_4MA1,
  },
  {
    boardCode: 'EDEXCEL',
    subjectCode: '4PH1',
    sourceUrl: `${PEARSON}/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf`,
    topics: EDEXCEL_IGCSE_PHYSICS_4PH1,
  },
  {
    boardCode: 'EDEXCEL',
    subjectCode: 'WMA11',
    sourceUrl: `${PEARSON}/International%20Advanced%20Level/Mathematics/2018/Specification-and-Sample-Assessment/international-a-level-maths-spec.pdf`,
    topics: EDEXCEL_IAL_PURE_MATHS,
  },
  {
    boardCode: 'EDEXCEL',
    subjectCode: 'WPH11',
    sourceUrl: `${PEARSON}/International%20Advanced%20Level/Physics/2018/Specification%20and%20Sample%20Assessment/9781446957783_IAL_Physics_Iss3.pdf`,
    topics: EDEXCEL_IAL_PHYSICS_WPH11,
  },
  {
    boardCode: 'COLLEGEBOARD',
    subjectCode: 'SAT-MATH',
    sourceUrl: 'https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec-overview.pdf',
    topics: DIGITAL_SAT_MATH,
  },
];

/** Idempotent: safe to run repeatedly, never deletes anything. */
export async function seedSyllabusTopics(prisma: PrismaClient) {
  for (const set of TOPIC_SETS) {
    const board = await prisma.examBoard.findUnique({ where: { code: set.boardCode } });
    const course = board
      ? await prisma.course.findUnique({
          where: { boardId_subjectCode: { boardId: board.id, subjectCode: set.subjectCode } },
        })
      : null;
    if (!course) {
      console.warn(`! ${set.boardCode} ${set.subjectCode} not found, skipping (run the main seed first)`);
      continue;
    }
    for (const [code, title] of set.topics) {
      await prisma.syllabusTopic.upsert({
        where: { courseId_code: { courseId: course.id, code } },
        update: { title, sourceUrl: set.sourceUrl },
        create: { courseId: course.id, code, title, sourceUrl: set.sourceUrl },
      });
    }
    console.log(`✓ ${set.boardCode} ${set.subjectCode}: ${set.topics.length} topics`);
  }
}

if (import.meta.main) {
  const prisma = new PrismaClient();
  seedSyllabusTopics(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
