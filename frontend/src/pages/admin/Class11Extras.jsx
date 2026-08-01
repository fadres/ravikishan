import { useState } from 'react';

export default function Class11Extras() {
  // Dimensional Analysis
  const solve3x3 = (A, B) => {
    const det = (m) => 
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    const d = det(A);
    if (Math.abs(d) < 1e-9) return null;

    let results = [];
    for (let i = 0; i < 3; i++) {
      let Ai = A.map((row, rIdx) => row.map((val, cIdx) => cIdx === i ? B[rIdx] : val));
      results.push(det(Ai) / d);
    }
    return results;
  };

  const baseQuantities = {
    F: [1, 1, -2],
    V: [0, 1, -1],
    T: [0, 0, 1]
  };

  const targets = {
    Density: [1, -3, 0],
    Pressure: [1, -1, -2]
  };

  const A = [
    [baseQuantities.F[0], baseQuantities.V[0], baseQuantities.T[0]],
    [baseQuantities.F[1], baseQuantities.V[1], baseQuantities.T[1]],
    [baseQuantities.F[2], baseQuantities.V[2], baseQuantities.T[2]]
  ];

  const dimensionalAnalysis = [];
  for (let [name, targetVector] of Object.entries(targets)) {
    let [a, b, c] = solve3x3(A, targetVector);
    dimensionalAnalysis.push({
      name,
      exponents: { a, b, c },
      formula: `F^${a} V^${b} T^${c}`
    });
  }

  const compareDimensions = (d1, d2) => d1.every((val, idx) => val === d2[idx]);

  const addDimensions = (d1, d2) => {
    if (!compareDimensions(d1, d2)) {
      throw new Error("Cannot add terms with different dimensions!");
    }
    return d1;
  };

  const multiplyDimensions = (d1, d2) => d1.map((val, idx) => val + d2[idx]);

  const checkEquation = () => {
    const s = [0, 1, 0];
    const u = [0, 1, -1];
    const t = [0, 0, 1];
    const a = [0, 1, -2];
    const half = [0, 0, 0];

    const LHS = s;
    const term1 = multiplyDimensions(u, t);
    const t_squared = multiplyDimensions(t, t);
    const term2 = multiplyDimensions(half, multiplyDimensions(a, t_squared));

    try {
      const RHS = addDimensions(term1, term2);
      const isCorrect = compareDimensions(LHS, RHS);
      return {
        correct: isCorrect,
        details: { LHS, RHS }
      };
    } catch (err) {
      return {
        correct: false,
        error: err.message
      };
    }
  };

  const derivePendulumFormula = () => {
    const c = 1 / -2;
    const b = -c;
    const a = 0;

    return {
      exponents: { a, b, c },
      formula: `T = k * sqrt(l / g)`
    };
  };

  const convertUnit = (value, expM, expL, expT, fromSystem, toSystem) => {
    const ratioM = Math.pow(fromSystem.M / toSystem.M, expM);
    const ratioL = Math.pow(fromSystem.L / toSystem.L, expL);
    const ratioT = Math.pow(fromSystem.T / toSystem.T, expT);

    return value * ratioM * ratioL * ratioT;
  };

  const SI = { M: 1, L: 1, T: 1 };
  const CGS = { M: 0.001, L: 0.01, T: 1 };

  const unitConversion = convertUnit(1, 1, 2, -2, SI, CGS);

  const physicalQuantities = [
    { id: 1, name: "Density", symbol: "ρ", dimensions: { M: 1, L: -3, T: 0 }, formula: "M L⁻³" },
    { id: 2, name: "Pressure", symbol: "P", dimensions: { M: 1, L: -1, T: -2 }, formula: "M L⁻¹ T⁻²" },
    { id: 3, name: "Force", symbol: "F", dimensions: { M: 1, L: 1, T: -2 }, formula: "M L T⁻²" },
    { id: 4, name: "Work / Energy", symbol: "E", dimensions: { M: 1, L: 2, T: -2 }, formula: "M L² T⁻²" },
    { id: 5, name: "Power", symbol: "Pw", dimensions: { M: 1, L: 2, T: -3 }, formula: "M L² T⁻³" },
    { id: 6, name: "Linear Momentum", symbol: "p", dimensions: { M: 1, L: 1, T: -1 }, formula: "M L T⁻¹" },
    { id: 7, name: "Impulse", symbol: "I", dimensions: { M: 1, L: 1, T: -1 }, formula: "M L T⁻¹" },
    { id: 8, name: "Surface Tension", symbol: "γ", dimensions: { M: 1, L: 0, T: -2 }, formula: "M T⁻²" },
    { id: 9, name: "Dynamic Viscosity", symbol: "η", dimensions: { M: 1, L: -1, T: -1 }, formula: "M L⁻¹ T⁻¹" },
    { id: 10, name: "Frequency", symbol: "f", dimensions: { M: 0, L: 0, T: -1 }, formula: "T⁻¹" },
    { id: 11, name: "Torque", symbol: "τ", dimensions: { M: 1, L: 2, T: -2 }, formula: "M L² T⁻²" },
    { id: 12, name: "Gravitational Constant", symbol: "G", dimensions: { M: -1, L: 3, T: -2 }, formula: "M⁻¹ L³ T⁻²" },
    { id: 13, name: "Planck's Constant", symbol: "h", dimensions: { M: 1, L: 2, T: -1 }, formula: "M L² T⁻¹" },
    { id: 14, name: "Kinetic Energy", symbol: "K", dimensions: { M: 1, L: 2, T: -2 }, formula: "M L² T⁻²" },
    { id: 15, name: "Acceleration", symbol: "a", dimensions: { M: 0, L: 1, T: -2 }, formula: "L T⁻²" },
    { id: 16, name: "Modulus of Elasticity", symbol: "Y", dimensions: { M: 1, L: -1, T: -2 }, formula: "M L⁻¹ T⁻²" },
    { id: 17, name: "Moment of Inertia", symbol: "I_mi", dimensions: { M: 1, L: 2, T: 0 }, formula: "M L²" },
    { id: 18, name: "Angular Momentum", symbol: "L_ang", dimensions: { M: 1, L: 2, T: -1 }, formula: "M L² T⁻¹" },
    { id: 19, name: "Stress", symbol: "σ", dimensions: { M: 1, L: -1, T: -2 }, formula: "M L⁻¹ T⁻²" },
    { id: 20, name: "Gravitational Potential", symbol: "V_g", dimensions: { M: 0, L: 2, T: -2 }, formula: "L² T⁻²" }
  ];

  const [activeTab, setActiveTab] = useState('dimensional-analysis');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-extrabold text-white mb-6">Class 11 Extras</h1>

      <div className="glass rounded-2xl mb-6">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('dimensional-analysis')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors
              ${activeTab === 'dimensional-analysis'
                ? 'text-white bg-aqua-400/20 border-b-2 border-aqua-400'
                : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
          >
            Dimensional Analysis
          </button>
          <button
            onClick={() => setActiveTab('unit-conversion')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors
              ${activeTab === 'unit-conversion'
                ? 'text-white bg-aqua-400/20 border-b-2 border-aqua-400'
                : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
          >
            Unit Conversion
          </button>
        </div>
      </div>

      {activeTab === 'dimensional-analysis' && (
        <div className="space-y-6">
          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Dimensional Analysis</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-aqua-300 mb-2">Expression Models</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>• Density: M L⁻³</p>
                  <p>• Pressure: M L⁻¹ T⁻²</p>
                  <p>• Force: M L T⁻²</p>
                  <p>• Energy: M L² T⁻²</p>
                  <p>• Power: M L² T⁻³</p>
                  <p>• Momentum: M L T⁻¹</p>
                  <p>• Surface Tension: M T⁻²</p>
                  <p>• Viscosity: M L⁻¹ T⁻¹</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-aqua-300 mb-2">System Relationships</h3>
                <div className="bg-white/5 rounded-lg p-4 text-xs font-mono text-slate-200">
                  <p>baseQuantities = {</p>
                  <p>  F: [1, 1, -2],  // Force: M L T⁻²</p>
                  <p>  V: [0, 1, -1],  // Velocity: L T⁻¹</p>
                  <p>  T: [0, 0, 1]    // Time: T</p>
                  <p>}</p>
                </div>

                <div className="mt-3 space-y-2">
                  {dimensionalAnalysis.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-aqua-400/20 text-aqua-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-300">
                        {item.name}: {item.formula}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-aqua-300 mb-3">Equation Verification</h3>
              <div className="bg-white/5 rounded-lg p-4">
                {(() => {
                  const result = checkEquation();
                  return (
                    <div>
                      <p className={`text-sm mb-2 ${result.correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <strong>Equation s = ut + ½at² is {result.correct ? 'dimensionally CORRECT' : 'INVALID'}</strong>
                      </p>
                      {result.correct && (
                        <div className="text-xs text-slate-400">
                          <p>LHS (Displacement): [0, 1, 0]</p>
                          <p>RHS (ut + ½at²): [0, 1, 0]</p>
                        </div>
                      )}
                      {!result.correct && result.error && (
                        <p className="text-xs text-rose-300">Error: {result.error}</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-aqua-300 mb-3">Pendulum Formula Derivation</h3>
              <div className="bg-white/5 rounded-lg p-4">
                {(() => {
                  const result = derivePendulumFormula();
                  return (
                    <div>
                      <p className="text-sm text-slate-300 mb-2">
                        System of equations from T = k mᵃ lᵇ gᶜ where T has dimensions [T]
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/10 rounded p-2 text-center">
                          <p className="font-semibold text-aqua-300">M</p>
                          <p>a = 0</p>
                        </div>
                        <div className="bg-white/10 rounded p-2 text-center">
                          <p className="font-semibold text-aqua-300">L</p>
                          <p>b + c = 0</p>
                        </div>
                        <div className="bg-white/10 rounded p-2 text-center">
                          <p className="font-semibold text-aqua-300">T</p>
                          <p>-2c = 1</p>
                        </div>
                      </div>
                      <div className="mt-3 text-sm">
                        <p>Solutions: a = {result.exponents.a}, b = {result.exponents.b}, c = {result.exponents.c}</p>
                        <p className="text-emerald-400 font-semibold mt-1">Result: {result.formula}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'unit-conversion' && (
        <div className="space-y-6">
          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Unit Conversion</h2>

            <div className="bg-gradient-to-r from-aqua-400/20 to-purple-400/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Joule to Erg Conversion</h3>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-aqua-300">From: 1 Joule (SI System)</p>
                    <p className="text-xs text-slate-400">M: 1 kg, L: 1 m, T: 1 s</p>
                  </div>
                  <div>
                    <p className="font-semibold text-aqua-300">To: Ergs (CGS System)</p>
                    <p className="text-xs text-slate-400">M: 1 g, L: 1 cm, T: 1 s</p>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <p className="font-semibold text-emerald-400">
                      1 Joule = {unitConversion.toExponential()} Ergs
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      (1 kg × 1 m² / 1 s²) = (0.001 g) × (100 cm)² / 1 s² = 10⁷ g·cm²/s² = 10⁷ Ergs
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-aqua-300 mb-3">Physical Quantities Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-2 font-semibold text-slate-200">ID</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-200">Name</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-200">Symbol</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-200">Formula</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-200">Dimensions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {physicalQuantities.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-2 text-slate-300">{item.id}</td>
                        <td className="py-3 px-2 font-medium text-white">{item.name}</td>
                        <td className="py-3 px-2 text-aqua-300 font-mono">{item.symbol}</td>
                        <td className="py-3 px-2 text-slate-300">{item.formula}</td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-200">
                              M{item.dimensions.M >= 0 ? '+' : ''}{Math.abs(item.dimensions.M)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-200">
                              L{item.dimensions.L >= 0 ? '+' : ''}{Math.abs(item.dimensions.L)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-200">
                              T{item.dimensions.T >= 0 ? '+' : ''}{Math.abs(item.dimensions.T)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}