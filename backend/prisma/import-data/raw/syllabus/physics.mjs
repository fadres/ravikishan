// Physics XI syllabus — Secondary Education Curriculum 2076 (Phy. 101)
// Extracted from the user-supplied syllabus data for content restructuring.
const physicsSyllabus = {
  subject: 'physics',
  title: 'Physics XI Syllabus',
  code: 'Phy. 101',
  areas: [
    {
      area: 'Mechanics',
      units: [
        { unitNumber: 1, unitTitle: 'Physical Quantities', teachingHours: 3, topics: ['Precision and significant figures. Dimensions and uses of dimensional analysis.'] },
        { unitNumber: 2, unitTitle: 'Vectors', teachingHours: 4, topics: ['Triangle, parallelogram and polygon laws of vectors', 'Resolution of vectors; Unit vectors', 'Scalar and vector products.'] },
        { unitNumber: 3, unitTitle: 'Kinematics', teachingHours: 5, topics: ['Instantaneous velocity and acceleration', 'Relative velocity', 'Equation of motion (graphical treatment)', 'Motion of a freely falling body', 'Projectile motion and its applications.'] },
        { unitNumber: 4, unitTitle: 'Dynamics', teachingHours: 6, topics: ['Linear momentum, Impulse', 'Conservation of linear momentum', "Application of Newton's laws", 'Moment, torque and equilibrium', 'Solid friction: Laws of solid friction and their verifications.'] },
        { unitNumber: 5, unitTitle: 'Work, Energy and Power', teachingHours: 6, topics: ['Work done by a constant force and a variable force', 'Power', 'Work-energy theorem; Kinetic and potential energy', 'Conservation of Energy', 'Conservative and non-conservative forces', 'Elastic and inelastic collisions'] },
        { unitNumber: 6, unitTitle: 'Circular Motion', teachingHours: 6, topics: ['Angular displacement, velocity and acceleration', 'Relation between angular and linear velocity and acceleration', 'Centripetal acceleration', 'Centripetal force', 'Conical pendulum', 'Motion in a vertical circle', 'Applications of banking.'] },
        { unitNumber: 7, unitTitle: 'Gravitation', teachingHours: 10, topics: ["Newton's law of gravitation", 'Gravitational field strength', 'Gravitational potential; Gravitational potential energy', "Variation in value of 'g' due to altitude and depth", 'Centre of mass and centre of gravity', 'Motion of a satellite: Orbital velocity and time period of the satellite', 'Escape velocity', 'Potential and kinetic energy of the satellite', 'Geostationary satellite', 'GPS'] },
        { unitNumber: 8, unitTitle: 'Elasticity', teachingHours: 5, topics: ["Hooke's law: Force constant", 'Stress; Strain; Elasticity and plasticity', 'Elastic modulus: Young modulus, bulk modulus, shear modulus', "Poisson's ratio", 'Elastic potential energy.'] },
      ],
    },
    {
      area: 'Heat and Thermodynamics',
      units: [
        { unitNumber: 9, unitTitle: 'Heat and Temperature', teachingHours: 3, topics: ['Molecular concept of thermal energy, heat and temperature, and cause and direction of heat flow', 'Meaning of thermal equilibrium and Zeroth law of thermodynamics.', 'Thermal equilibrium as a working principle of a mercury thermometer.'] },
        { unitNumber: 10, unitTitle: 'Thermal Expansion', teachingHours: 4, topics: ['Linear expansion and its measurement', 'Cubical expansion, superficial expansion and its relation with linear expansion', 'Liquid Expansion: Absolute and apparent', 'Dulong and Petit method of determining expansivity of liquid'] },
        { unitNumber: 11, unitTitle: 'Quantity of Heat', teachingHours: 6, topics: ["Newton's law of cooling", 'Measurement of specific heat capacity of solids and liquids', 'Change of phases: Latent heat', 'Specific latent heat of fusion and vaporization', 'Measurement of specific latent heat of fusion and vaporization', 'Triple point'] },
        { unitNumber: 12, unitTitle: 'Rate of Heat Flow', teachingHours: 5, topics: ['Conduction: Thermal conductivity and measurement', 'Convection', 'Radiation: Ideal radiator', 'Black-body radiation', 'Stefan-Boltzmann law'] },
        { unitNumber: 13, unitTitle: 'Ideal Gas', teachingHours: 8, topics: ['Ideal gas equation', 'Molecular properties of matter', 'Kinetic-molecular model of an ideal gas', 'Derivation of pressure exerted by gas', 'Average translational kinetic energy of gas molecule', 'Boltzmann constant, root mean square speed', 'Heat capacities: gases and solids'] },
      ],
    },
    {
      area: 'Waves & Optics',
      units: [
        { unitNumber: 14, unitTitle: 'Reflection at Curved Mirror', teachingHours: 2, topics: ['Real and Virtual images', 'Mirror formula'] },
        { unitNumber: 15, unitTitle: 'Refraction at Plane Surfaces', teachingHours: 4, topics: ['Laws of refraction: Refractive index', 'Relation between refractive indices', 'Lateral shift', 'Total internal reflection'] },
        { unitNumber: 16, unitTitle: 'Refraction Through Prisms', teachingHours: 4, topics: ['Minimum deviation condition', 'Relation between the angle of prism, minimum deviation and refractive index', 'Deviation in small-angle prism'] },
        { unitNumber: 17, unitTitle: 'Lenses', teachingHours: 3, topics: ['Spherical lenses, angular magnification', "Lens maker's formula", 'Power of a lens'] },
        { unitNumber: 18, unitTitle: 'Dispersion', teachingHours: 3, topics: ['Pure spectrum and dispersive power', 'Chromatic and spherical aberration', 'Achromatism and its applications'] },
      ],
    },
    {
      area: 'Electricity & Magnetism',
      units: [
        { unitNumber: 19, unitTitle: 'Electric Charges', teachingHours: 3, topics: ['Electric charges', 'Charging by induction', "Coulomb's law- Force between two point charges", 'Force between multiple electric charges.'] },
        { unitNumber: 20, unitTitle: 'Electric Field', teachingHours: 3, topics: ['Electric field due to point charges; Field lines', 'Gauss Law: Electric Flux', 'Application of Gauss law: Field of a charge sphere, line charge, charged plane conductor'] },
        { unitNumber: 21, unitTitle: 'Potential, Potential Difference and Potential Energy', teachingHours: 4, topics: ['Potential difference, Potential due to a point, Charge, potential energy, electron volt', 'Equipotential lines and surfaces', 'Potential gradient'] },
        { unitNumber: 22, unitTitle: 'Capacitor', teachingHours: 5, topics: ['Capacitance and capacitor', 'Parallel plate capacitor', 'Combination of capacitors', 'Energy of charged capacitor', 'Effect of a dielectric Polarization and displacement.'] },
        { unitNumber: 23, unitTitle: 'DC Circuits', teachingHours: 10, topics: ['Electric Currents; Drift velocity and its relation with current', "Ohm's law; Electrical Resistance; Resistivity; Conductivity", 'Current-voltage relations; Ohmic and Non-Ohmic resistance', 'Resistances in series and parallel', 'Potential divider', 'Electromotive force of a source, internal resistance', 'Work and power in electrical circuits'] },
      ],
    },
    {
      area: 'Modern Physics',
      units: [
        { unitNumber: 24, unitTitle: 'Nuclear Physics', teachingHours: 4, topics: ['Nucleus: Discovery of nucleus', 'Nuclear density; Mass number; Atomic number', 'Atomic mass; Isotopes', "Einstein's mass-energy relation", 'Mass Defect, packing fraction, BE per nucleon', 'Creation and annihilation', 'Nuclear fission and fusion'] },
        { unitNumber: 25, unitTitle: 'Solids', teachingHours: 3, topics: ['Energy bands in solids (qualitative ideas)', 'Difference between metals, insulators and semiconductors using band theory', 'Intrinsic and extrinsic semiconductors'] },
        { unitNumber: 26, unitTitle: 'Recent Trends in Physics', teachingHours: 6, topics: ['Particle physics: Particles and antiparticles, Quarks (baryons and meson) and leptons (neutrinos)', 'Universe: Big Bang and Hubble law: expansion of the Universe, Dark matter, Black Hole and gravitational wave'] },
      ],
    },
  ],
};

export default physicsSyllabus;
