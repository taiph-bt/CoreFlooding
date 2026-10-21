import React from 'react';
import { SimulationParams, SimulationState } from '../types/simulator';
import { PRESETS } from '../utils/presets';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Download,
  BookOpen,
} from 'lucide-react';

interface NavbarProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  state: SimulationState;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onExportCSV: () => void;
  onOpenTheory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  params,
  setParams,
  state,
  onTogglePlay,
  onStep,
  onReset,
  onSpeedChange,
  onExportCSV,
  onOpenTheory,
}) => {
  const handlePresetSelect = (presetId: string) => {
    const selected = PRESETS.find((p) => p.id === presetId);
    if (selected) {
      setParams({ ...selected.params });
      onReset();
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-5 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand: Official PVU Logo & Vietnam Petroleum University Header */}
        <div className="flex items-center gap-3">
          {/* Official PVU Logo */}
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-slate-700/60 shrink-0">
            <img
              src="https://pvu.edu.vn/images/headers/logo-PVU-2025-RGB-80x80pixel.png"
              alt="PetroVietnam University Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                // In case image fails or offline
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-sky-400 font-sans">
                PETROVIETNAM UNIVERSITY
              </span>
              <span className="text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded uppercase">
                PVU
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Core Flood Simulator
              </h1>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                &bull; 7 Layers &times; 100 Slices Darcy Model
              </span>
            </div>
          </div>
        </div>

        {/* Center: Reservoir Presets Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs text-slate-400 font-medium whitespace-nowrap hidden lg:inline">
            Preset:
          </label>
          <select
            onChange={(e) => handlePresetSelect(e.target.value)}
            defaultValue="benchmark-100cc"
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer w-full md:w-60 truncate font-medium"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Simulation Controls, Speed, & Tools */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Speed selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            {[1, 2, 5, 10, 20, 50].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 sm:px-2 py-1 rounded-md font-mono text-[11px] font-semibold transition cursor-pointer ${
                  state.speed === s
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={s === 1 ? '1x Real physical time' : `${s}x Accelerated time`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer text-white ${
                state.isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {state.isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {state.isRunning ? 'Pause' : 'Start'}
            </button>

            <button
              onClick={onStep}
              disabled={state.isRunning}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
              title="Step forward +0.02 PVI"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Step</span>
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium border border-rose-800/50 transition cursor-pointer"
              title="Reset simulation to initial state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Tools: Export & Theory */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
            <button
              onClick={onExportCSV}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Export simulation data to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenTheory}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 rounded-lg text-xs font-medium border border-sky-800/60 transition cursor-pointer"
              title="Buckley-Leverett & Welge Theory"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Theory</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
