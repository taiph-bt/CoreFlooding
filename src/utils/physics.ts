import { CoreyParameters, NUM_LAYERS, NUM_SLICES, SimulationParams, WelgeAnalysis, WettabilityType } from '../types/simulator';

export const WETTABILITY_PRESETS: Record<Exclude<WettabilityType, 'custom'>, CoreyParameters> = {
  'water-wet': {
    Swi: 0.20,
    Sor: 0.20,
    krwMax: 0.25,
    kroMax: 1.00,
    nw: 3.5,
    no: 2.0,
  },
  'mixed-wet': {
    Swi: 0.15,
    Sor: 0.25,
    krwMax: 0.50,
    kroMax: 0.85,
    nw: 2.5,
    no: 2.5,
  },
  'oil-wet': {
    Swi: 0.10,
    Sor: 0.35,
    krwMax: 0.75,
    kroMax: 0.55,
    nw: 1.8,
    no: 3.2,
  },
};

/**
 * Natural geological permeability profile across the 7 horizontal layers
 * Smooth continuous distribution without saw-tooth zigzags.
 * Dynamic based on heterogeneity level:
 * - 'uniform': homogeneous core (all layers 1.0x)
 * - 'moderate': natural sediment layering (channel in middle, 0.75x to 1.45x)
 * - 'high': strong permeable thief zone channel (0.2x to 2.4x)
 */
export function getLayerPermFactors(heterogeneity: 'uniform' | 'moderate' | 'high' = 'moderate'): number[] {
  switch (heterogeneity) {
    case 'uniform':
      return [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    case 'high':
      // Pronounced high-perm thief channel (Layer 3 & 2)
      return [0.40, 0.60, 1.60, 2.40, 1.30, 0.50, 0.20];
    case 'moderate':
    default:
      // Smooth natural geological stratification (continuous, no jagged zigzag)
      return [0.75, 0.90, 1.25, 1.45, 1.20, 0.85, 0.60];
  }
}

/**
 * Normalized water saturation S*
 */
export function getNormalizedSw(Sw: number, Swi: number, Sor: number): number {
  if (Sw <= Swi) return 0;
  if (Sw >= 1 - Sor) return 1;
  const denom = 1 - Swi - Sor;
  return denom > 0 ? (Sw - Swi) / denom : 0;
}

/**
 * Corey relative permeabilities
 */
export function calculateRelPerm(
  Sw: number,
  params: CoreyParameters
): { krw: number; kro: number } {
  const S_star = getNormalizedSw(Sw, params.Swi, params.Sor);

  const krw = params.krwMax * Math.pow(S_star, params.nw);
  const kro = params.kroMax * Math.pow(1 - S_star, params.no);

  return {
    krw: Math.max(0, Math.min(1, krw)),
    kro: Math.max(0, Math.min(1, kro)),
  };
}

/**
 * Core geometrical properties, exact volumes, velocities, and calibrated time
 */
export function getCoreGeometry(params: SimulationParams) {
  const radiusCm = params.diamCm / 2;
  const areaCm2 = Math.PI * radiusCm * radiusCm;
  const bulkVolumeCm3 = areaCm2 * params.lengthCm;
  const poreVolumeCm3 = bulkVolumeCm3 * params.phi;
  const effectiveCorey = getEffectiveCorey(params);
  const ooipCm3 = poreVolumeCm3 * (1 - effectiveCorey.Swi);

  // Conversion factors to SI
  const areaM2 = areaCm2 * 1e-4;
  const lengthM = params.lengthCm * 1e-2;

  // Injection rate:
  // If user typed in cm3/s: qCm3Sec = rateValue
  // If user typed in cm3/min: qCm3Sec = rateValue / 60
  const qCm3Sec = params.rateUnit === 'cm3/s'
    ? params.rateValue
    : (params.rateCm3Min ? params.rateCm3Min / 60.0 : params.rateValue / 60.0);

  const qCm3Min = qCm3Sec * 60.0;
  const qM3s = qCm3Sec * 1e-6; // cm3/s -> m3/s

  // Darcy total velocity (cm/s and m/s)
  // ut = q / A
  const utCmSec = areaCm2 > 0 ? qCm3Sec / areaCm2 : 0;
  const utMs = utCmSec * 1e-2;

  // Interstitial pore velocity (cm/s)
  // vp = ut / phi = (q * L) / Vp
  const vpCmSec = params.phi > 0 ? utCmSec / params.phi : 0;

  // Time to inject 1.0 Pore Volume in physical seconds:
  // t_1PV = Vp / q
  // Example: Vp = 100 cc, q = 1 cc/s -> t_1PV = 100.0 seconds!
  const timeTo1PV_sec = qCm3Sec > 0 ? poreVolumeCm3 / qCm3Sec : 0;
  const timeTo1PV_min = timeTo1PV_sec / 60.0;

  const kM2 = params.permMD * 9.869233e-16; // mD -> m^2

  return {
    areaCm2,
    bulkVolumeCm3,
    poreVolumeCm3,
    ooipCm3,
    areaM2,
    lengthM,
    qCm3Sec,
    qCm3Min,
    qM3s,
    utCmSec,
    utMs,
    vpCmSec,
    timeTo1PV_sec,
    timeTo1PV_min,
    kM2,
  };
}

/**
 * Compute exact Buckley-Leverett frontal advance speed and velocities
 */
export function calculateFrontalVelocities(
  params: SimulationParams,
  welge: WelgeAnalysis
) {
  const geom = getCoreGeometry(params);

  // Buckley-Leverett shock front speed:
  // vf = vp * (dfw/dSw)_shock = vp / PVI_BT (cm/s)
  // Physical meaning: velocity of the water displacement shock front
  const vfCmSec = welge.pvi_BT > 0 ? geom.vpCmSec / welge.pvi_BT : geom.vpCmSec;
  const vfMmSec = vfCmSec * 10.0; // mm/s
  const vfCmMin = vfCmSec * 60.0; // cm/min

  // Breakthrough time in physical seconds:
  // t_BT = L / vf = t_1PV * PVI_BT
  // Example: if t_1PV = 100 s and PVI_BT = 0.65 -> t_BT = 65.0 seconds!
  const t_BT_sec = geom.timeTo1PV_sec * welge.pvi_BT;
  const t_BT_min = t_BT_sec / 60.0;

  return {
    qCm3Sec: geom.qCm3Sec,
    qCm3Min: geom.qCm3Min,
    utCmSec: geom.utCmSec,
    utCmMin: geom.utCmSec * 60.0,
    vpCmSec: geom.vpCmSec,
    vpCmMin: geom.vpCmSec * 60.0,
    vfCmSec,
    vfMmSec,
    vfCmMin,
    timeTo1PV_sec: geom.timeTo1PV_sec,
    timeTo1PV_min: geom.timeTo1PV_min,
    t_BT_sec,
    t_BT_min,
  };
}

/**
 * Get effective Corey parameters accounting for EOR (polymer/surfactant)
 */
export function getEffectiveCorey(params: SimulationParams): CoreyParameters {
  const base = { ...params.corey };
  if (params.eorMode === 'surfactant') {
    base.Sor = Math.max(0.05, base.Sor * params.surfactantSorRed);
    base.krwMax = Math.min(0.9, base.krwMax * 1.15);
  }
  return base;
}

/**
 * Get effective viscosities accounting for EOR
 */
export function getEffectiveViscosities(params: SimulationParams): { muW: number; muO: number } {
  let muW = params.muW;
  const muO = params.muO;

  if (params.eorMode === 'polymer') {
    muW = params.muW * params.polymerViscBoost;
  }
  return { muW, muO };
}

/**
 * Endpoint Mobility Ratio M
 * M = (krw_max / mu_w) / (kro_max / mu_o)
 */
export function calculateMobilityRatio(params: SimulationParams): number {
  const corey = getEffectiveCorey(params);
  const { muW, muO } = getEffectiveViscosities(params);

  const lambdaW_max = corey.krwMax / muW;
  const lambdaO_max = corey.kroMax / muO;

  return lambdaO_max > 0 ? lambdaW_max / lambdaO_max : 1.0;
}

/**
 * Fractional Flow fw(Sw)
 * Including 1D Buckley-Leverett formulation and vertical dip angle gravity term
 */
export function calculateFractionalFlow(
  Sw: number,
  params: SimulationParams
): number {
  const corey = getEffectiveCorey(params);
  if (Sw <= corey.Swi) return 0;
  if (Sw >= 1 - corey.Sor) return 1;

  const { krw, kro } = calculateRelPerm(Sw, corey);
  const { muW, muO } = getEffectiveViscosities(params);

  if (krw <= 1e-7) return 0;
  if (kro <= 1e-7) return 1;

  const muW_Pa_s = muW * 1e-3;
  const muO_Pa_s = muO * 1e-3;

  let gravityTerm = 0;
  if (params.includeGravity && params.orientationDeg !== 0) {
    const geom = getCoreGeometry(params);
    const g = 9.80665;
    const thetaRad = (params.orientationDeg * Math.PI) / 180;
    const deltaRhoKgM3 = (params.rhoW - params.rhoO) * 1000;

    if (geom.utMs > 1e-12) {
      gravityTerm = (geom.kM2 * kro * deltaRhoKgM3 * g * Math.sin(thetaRad)) / (geom.utMs * muO_Pa_s);
    }
  }

  const viscosityRatio = (kro * muW_Pa_s) / (krw * muO_Pa_s);
  const fw = (1 - gravityTerm) / (1 + viscosityRatio);

  return Math.max(0, Math.min(1, fw));
}

/**
 * Numerical derivative df_w / dS_w
 */
export function calculateDfwdSw(Sw: number, params: SimulationParams): number {
  const dSw = 0.001;
  const Sw1 = Math.max(0.001, Sw - dSw);
  const Sw2 = Math.min(0.999, Sw + dSw);
  const fw1 = calculateFractionalFlow(Sw1, params);
  const fw2 = calculateFractionalFlow(Sw2, params);
  return (fw2 - fw1) / (Sw2 - Sw1);
}

/**
 * Welge Tangent Construction
 * By Buckley-Leverett (1942) and Welge (1952) theory:
 * The shock front saturation Swf from (Swi, 0) is the saturation that MAXIMIZES
 * the chord slope m(Sw) = fw(Sw) / (Sw - Swi).
 * At this maximum, m_max = (dfw / dSw)_shock = tangent slope.
 * Breakthrough PVI: PVI_BT = 1 / tangent slope.
 * Average water saturation at breakthrough: avgSw_BT = Swi + PVI_BT = Swf + (1 - fwf) / tangent slope.
 */
export function solveWelgeTangent(params: SimulationParams): WelgeAnalysis {
  const corey = getEffectiveCorey(params);
  const Swi = corey.Swi;
  const SwMax = 1 - corey.Sor;

  let maxSlope = 0;
  let bestSwf = (Swi + SwMax) / 2;
  let bestFwf = 0.5;

  // Search over 600 steps across the mobile saturation window [Swi + 0.005, SwMax]
  const numSteps = 600;
  const dSw = (SwMax - Swi) / numSteps;

  for (let i = 1; i <= numSteps; i++) {
    const Sw = Swi + i * dSw;
    const fw = calculateFractionalFlow(Sw, params);

    // Skip initial negligible values near Swi to avoid flat-region false artifacts
    if (fw <= 1e-5) continue;

    const chordSlope = fw / (Sw - Swi);
    if (chordSlope > maxSlope) {
      maxSlope = chordSlope;
      bestSwf = Sw;
      bestFwf = fw;
    }
  }

  // Refine around the peak with fine sub-stepping
  if (maxSlope > 0) {
    const refineWindow = 0.03;
    const SwStart = Math.max(Swi + 0.002, bestSwf - refineWindow);
    const SwEnd = Math.min(SwMax, bestSwf + refineWindow);
    const fineSteps = 150;
    const dSwFine = (SwEnd - SwStart) / fineSteps;

    for (let k = 0; k <= fineSteps; k++) {
      const Sw = SwStart + k * dSwFine;
      const fw = calculateFractionalFlow(Sw, params);
      const chordSlope = fw / (Sw - Swi);
      if (chordSlope > maxSlope) {
        maxSlope = chordSlope;
        bestSwf = Sw;
        bestFwf = fw;
      }
    }
  }

  // Fallback for extreme linear or completely piston conditions
  if (maxSlope <= 0.05 || !isFinite(maxSlope)) {
    bestSwf = SwMax;
    bestFwf = 1.0;
    maxSlope = 1.0 / Math.max(0.01, SwMax - Swi);
  }

  const tangentSlope = maxSlope;
  const pvi_BT = 1.0 / tangentSlope; // PVI at water breakthrough
  const avgSw_BT = Math.min(SwMax, Math.max(bestSwf, Swi + pvi_BT));
  const recovery_BT = Math.max(0, Math.min(100, ((avgSw_BT - Swi) / (1 - Swi)) * 100));
  const isPistonDisplacement = bestSwf >= SwMax - 0.04;

  return {
    Swf: bestSwf,
    fwf: bestFwf,
    df_dSw_shock: tangentSlope,
    pvi_BT: Math.max(0.01, pvi_BT),
    avgSw_BT,
    recovery_BT,
    tangentSlope,
    isPistonDisplacement,
  };
}

/**
 * Calculate instantaneous pressure drop across the 2D core (average of 7 layers) in psi
 * Following Darcy's Law for multiphase fluid flow in porous media:
 * ΔP = ∫ [ut / (k * λ_total)] dx + ΔP_gravity
 */
export function calculatePressureDropPsi(
  gridSw2D: number[][],
  params: SimulationParams
): number {
  const geom = getCoreGeometry(params);
  const corey = getEffectiveCorey(params);
  const { muW, muO } = getEffectiveViscosities(params);

  const muW_Pa_s = muW * 1e-3;
  const muO_Pa_s = muO * 1e-3;
  const N_slices = gridSw2D[0]?.length || NUM_SLICES;
  const N_layers = gridSw2D.length || NUM_LAYERS;
  const dxM = geom.lengthM / N_slices;
  const g = 9.80665;
  const thetaRad = (params.orientationDeg * Math.PI) / 180;
  const sinTheta = Math.sin(thetaRad);

  const layerFactors = getLayerPermFactors(params.heterogeneityLevel);
  let layerDeltaPSum = 0;

  for (let j = 0; j < N_layers; j++) {
    let layerDP_Pa = 0;
    const layerPermFactor = layerFactors[j] || 1.0;
    const k_layer_M2 = geom.kM2 * layerPermFactor;

    for (let i = 0; i < N_slices; i++) {
      const Sw = gridSw2D[j][i];
      const { krw, kro } = calculateRelPerm(Sw, corey);

      const lambdaW = krw / muW_Pa_s;
      const lambdaO = kro / muO_Pa_s;
      const lambdaT = Math.max(1e-10, lambdaW + lambdaO);

      const dP_visc = (geom.utMs * dxM) / (k_layer_M2 * lambdaT);

      let dP_grav = 0;
      if (params.includeGravity && params.orientationDeg !== 0) {
        const rhoMixKgM3 = (Sw * params.rhoW + (1 - Sw) * params.rhoO) * 1000;
        dP_grav = rhoMixKgM3 * g * sinTheta * dxM;
      }

      layerDP_Pa += dP_visc + dP_grav;
    }
    layerDeltaPSum += layerDP_Pa;
  }

  const avgDeltaP_Pa = layerDeltaPSum / N_layers;
  const totalDeltaPPsi = avgDeltaP_Pa * 0.0001450377;
  return Math.max(0.01, totalDeltaPPsi);
}

/**
 * 2D Finite-Volume Multiphase Darcy Solver Step:
 * 7 horizontal layers (j = 0 to 6; Layer 0 = Top, Layer 6 = Bottom)
 * 100 axial slices (i = 0 to 99; 0 = Inlet, 99 = Outlet)
 *
 * Implements:
 * 1. Exact physical volume and injection rate calibration (strict conservation).
 * 2. Distinct gravity segregation (buoyancy underrun tongue in bottom layers L5-L6 when Gravity is ON).
 * 3. Clear viscous fingering when Mobility Ratio M > 1 in heterogeneous permeable layers.
 * 4. Piston-like displacement when M <= 1 (e.g. Polymer Flood).
 * 5. Smooth continuous front (geological continuity without artificial digital zigzag).
 */
export function stepSimulation2D(
  gridSw2D: number[][],
  params: SimulationParams,
  dtPvi: number
): {
  newGridSw2D: number[][];
  avgSwProfile: number[];
  waterCutOutlet: number;
  layerSwOutlet: number[];
  avgSw: number;
  deltaPPsi: number;
} {
  const N_layers = NUM_LAYERS; // 7
  const N_slices = NUM_SLICES; // 100
  const corey = getEffectiveCorey(params);
  const Swi = corey.Swi;
  const SwMax = 1 - corey.Sor;
  const dxPVI = 1.0 / N_slices;

  const M = calculateMobilityRatio(params);
  const { muW, muO } = getEffectiveViscosities(params);
  const layerPermFactors = getLayerPermFactors(params.heterogeneityLevel);

  let currentGrid = gridSw2D.map((row) => [...row]);

  // Sub-stepping for CFL numerical stability
  const maxCourant = 0.35;
  const maxCFL_dt = maxCourant * dxPVI;
  const subSteps = Math.max(1, Math.ceil(dtPvi / maxCFL_dt));
  const subDt = dtPvi / subSteps;

  for (let s = 0; s < subSteps; s++) {
    const nextGrid: number[][] = Array.from({ length: N_layers }, () => new Array<number>(N_slices));

    // A. LAYER VELOCITY ALLOCATION (Viscous fingering & heterogeneity)
    // Conductance of each layer based on integrated resistance:
    // C_j = k_j / ∫ (1 / λ_t) dx
    const layerConductance = new Float64Array(N_layers);
    let totalConductance = 0;

    for (let j = 0; j < N_layers; j++) {
      let layerResist = 0;
      const permFactor = layerPermFactors[j];

      for (let i = 0; i < N_slices; i++) {
        const Sw = currentGrid[j][i];
        const { krw, kro } = calculateRelPerm(Sw, corey);
        const lambdaT = (krw / muW) + (kro / muO);
        layerResist += 1.0 / Math.max(1e-5, lambdaT);
      }

      // Viscous fingering physics:
      // When M > 1, the high-permeability streak (Layer 2 & 3) draws disproportionately more flux,
      // creating distinct, smooth fingers!
      // When M <= 1 (e.g. Polymer), the flow self-stabilizes into a uniform piston.
      const fingerPower = M > 1.2 ? Math.min(2.5, 0.9 + 0.35 * Math.log(M)) : 0.8;
      const conductance = Math.pow(permFactor, fingerPower) * (N_slices / Math.max(0.1, layerResist));

      layerConductance[j] = conductance;
      totalConductance += conductance;
    }

    // Normalized velocity allocated to each layer (sum = N_layers, mean = 1.0)
    const layerVelocity = new Float64Array(N_layers);
    for (let j = 0; j < N_layers; j++) {
      layerVelocity[j] = (layerConductance[j] / Math.max(1e-8, totalConductance)) * N_layers;
    }

    // B. AXIAL BUCKLEY-LEVERETT ADVANCE ALONG EACH LAYER (100 SLICES)
    for (let j = 0; j < N_layers; j++) {
      const row = currentGrid[j];
      const v_j = layerVelocity[j];
      const fluxes = new Float64Array(N_slices + 1);

      fluxes[0] = 1.0; // 100% water injected at inlet face (x=0)
      for (let i = 1; i < N_slices; i++) {
        fluxes[i] = calculateFractionalFlow(row[i - 1], params);
      }
      fluxes[N_slices] = calculateFractionalFlow(row[N_slices - 1], params);

      for (let i = 0; i < N_slices; i++) {
        const dSw_axial = (subDt * v_j / dxPVI) * (fluxes[i] - fluxes[i + 1]);
        nextGrid[j][i] = row[i] + dSw_axial;
      }
    }

    // C. VERTICAL GRAVITY SEGREGATION & BUOYANCY CROSSFLOW
    // When Gravity is ON:
    // Water (density rhoW ~ 1.0) is heavier than oil (density rhoO ~ 0.85).
    // In horizontal core: gravity acts downwards perpendicular to flow.
    // Water slumps from Layer j down to Layer j+1.
    // Oil buoys upward from Layer j+1 up to Layer j.
    // This creates a pronounced, realistic GRAVITY TONGUE / UNDERRUN in the bottom layers (L5, L6)!
    if (params.includeGravity) {
      const thetaRad = (params.orientationDeg * Math.PI) / 180;
      const cosTheta = Math.cos(thetaRad); // 1.0 for horizontal, 0.0 for vertical

      if (cosTheta > 0.05) {
        // Horizontal / tilted gravity slumping
        const deltaRho = Math.max(0.04, params.rhoW - params.rhoO); // e.g. 0.15 g/cm3
        // Distinct physical gravity rate:
        const gravRate = 0.55 * (deltaRho / 0.15) * (3.0 / muO) * (params.permMD / 150) * cosTheta;

        for (let i = 0; i < N_slices; i++) {
          for (let j = 0; j < N_layers - 1; j++) {
            const Sw_top = nextGrid[j][i];
            const Sw_bottom = nextGrid[j + 1][i];

            if (Sw_top > Swi && Sw_bottom < SwMax) {
              const { krw: krwTop } = calculateRelPerm(Sw_top, corey);
              const { kro: kroBottom } = calculateRelPerm(Sw_bottom, corey);

              // Downward water segregation flux
              const segFlux = gravRate * krwTop * Math.max(0.12, kroBottom) * subDt;
              const maxExchange = Math.min(
                (Sw_top - Swi) * 0.65,
                (SwMax - Sw_bottom) * 0.65,
                segFlux
              );

              if (maxExchange > 0) {
                nextGrid[j][i] -= maxExchange;
                nextGrid[j + 1][i] += maxExchange;
              }
            }
          }
        }
      }
    }

    // D. TRANSVERSE CAPILLARY EQUILIBRATION (Ensures smooth front continuity, no digital zigzag!)
    const transverseDiff = 0.012 * subDt;
    for (let i = 1; i < N_slices - 1; i++) {
      for (let j = 0; j < N_layers; j++) {
        let diff = 0;
        if (j > 0) diff += (currentGrid[j - 1][i] - currentGrid[j][i]);
        if (j < N_layers - 1) diff += (currentGrid[j + 1][i] - currentGrid[j][i]);
        nextGrid[j][i] += diff * transverseDiff;
      }
    }

    // Physical saturation clamping
    for (let j = 0; j < N_layers; j++) {
      for (let i = 0; i < N_slices; i++) {
        nextGrid[j][i] = Math.max(Swi, Math.min(SwMax, nextGrid[j][i]));
      }
    }

    currentGrid = nextGrid;
  }

  // Column-averaged saturation profile across the 100 slices
  const avgSwProfile = new Array<number>(N_slices);
  for (let i = 0; i < N_slices; i++) {
    let colSum = 0;
    for (let j = 0; j < N_layers; j++) {
      colSum += currentGrid[j][i];
    }
    avgSwProfile[i] = colSum / N_layers;
  }

  // Outlet face saturation and effluent water cut
  const layerSwOutlet = new Array<number>(N_layers);
  let totalEffluentFw = 0;
  for (let j = 0; j < N_layers; j++) {
    const swOut = currentGrid[j][N_slices - 1];
    layerSwOutlet[j] = swOut;
    totalEffluentFw += calculateFractionalFlow(swOut, params);
  }
  const waterCutOutlet = totalEffluentFw / N_layers;

  // Average core saturation
  let totalSw = 0;
  for (let j = 0; j < N_layers; j++) {
    for (let i = 0; i < N_slices; i++) {
      totalSw += currentGrid[j][i];
    }
  }
  const avgSw = totalSw / (N_layers * N_slices);

  const deltaPPsi = calculatePressureDropPsi(currentGrid, params);

  return {
    newGridSw2D: currentGrid,
    avgSwProfile,
    waterCutOutlet,
    layerSwOutlet,
    avgSw,
    deltaPPsi,
  };
}

/**
 * Generate CSV data for export
 */
export function exportToCSV(
  history: {
    pvi: number;
    timeSeconds: number;
    timeMinutes: number;
    deltaPPsi: number;
    recoveryFactor: number;
    waterCut: number;
    cumOilProducedCm3: number;
    cumWaterProducedCm3: number;
    avgSw: number;
    frontSpeedCmSec?: number;
  }[],
  params: SimulationParams
): string {
  const geom = getCoreGeometry(params);
  const headerLines = [
    `# Core Flood Simulator Data Export - PetroVietnam University (PVU)`,
    `# Porosity (phi): ${params.phi}`,
    `# Permeability (k mD): ${params.permMD}`,
    `# Core Dimensions: L=${params.lengthCm} cm, D=${params.diamCm} cm`,
    `# Pore Volume: ${geom.poreVolumeCm3.toFixed(2)} cm3`,
    `# OOIP: ${geom.ooipCm3.toFixed(2)} cm3`,
    `# Injection Rate: ${geom.qCm3Sec.toFixed(3)} cc/s (${geom.qCm3Min.toFixed(2)} cc/min)`,
    `# Time to 1.0 PV: ${geom.timeTo1PV_sec.toFixed(1)} seconds`,
    `PVI,Time_sec,Time_min,DeltaP_psi,Recovery_Percent,WaterCut_fw,CumOil_cm3,CumWater_cm3,Avg_Sw`,
  ];

  const dataRows = history.map((pt) =>
    [
      pt.pvi.toFixed(4),
      pt.timeSeconds.toFixed(2),
      pt.timeMinutes.toFixed(2),
      pt.deltaPPsi.toFixed(2),
      pt.recoveryFactor.toFixed(2),
      pt.waterCut.toFixed(4),
      pt.cumOilProducedCm3.toFixed(2),
      pt.cumWaterProducedCm3.toFixed(2),
      pt.avgSw.toFixed(4),
    ].join(',')
  );

  return [...headerLines, ...dataRows].join('\n');
}
