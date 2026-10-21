import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  NUM_LAYERS,
  NUM_SLICES,
  SimulationParams,
  SimulationState,
  SimulationDataPoint,
} from './types/simulator';
import { PRESETS } from './utils/presets';
import {
  solveWelgeTangent,
  getEffectiveCorey,
  getCoreGeometry,
  calculatePressureDropPsi,
  calculateFrontalVelocities,
  stepSimulation2D,
  exportToCSV,
} from './utils/physics';
import { Navbar } from './components/Navbar';
import { ParametersPanel } from './components/ParametersPanel';
import { CoreVisualizer } from './components/CoreVisualizer';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { PoreScaleModal } from './components/PoreScaleModal';
import { TheoryModal } from './components/TheoryModal';

export default function App() {
  const [params, setParams] = useState<SimulationParams>(PRESETS[0].params);

  // Welge tangent analysis & geometry
  const welge = useMemo(() => solveWelgeTangent(params), [params]);
  const corey = useMemo(() => getEffectiveCorey(params), [params]);
  const geom = useMemo(() => getCoreGeometry(params), [params]);
  const velocities = useMemo(() => calculateFrontalVelocities(params, welge), [params, welge]);

  // Initial state creator: 7 horizontal layers x 100 axial slides mesh
  const createInitialState = useCallback(
    (currentParams: SimulationParams): SimulationState => {
      const currentCorey = getEffectiveCorey(currentParams);
      const initialGrid2D: number[][] = Array.from({ length: NUM_LAYERS }, () =>
        new Array<number>(NUM_SLICES).fill(currentCorey.Swi)
      );
      const initialSwProfile = new Array<number>(NUM_SLICES).fill(currentCorey.Swi);
      const initialOutlet = new Array<number>(NUM_LAYERS).fill(currentCorey.Swi);
      const initialDeltaP = calculatePressureDropPsi(initialGrid2D, currentParams);
      const currentVelocities = calculateFrontalVelocities(currentParams, solveWelgeTangent(currentParams));

      const initialPoint: SimulationDataPoint = {
        pvi: 0,
        timeSeconds: 0,
        timeMinutes: 0,
        deltaPPsi: initialDeltaP,
        recoveryFactor: 0,
        waterCut: 0,
        cumOilProducedCm3: 0,
        cumWaterProducedCm3: 0,
        avgSw: currentCorey.Swi,
        swOutlet: currentCorey.Swi,
        frontSpeedCmSec: currentVelocities.vfCmSec,
      };

      return {
        numLayers: NUM_LAYERS,
        numSlices: NUM_SLICES,
        gridSw2D: initialGrid2D,
        gridSw: initialSwProfile,
        layerSwOutlet: initialOutlet,
        timePVI: 0,
        timeSeconds: 0,
        timeMinutes: 0,
        history: [initialPoint],
        breakthroughPVI: null,
        isRunning: false,
        speed: 1, // 1x is TRUE real physical time
        currentStep: 0,
        showMeshGrid: true,
      };
    },
    []
  );

  const [state, setState] = useState<SimulationState>(() => createInitialState(params));

  // Modal controls
  const [isPoreModalOpen, setIsPoreModalOpen] = useState(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState(false);

  // Reset simulation
  const handleReset = useCallback(() => {
    setState((prev) => {
      const fresh = createInitialState(params);
      return { ...fresh, speed: prev.speed, showMeshGrid: prev.showMeshGrid };
    });
  }, [params, createInitialState]);

  // Simulation execution step (2D 7x100 mesh) strictly adhering to Darcy flow & exact physical timing
  const executeSimulationStep = useCallback(
    (dtPvi: number, dtPhysSec: number) => {
      setState((prevState) => {
        if (prevState.timePVI >= 2.5) {
          return { ...prevState, isRunning: false };
        }

        const stepResult = stepSimulation2D(prevState.gridSw2D, params, dtPvi);
        const newPVI = prevState.timePVI + dtPvi;
        const newTimeSec = prevState.timeSeconds + dtPhysSec;
        const newTimeMin = newTimeSec / 60.0;

        const currentGeom = getCoreGeometry(params);
        const currentCorey = getEffectiveCorey(params);
        const currentVel = calculateFrontalVelocities(params, solveWelgeTangent(params));

        const recoveryFactor = Math.max(
          0,
          Math.min(100, ((stepResult.avgSw - currentCorey.Swi) / (1 - currentCorey.Swi)) * 100)
        );

        const cumOilProducedCm3 = (recoveryFactor / 100) * currentGeom.ooipCm3;
        const totalInjectedCm3 = newPVI * currentGeom.poreVolumeCm3;
        const cumWaterProducedCm3 = Math.max(0, totalInjectedCm3 - cumOilProducedCm3);

        // Breakthrough detection
        let newBreakthrough = prevState.breakthroughPVI;
        if (newBreakthrough === null && stepResult.waterCutOutlet >= 0.015) {
          newBreakthrough = newPVI;
          try {
            confetti({
              particleCount: 60,
              spread: 65,
              origin: { y: 0.55 },
              colors: ['#38bdf8', '#0284c7', '#f59e0b'],
            });
          } catch {
            // ignore
          }
        }

        const newPoint: SimulationDataPoint = {
          pvi: newPVI,
          timeSeconds: newTimeSec,
          timeMinutes: newTimeMin,
          deltaPPsi: stepResult.deltaPPsi,
          recoveryFactor,
          waterCut: stepResult.waterCutOutlet,
          cumOilProducedCm3,
          cumWaterProducedCm3,
          avgSw: stepResult.avgSw,
          swOutlet: stepResult.layerSwOutlet[Math.floor(NUM_LAYERS / 2)],
          frontSpeedCmSec: currentVel.vfCmSec,
        };

        const shouldRecordHistory =
          prevState.history.length === 0 ||
          newPVI - prevState.history[prevState.history.length - 1].pvi >= 0.012 ||
          newBreakthrough !== prevState.breakthroughPVI;

        const newHistory = shouldRecordHistory
          ? [...prevState.history, newPoint]
          : [...prevState.history.slice(0, -1), newPoint];

        return {
          ...prevState,
          gridSw2D: stepResult.newGridSw2D,
          gridSw: stepResult.avgSwProfile,
          layerSwOutlet: stepResult.layerSwOutlet,
          timePVI: newPVI,
          timeSeconds: newTimeSec,
          timeMinutes: newTimeMin,
          history: newHistory,
          breakthroughPVI: newBreakthrough,
          currentStep: prevState.currentStep + 1,
        };
      });
    },
    [params]
  );

  // Animation frame loop with STRICT physical time synchronization:
  // t_1PV = Vp / q
  // For 1 second of physical time: dV = q_cc_s * 1s, dPVI = dV / Vp
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state.isRunning) {
      lastTimeRef.current = null;
      return;
    }

    let frameId: number;

    const loop = (currentTime: number) => {
      if (lastTimeRef.current !== null) {
        const deltaMs = Math.min(100, currentTime - lastTimeRef.current);
        const dtWallSec = deltaMs / 1000.0;
        const dtPhysSec = dtWallSec * state.speed;

        const currentGeom = getCoreGeometry(params);
        // Exact physical PVI increment:
        // dtPvi = (q_cc_s * dtPhysSec) / Vp
        const dtPvi = currentGeom.poreVolumeCm3 > 0
          ? (currentGeom.qCm3Sec * dtPhysSec) / currentGeom.poreVolumeCm3
          : 0;

        executeSimulationStep(dtPvi, dtPhysSec);
      }
      lastTimeRef.current = currentTime;
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [state.isRunning, state.speed, params, executeSimulationStep]);

  const handleSingleStep = () => {
    const currentGeom = getCoreGeometry(params);
    const dtPvi = 0.02;
    const dtPhysSec = currentGeom.timeTo1PV_sec * dtPvi;
    executeSimulationStep(dtPvi, dtPhysSec);
  };

  const handleTogglePlay = () => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleSpeedChange = (speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  };

  const handleToggleMeshGrid = () => {
    setState((prev) => ({ ...prev, showMeshGrid: !prev.showMeshGrid }));
  };

  // CSV Data Export
  const handleExportCSV = () => {
    const csvContent = exportToCSV(state.history, params);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `PVU_CoreFlood_Simulation_7x100Mesh_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white relative pb-8">
      {/* Top Application Bar */}
      <Navbar
        params={params}
        setParams={setParams}
        state={state}
        onTogglePlay={handleTogglePlay}
        onStep={handleSingleStep}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onExportCSV={handleExportCSV}
        onOpenTheory={() => setIsTheoryModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Parameter Controls (4 Cols) */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <ParametersPanel
            params={params}
            setParams={setParams}
            state={state}
            welge={welge}
            onReset={handleReset}
          />
        </section>

        {/* Right Column: Visualizer & Analytics Charts (8 Cols) */}
        <section className="lg:col-span-8 flex flex-col gap-5">
          {/* Hassler Core Holder Visualizer (7 Layers x 100 Slices) */}
          <CoreVisualizer
            params={params}
            state={state}
            welge={welge}
            onOpenPoreModal={() => setIsPoreModalOpen(true)}
            onToggleMeshGrid={handleToggleMeshGrid}
            onToggleGravity={() => setParams((p) => ({ ...p, includeGravity: !p.includeGravity }))}
          />

          {/* Interactive Multi-Tab Analytics Charts */}
          <AnalyticsCharts
            params={params}
            state={state}
            welge={welge}
          />
        </section>
      </main>

      {/* Bottom Sticky Watermark "William Pham" */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/90 py-3 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">PETROVIETNAM UNIVERSITY (PVU)</span>
            <span>&bull;</span>
            <span>Multiphase Darcy &amp; Buckley-Leverett Core Displacement Model</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-slate-400">
            <span>Watermark:</span>
            <span className="font-bold text-sky-400 bg-sky-950/80 border border-sky-700/80 px-2.5 py-0.5 rounded shadow-sm">
              William Pham
            </span>
          </div>
        </div>
      </footer>

      {/* Micro-Pore Scale Modal */}
      <PoreScaleModal
        isOpen={isPoreModalOpen}
        onClose={() => setIsPoreModalOpen(false)}
        params={params}
      />

      {/* Theory & Welge Mathematics Modal */}
      <TheoryModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
      />
    </div>
  );
}
