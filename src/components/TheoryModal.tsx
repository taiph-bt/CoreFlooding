import React from 'react';
import { X, BookOpen, Layers, Award, Droplets, Compass } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Core Flood Theory &amp; Buckley-Leverett Formulation
              </h2>
              <p className="text-xs text-slate-400">
                Mathematical foundations of 1D multiphase displacement in porous media
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: The Buckley-Leverett Equation */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4" /> 1. Buckley-Leverett 1D Conservation Equation
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Derived from the continuity equation and Darcy&apos;s law for incompressible, immiscible two-phase flow in a uniform porous medium:
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono text-xs text-sky-300">
            ϕ ∂Sw/∂t + ut ∂fw/∂x = 0
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Where <code className="text-slate-200">ϕ</code> is core porosity,{' '}
            <code className="text-slate-200">ut = q / A</code> is total Darcy flux velocity,{' '}
            <code className="text-slate-200">Sw</code> is water saturation, and{' '}
            <code className="text-slate-200">fw</code> is the fractional flow of water. The velocity of a specific water saturation plane is given by:
          </p>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center font-mono text-xs text-emerald-400">
            (dx/dt)Sw = (ut / ϕ) · (dfw / dSw)
          </div>
        </div>

        {/* Section 2: Fractional Flow Equation */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Droplets className="w-4 h-4" /> 2. Fractional Flow with Dip Angle &amp; Gravity
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            By combining Darcy&apos;s law for both water and oil phases, the fractional flow <code className="text-slate-200">fw</code> is:
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono text-xs text-amber-300">
            fw = [ 1 - (k · kro · Δρ · g · sin θ) / (ut · μo) ] / [ 1 + (kro · μw) / (krw · μo) ]
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            When injecting upward (<code className="text-slate-200">θ = +90°</code>), denser water stays underneath lighter oil, stabilizing the shock front. When injecting downward, water tends to channel ahead unstably.
          </p>
        </div>

        {/* Section 3: Welge Tangent Method */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Award className="w-4 h-4" /> 3. Welge Tangent Construction for Shock Front
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Because physical saturation must remain single-valued (no triple-valued saturation curves), a shock front forms. Henry Welge (1952) proved that the shock saturation <code className="text-slate-200">Swf</code> is determined by drawing a tangent line from the initial state <code className="text-slate-200">(Swi, 0)</code> to the <code className="text-slate-200">fw(Sw)</code> curve:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-amber-300">
              (dfw/dSw)|Swf = fwf / (Swf - Swi)
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-400">
              PVI_BT = 1 / (dfw/dSw)|Swf
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Extrapolating this tangent line to <code className="text-slate-200">fw = 1.0</code> yields the exact average water saturation at breakthrough <code className="text-slate-200">S̄wf</code>, from which the breakthrough oil recovery <code className="text-slate-200">RF_BT = (S̄wf - Swi)/(1 - Swi)</code> is directly computed!
          </p>
        </div>

        {/* Section 4: Corey Relative Permeability Model */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4" /> 4. Corey Correlation for Relative Permeability
          </h3>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono text-xs text-slate-200 space-y-1">
            <div>S* = (Sw - Swi) / (1 - Swi - Sor)</div>
            <div className="text-sky-400">krw = krw_max · (S*)^nw</div>
            <div className="text-amber-400">kro = kro_max · (1 - S*)^no</div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The endpoint mobility ratio <code className="text-slate-200">M = (krw_max / μw) / (kro_max / μo)</code> determines displacement efficiency. When <code className="text-slate-200">M ≤ 1.0</code>, the displacement is piston-like with high sweep efficiency; when <code className="text-slate-200">M &gt;&gt; 1</code>, viscous fingering occurs.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
