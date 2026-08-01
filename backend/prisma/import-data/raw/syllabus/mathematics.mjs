// Mathematics (Grade 11) syllabus — Secondary Education Curriculum 2078 (Mat. 007)
const mathSyllabus = {
  subject: 'mathematics',
  title: 'Mathematics Grade 11 Syllabus',
  code: 'Mat. 007',
  areas: [
    {
      area: 'Algebra',
      workingHours: 44,
      topics: [
        'Logic and Set: Statements, logical connectives, truth tables, set operation theorems',
        'Real numbers: Geometric representation, interval, absolute value',
        'Function: Domain and range, inverse and composite functions, algebraic (linear, quadratic, cubic) & transcendental (trigonometric, exponential, logarithmic) functions',
        'Curve sketching: Odd/even functions, periodicity, symmetry, monotonicity, graphing quadratic, cubic, rational, trigonometric, exponential, and logarithmic functions',
        'Sequence and series: Arithmetic, geometric, and harmonic sequences/series, AM/GM/HM relations, sum of infinite geometric series',
        'Matrices and determinants: Transpose, minors, cofactors, adjoint, inverse matrix, determinant properties',
        'Quadratic equation: Roots, nature of roots, relations with coefficients, symmetric roots, common roots',
        'Complex number: Imaginary unit, algebra, geometric representation, modulus, conjugate, square root',
      ],
    },
    {
      area: 'Trigonometry',
      workingHours: 12,
      topics: [
        'Inverse circular functions',
        'Trigonometric equations and general values',
      ],
    },
    {
      area: 'Analytic Geometry',
      workingHours: 20,
      topics: [
        'Straight Line: Perpendicular distance, bisectors of angles between lines',
        'Pair of straight lines: Second-degree general/homogeneous equations, angle between lines, angle bisectors',
        'Coordinates in space: Points in space, distance formula, direction cosines and ratios',
      ],
    },
    {
      area: 'Vectors',
      workingHours: 12,
      topics: [
        'Collinear and non-collinear vectors',
        'Coplanar and non-coplanar vectors',
        'Linear combination of vectors',
        'Linearly dependent and independent vectors',
      ],
    },
    {
      area: 'Statistics and Probability',
      workingHours: 12,
      topics: [
        "Measure of Dispersion: Standard deviation, variance, coefficient of variation, Karl Pearson's coefficient of skewness",
        'Probability: Independent cases, mathematical & empirical definitions, basic laws of probability',
      ],
    },
    {
      area: 'Calculus',
      workingHours: 48,
      topics: [
        'Limits and continuity: Indeterminate forms, limit theorems, continuity, types of discontinuity',
        'Derivatives: Definition, rules of differentiation, implicit/parametric functions, higher-order derivatives, geometric interpretation, monotonicity, extreme values, concavity, inflection points',
        'Anti-derivatives: Basic integrals, integration by substitution and parts, definite integrals, area under/between curves',
      ],
    },
    {
      area: 'Computational Methods OR Mechanics',
      workingHours: 12,
      topics: [
        'Numerical computation: Bisection and Newton-Raphson methods',
        'Numerical integration: Trapezoidal rule and Simpson\'s rule',
        'Statics: Forces, resultant forces, parallelogram law, composition/resolution of coplanar forces',
        'Dynamics: Straight-line motion, uniform acceleration, motion under gravity, motion down smooth inclined planes',
      ],
    },
  ],
};

export default mathSyllabus;
