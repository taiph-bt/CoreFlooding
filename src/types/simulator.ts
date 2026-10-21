export type WettabilityType = 'water-wet' | 'mixed-wet' | 'oil-wet' | 'custom';
export type CoreOrientationType = 'horizontal' | 'vertical-up' | 'vertical-down';
export type RateUnitType = 'cm3/s' | 'cm3/min';

export const NUM_LAYERS = 7;   // 7 horizontal layers to observe gravity underrun / segregation
export const NUM_SLICES = 100; // 100 axial slides to observe frontal advance

export interface CoreyParameters {
  Swi: number;      // Connate/irreducible water saturation (e.g. 0.20)
  Sor: number;      // Residual oil saturation (e.g. 0.20)
  krwMax: number;   // Endpoint water relative permeability (e.g. 0.25)
  kroMax: number;   // Endpoint oil relative permeability at Swi (e.g. 1.00)
  nw: number;       // Corey water exponent (e.g. 3.5)
  no: number;       // Corey oil exponent (e.g. 2.0)
}

export interface SimulationParams {
  // Core petrophysical properties (typed by user)
  phi: number;          // Porosity (fraction, 0.05 - 0.40)
  permMD: number;       // Permeability in millidarcies (mD)
  lengthCm: number;     // Core length (cm)
  diamCm: number;       // Core diameter (cm)
  orientation: CoreOrientationType; // 'horizontal' | 'vertical-up' | 'vertical-down'
  orientationDeg: number; // Dip angle (deg): 0=horizontal, 90=vert upward, -90=vert downward

  // Rock Wettability & Corey model
  wettability: WettabilityType;
  corey: CoreyParameters;

  // Fluid properties (typed by user)
  muW: number;          // Water viscosity (cP)
  muO: number;          // Oil viscosity (cP)
  rhoW: number;         // Water density (g/cm3)
  rhoO: number;         // Oil density (g/cm3)
  ift: number;          // Interfacial tension (mN/m)

  // Injection controls (typed by user)
  rateValue: number;    // Value typed by user (in rateUnit)
  rateUnit: RateUnitType; // 'cm3/s' or 'cm3/min'
  rateCm3Min: number;   // Total injection rate converted to cm³/min
  includeGravity: boolean; // Option to toggle gravity on/off
  includeCapillary: boolean;
  pc0Psi: number;       // Entry capillary pressure parameter (psi)

  // Rock Heterogeneity
  heterogeneityLevel: 'uniform' | 'moderate' | 'high';

  // EOR mode
  eorMode: 'none' | 'polymer' | 'surfactant';
  polymerViscBoost: number;
  surfactantSorRed: number;
}

export interface SimulationDataPoint {
  pvi: number;              // Pore Volumes Injected
  timeSeconds: number;      // Exact elapsed physical time in seconds
  timeMinutes: number;      // Elapsed experimental time in minutes
  deltaPPsi: number;        // Total pressure drop across core (psi)
  recoveryFactor: number;   // Oil recovery factor (% of OOIP)
  waterCut: number;         // Effluent water cut fw (fraction 0-1)
  cumOilProducedCm3: number;// Cumulative oil produced (cm3)
  cumWaterProducedCm3: number; // Cumulative water produced (cm3)
  avgSw: number;            // Average core water saturation
  swOutlet: number;         // Outlet face water saturation
  frontSpeedCmSec: number;  // Current Buckley-Leverett frontal advance speed (cm/s)
}

export interface WelgeAnalysis {
  Swf: number;              // Shock front saturation
  fwf: number;              // Fractional flow at shock front
  df_dSw_shock: number;     // Slope of tangent (1 / PVI_BT)
  pvi_BT: number;           // Predicted breakthrough PVI (1 / slope)
  avgSw_BT: number;         // Average water saturation behind front at breakthrough
  recovery_BT: number;      // Predicted oil recovery at breakthrough (% of OOIP)
  tangentSlope: number;     // fwf / (Swf - Swi)
  isPistonDisplacement: boolean;
}

export interface SimulationState {
  numLayers: number;        // 7 horizontal layers
  numSlices: number;        // 100 axial slides
  gridSw2D: number[][];     // [7][100] saturation matrix
  gridSw: number[];         // 100 elements: averaged saturation across the 7 layers
  layerSwOutlet: number[];  // 7 elements: outlet saturation for each layer
  timePVI: number;          // Current PVI
  timeSeconds: number;      // Exact physical elapsed time in seconds
  timeMinutes: number;      // Current experiment duration in minutes
  history: SimulationDataPoint[];
  breakthroughPVI: number | null; // Actual simulated breakthrough
  isRunning: boolean;
  speed: number;            // 1x, 2x, 5x, 10x, 20x, 60x
  currentStep: number;
  showMeshGrid: boolean;    // Toggle to view 7x100 mesh lines
}
