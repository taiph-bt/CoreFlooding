import React, { useState } from 'react';
import {
  CoreOrientationType,
  CoreyParameters,
  NUM_LAYERS,
  NUM_SLICES,
  RateUnitType,
  SimulationParams,
  SimulationState,
  WelgeAnalysis,
  WettabilityType,
} from '../types/simulator';
import {
  WETTABILITY_PRESETS,
  calculateMobilityRatio,
  getCoreGeometry,
  getEffectiveCorey,
  getEffectiveViscosities,
  calculateFrontalVelocities,
} from '../utils/physics';
import {
  ChevronDown,
  ChevronRight,
  Sliders,
  Droplet,
  Layers,
  Settings2,
  Flame,
  Sparkles,
  Maximize2,
  Minimize2,
  Clock,
  Zap,
  Gauge,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

interface ParametersPanelProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  state: SimulationState;
  welge: WelgeAnalysis;
  onReset: () => void;
}

export const ParametersPanel: React.FC<ParametersPanelProps> = ({
  params,
  setParams,
  state,
  welge,
  onReset,
}) => {
  // Navigation tabs to easily jump between or view all sections without struggle!
  const [activeTab, setActiveTab] = useState<'all' | 'core' | 'fluids' | 'injection' | 'wettability' | 'eor'>('all');

  // Section expansion state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    core: true,
    fluids: true,
    injection: true,
    wettability: true,
    eor: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const expandAll = () => {
    setOpenSections({
      core: true,
      fluids: true,
      injection: true,
      wettability: true,
      eor: true,
    });
    setActiveTab('all');
  };

  const collapseAll = () => {
    setOpenSections({
      core: false,
      fluids: false,
      injection: false,
      wettability: false,
      eor: false,
    });
  };

  const allExpanded = Object.values(openSections).every(Boolean);

  const geom = getCoreGeometry(params);
  const corey = getEffectiveCorey(params);
  const { muW, muO } = getEffectiveViscosities(params);
  const M = calculateMobilityRatio(params);
  const velocities = calculateFrontalVelocities(params, welge);
  const latest = state.history[state.history.length - 1];

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Handler for rate value typing and unit conversion
  const handleRateValueChange = (newVal: number) => {
    if (isNaN(newVal) || newVal <= 0) return;
    const rateCm3Min = params.rateUnit === 'cm3/s' ? newVal * 60.0 : newVal;
    setParams((prev) => ({
      ...prev,
      rateValue: newVal,
      rateCm3Min,
    }));
  };

  const handleRateUnitChange = (newUnit: RateUnitType) => {
    let newRateValue = params.rateValue;
    if (params.rateUnit === 'cm3/s' && newUnit === 'cm3/min') {
      newRateValue = +(params.rateValue * 60.0).toFixed(2);
    } else if (params.rateUnit === 'cm3/min' && newUnit === 'cm3/s') {
      newRateValue = +(params.rateValue / 60.0).toFixed(3);
    }
    const rateCm3Min = newUnit === 'cm3/s' ? newRateValue * 60.0 : newRateValue;
    setParams((prev) => ({
      ...prev,
      rateUnit: newUnit,
      rateValue: newRateValue,
      rateCm3Min,
    }));
  };

  const updateCorey = <K extends keyof CoreyParameters>(key: K, value: number) => {
    setParams((prev) => ({
      ...prev,
      wettability: 'custom',
      corey: {
        ...prev.corey,
        [key]: value,
      },
    }));
  };

  const handleWettabilityPreset = (wet: Exclude<WettabilityType, 'custom'>) => {
    setParams((prev) => ({
      ...prev,
      wettability: wet,
      corey: { ...WETTABILITY_PRESETS[wet] },
    }));
  };

  const handleOrientationChange = (orient: CoreOrientationType) => {
    let deg = 0;
    if (orient === 'vertical-up') deg = 90;
    if (orient === 'vertical-down') deg = -90;
    setParams((prev) => ({
      ...prev,
      orientation: orient,
      orientationDeg: deg,
    }));
  };

  // 1-Click Calibration to exact 100 cc PV & 1 cc/s Rate (user's test case)
  const set100ccBenchmark = () => {
    setParams((prev) => ({
      ...prev,
      lengthCm: 20.0,
      diamCm: 4.0,
      phi: 0.397887, // Area=12.566 cm2, Vb=251.327 cm3, Vp = 100.0 cc!
      rateUnit: 'cm3/s',
      rateValue: 1.0,
      rateCm3Min: 60.0,
      heterogeneityLevel: 'moderate',
    }));
    onReset();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm flex flex-col gap-4">
      {/* Top Header & Expand/Collapse Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Simulation Parameters
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 transition cursor-pointer"
            title="Expand or collapse all parameter sections"
          >
            {allExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>
        </div>
      </div>

      {/* QUICK SECTION SELECTOR TABS (Solves menu expansion difficulty) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: 'all', label: 'All View' },
          { id: 'core', label: '1. Core' },
          { id: 'fluids', label: '2. Fluids' },
          { id: 'injection', label: '3. Injection' },
          { id: 'wettability', label: '4. Rel Perm' },
          { id: 'eor', label: '5. EOR' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id !== 'all') {
                setOpenSections((prev) => ({ ...prev, [tab.id]: true }));
              }
            }}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* QUICK BENCHMARK CALIBRATION BUTTON (100 cc PV, 1 cc/s Rate) */}
      <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
        <div className="text-xs">
          <div className="font-semibold text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>100 cc Benchmark Preset</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Set PV = 100 cc &amp; q = 1 cc/s (exactly 100s to fill 1.0 PV)
          </p>
        </div>
        <button
          type="button"
          onClick={set100ccBenchmark}
          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer whitespace-nowrap"
        >
          Load 100 cc
        </button>
      </div>

      {/* LIVE KPI METRICS SUMMARY GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Pore Volume (Vp)</span>
          <span className="text-sm font-bold text-sky-400 font-mono">
            {geom.poreVolumeCm3.toFixed(1)} cm³
          </span>
          <span className="text-[9px] text-slate-500 font-mono">OOIP: {geom.ooipCm3.toFixed(1)} cm³</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Time to 1.0 PV</span>
          <span className="text-sm font-bold text-sky-300 font-mono">
            {geom.timeTo1PV_sec.toFixed(1)} s
          </span>
          <span className="text-[9px] text-slate-500 font-mono">({(geom.timeTo1PV_min).toFixed(2)} min)</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Frontal Speed (vf)</span>
          <span className="text-sm font-bold text-amber-400 font-mono">
            {velocities.vfCmSec.toFixed(3)} cm/s
          </span>
          <span className="text-[9px] text-slate-500 font-mono">({velocities.vfMmSec.toFixed(2)} mm/s)</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Mobility Ratio (M)</span>
          <span
            className={`text-sm font-bold font-mono ${
              M <= 1.0 ? 'text-emerald-400' : M <= 3.5 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {M.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-400">
            {M <= 1.0 ? 'Piston-like' : 'Viscous fingering'}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Pressure Drop (ΔP)</span>
          <span className="text-sm font-bold text-rose-400 font-mono">
            {latest ? latest.deltaPPsi.toFixed(1) : '0.0'} psi
          </span>
          <span className="text-[9px] text-slate-500 font-mono">
            {latest ? (latest.deltaPPsi * 6.89476).toFixed(1) : '0.0'} kPa
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Oil Recovery</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">
            {latest ? latest.recoveryFactor.toFixed(1) : '0.0'}%
          </span>
          <span className="text-[9px] text-slate-500 font-mono">
            {latest ? latest.cumOilProducedCm3.toFixed(1) : '0.0'} cm³
          </span>
        </div>
      </div>

      {/* SECTION 1: CORE PETROPHYSICS (TYPED BY USER) */}
      {(activeTab === 'all' || activeTab === 'core') && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <button
            type="button"
            onClick={() => toggleSection('core')}
            className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-semibold text-slate-200 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>1. Core Petrophysics (Typed by User)</span>
            </div>
            {openSections.core ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.core && (
            <div className="p-3.5 flex flex-col gap-3 text-xs border-t border-slate-800/60 bg-slate-900/40">
              {/* Porosity phi */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Porosity (&phi;, fraction):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0.05"
                      max="0.55"
                      step="0.01"
                      value={params.phi}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0.01 && v <= 0.6) updateParam('phi', v);
                      }}
                      className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-sky-400 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <span className="text-slate-500 font-mono text-[11px]">({(params.phi * 100).toFixed(1)}%)</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.45"
                  step="0.01"
                  value={params.phi}
                  onChange={(e) => updateParam('phi', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Permeability k */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Permeability (k, mD):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="3000"
                      step="5"
                      value={params.permMD}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 1) updateParam('permMD', v);
                      }}
                      className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-sky-400 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <span className="text-slate-500 font-mono text-[11px]">mD</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1200"
                  step="10"
                  value={params.permMD}
                  onChange={(e) => updateParam('permMD', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Length and Diameter */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Length (L, cm):</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    step="0.5"
                    value={params.lengthCm}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 1) updateParam('lengthCm', v);
                    }}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 text-right"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Diameter (D, cm):</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    step="0.1"
                    value={params.diamCm}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0.5) updateParam('diamCm', v);
                    }}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 text-right"
                  />
                </div>
              </div>

              {/* Heterogeneity Level Selection */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Rock Heterogeneity Profile (7 Horizontal Layers):
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'uniform', label: 'Uniform' },
                    { id: 'moderate', label: 'Layered (Natural)' },
                    { id: 'high', label: 'Thief Zone' },
                  ].map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => updateParam('heterogeneityLevel', h.id as any)}
                      className={`py-1 px-2 text-[11px] rounded font-semibold transition cursor-pointer ${
                        params.heterogeneityLevel === h.id
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {params.heterogeneityLevel === 'uniform' && 'All 7 layers identical (perfect piston front)'}
                  {params.heterogeneityLevel === 'moderate' && 'Smooth continuous geological layering across 7 layers (no saw-tooth zigzag)'}
                  {params.heterogeneityLevel === 'high' && 'High-perm streak in center creates pronounced viscous fingering channels'}
                </span>
              </div>

              {/* Core Orientation */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Core Orientation:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('horizontal')}
                    className={`py-1.5 px-2 text-[11px] rounded font-semibold transition cursor-pointer ${
                      params.orientation === 'horizontal'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Horizontal (0°)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('vertical-up')}
                    className={`py-1.5 px-2 text-[11px] rounded font-semibold transition cursor-pointer ${
                      params.orientation === 'vertical-up'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Vertical Up (+90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('vertical-down')}
                    className={`py-1.5 px-2 text-[11px] rounded font-semibold transition cursor-pointer ${
                      params.orientation === 'vertical-down'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Vertical Down (-90°)
                  </button>
                </div>
              </div>

              {/* Gravity Segregation Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div>
                  <label className="text-slate-300 font-medium block">Gravity Segregation:</label>
                  <span className="text-[10px] text-slate-400">
                    {params.includeGravity ? 'Active (water slumps into bottom layers)' : 'Disabled'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateParam('includeGravity', !params.includeGravity)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer select-none ${
                    params.includeGravity
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Toggle gravity segregation (slumping into 7 horizontal layers)"
                >
                  <div
                    className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                      params.includeGravity ? 'bg-sky-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        params.includeGravity ? 'translate-x-3' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span>{params.includeGravity ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: FLUID PROPERTIES (TYPED BY USER) */}
      {(activeTab === 'all' || activeTab === 'fluids') && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <button
            type="button"
            onClick={() => toggleSection('fluids')}
            className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-semibold text-slate-200 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Droplet className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Fluid Viscosities &amp; Densities (Typed by User)</span>
            </div>
            {openSections.fluids ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.fluids && (
            <div className="p-3.5 flex flex-col gap-3 text-xs border-t border-slate-800/60 bg-slate-900/40">
              {/* Water Viscosity */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Viscosity of Water (&mu;w, cP):</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.2"
                      max="20"
                      step="0.1"
                      value={params.muW}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0) updateParam('muW', v);
                      }}
                      className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-sky-400 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <span className="text-slate-500 font-mono text-[11px]">cP</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="8.0"
                  step="0.1"
                  value={params.muW}
                  onChange={(e) => updateParam('muW', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Oil Viscosity */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Viscosity of Oil (&mu;o, cP):</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.5"
                      max="150"
                      step="0.5"
                      value={params.muO}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0) updateParam('muO', v);
                      }}
                      className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-amber-400 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-slate-500 font-mono text-[11px]">cP</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="60.0"
                  step="0.5"
                  value={params.muO}
                  onChange={(e) => updateParam('muO', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Densities for gravity calculation */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Water Density (g/cm³):</label>
                  <input
                    type="number"
                    min="0.95"
                    max="1.20"
                    step="0.01"
                    value={params.rhoW}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) updateParam('rhoW', v);
                    }}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-sky-300 text-right font-semibold"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Oil Density (g/cm³):</label>
                  <input
                    type="number"
                    min="0.70"
                    max="1.00"
                    step="0.01"
                    value={params.rhoO}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) updateParam('rhoO', v);
                    }}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-amber-300 text-right font-semibold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: INJECTION CONTROLS & TIME CALIBRATION (TYPED BY USER) */}
      {(activeTab === 'all' || activeTab === 'injection') && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <button
            type="button"
            onClick={() => toggleSection('injection')}
            className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-semibold text-slate-200 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>3. Injection Rate &amp; Physical Time Calibration</span>
            </div>
            {openSections.injection ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.injection && (
            <div className="p-3.5 flex flex-col gap-3 text-xs border-t border-slate-800/60 bg-slate-900/40">
              {/* Injection rate q with selectable unit (cm3/s or cm3/min) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Injection Rate (q):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step={params.rateUnit === 'cm3/s' ? '0.1' : '0.5'}
                      value={params.rateValue}
                      onChange={(e) => handleRateValueChange(parseFloat(e.target.value))}
                      className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-rose-400 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />

                    {/* Unit Toggle Buttons */}
                    <div className="flex rounded-lg bg-slate-900 border border-slate-700 p-0.5 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleRateUnitChange('cm3/s')}
                        className={`px-1.5 py-0.5 rounded transition ${
                          params.rateUnit === 'cm3/s'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        cc/s
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRateUnitChange('cm3/min')}
                        className={`px-1.5 py-0.5 rounded transition ${
                          params.rateUnit === 'cm3/min'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        cc/min
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exact calculation explanation */}
                <div className="bg-slate-950/90 rounded-lg p-2 font-mono text-[11px] text-slate-400 border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Effective Rate:</span>
                    <strong className="text-rose-300">
                      {geom.qCm3Sec.toFixed(3)} cc/s ({geom.qCm3Min.toFixed(2)} cc/min)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pore Volume (Vp):</span>
                    <strong className="text-sky-300">{geom.poreVolumeCm3.toFixed(2)} cc</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Time to Fill 1.0 PV (t_1PV):</span>
                    <strong className="text-amber-300">{geom.timeTo1PV_sec.toFixed(1)} seconds</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Buckley-Leverett Front Speed (vf):</span>
                    <strong className="text-emerald-300">{velocities.vfCmSec.toFixed(3)} cm/s</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: WETTABILITY & COREY RELATIVE PERMEABILITY */}
      {(activeTab === 'all' || activeTab === 'wettability') && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <button
            type="button"
            onClick={() => toggleSection('wettability')}
            className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-semibold text-slate-200 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Rock Wettability &amp; Corey Parameters</span>
            </div>
            {openSections.wettability ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.wettability && (
            <div className="p-3.5 flex flex-col gap-3 text-xs border-t border-slate-800/60 bg-slate-900/40">
              {/* Preset buttons */}
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Wettability Preset:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['water-wet', 'mixed-wet', 'oil-wet'] as const).map((wet) => (
                    <button
                      key={wet}
                      type="button"
                      onClick={() => handleWettabilityPreset(wet)}
                      className={`py-1.5 px-2 text-[11px] rounded font-semibold capitalize transition cursor-pointer ${
                        params.wettability === wet
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {wet}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corey parameters Swi and Sor */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1">Connate Swi:</label>
                  <input
                    type="number"
                    min="0.05"
                    max="0.45"
                    step="0.01"
                    value={params.corey.Swi}
                    onChange={(e) => updateCorey('Swi', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-sky-400 text-right"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Residual Oil Sor:</label>
                  <input
                    type="number"
                    min="0.05"
                    max="0.50"
                    step="0.01"
                    value={params.corey.Sor}
                    onChange={(e) => updateCorey('Sor', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-amber-400 text-right"
                  />
                </div>
              </div>

              {/* Endpoints krwMax and kroMax */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1">Endpoint krw°:</label>
                  <input
                    type="number"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={params.corey.krwMax}
                    onChange={(e) => updateCorey('krwMax', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-sky-300 text-right"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Endpoint kro°:</label>
                  <input
                    type="number"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={params.corey.kroMax}
                    onChange={(e) => updateCorey('kroMax', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-amber-300 text-right"
                  />
                </div>
              </div>

              {/* Exponents nw and no */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1">Exponent nw:</label>
                  <input
                    type="number"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={params.corey.nw}
                    onChange={(e) => updateCorey('nw', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-slate-200 text-right"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Exponent no:</label>
                  <input
                    type="number"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={params.corey.no}
                    onChange={(e) => updateCorey('no', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-slate-200 text-right"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: EOR OPTIONS */}
      {(activeTab === 'all' || activeTab === 'eor') && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <button
            type="button"
            onClick={() => toggleSection('eor')}
            className="w-full px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-xs font-semibold text-slate-200 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>5. Enhanced Oil Recovery (EOR Mode)</span>
            </div>
            {openSections.eor ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.eor && (
            <div className="p-3.5 flex flex-col gap-3 text-xs border-t border-slate-800/60 bg-slate-900/40">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: 'Standard Water' },
                  { id: 'polymer', label: 'Polymer (Mobility)' },
                  { id: 'surfactant', label: 'Surfactant (Low IFT)' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => updateParam('eorMode', mode.id as any)}
                    className={`py-1.5 px-2 text-[11px] rounded font-semibold transition cursor-pointer ${
                      params.eorMode === mode.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
