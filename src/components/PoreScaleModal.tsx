import React, { useRef, useEffect, useState } from 'react';
import { SimulationParams } from '../types/simulator';
import { X, ZoomIn, Info, ShieldCheck } from 'lucide-react';

interface PoreScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: SimulationParams;
}

export const PoreScaleModal: React.FC<PoreScaleModalProps> = ({
  isOpen,
  onClose,
  params,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeWettability, setActiveWettability] = useState<string>(params.wettability);

  useEffect(() => {
    setActiveWettability(params.wettability);
  }, [params.wettability]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.02;
      const w = canvas.width;
      const h = canvas.height;

      // Clear dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Pore scale geometry: 4 large quartz sand grains creating a central pore body & throats
      const grains = [
        { x: 90, y: 80, r: 65, label: 'Quartz Grain A' },
        { x: w - 90, y: 80, r: 65, label: 'Quartz Grain B' },
        { x: 90, y: h - 80, r: 65, label: 'Quartz Grain C' },
        { x: w - 90, y: h - 80, r: 65, label: 'Quartz Grain D' },
      ];

      // Draw pore throat background (fluid channel)
      // Water color: #0284c7 (light cyan/sky blue), Oil: #1e140d (dark amber crude)
      const isWaterWet = activeWettability === 'water-wet';
      const isOilWet = activeWettability === 'oil-wet';

      // 1. Fill fluid domain
      if (isWaterWet) {
        // Water is wetting phase: forms continuous thin film lining all grain surfaces
        // Oil droplet travels in pore center
        ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
        ctx.fillRect(0, 0, w, h);

        // Water film lining grains
        for (const g of grains) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.r + 7, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Oil ganglion / droplet passing through throat
        const oilX = w / 2 + Math.sin(t * 0.8) * 15;
        const oilY = h / 2;
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Convex non-wetting droplet shape
        ctx.ellipse(oilX, oilY, 40, 32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Label on oil droplet
        ctx.fillStyle = '#fde68a';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Non-Wetting Oil Droplet', oilX, oilY + 4);
      } else if (isOilWet) {
        // Oil is wetting phase: adheres to grain surfaces; water fingers through pore center
        ctx.fillStyle = 'rgba(120, 53, 15, 0.3)';
        ctx.fillRect(0, 0, w, h);

        // Oil film lining grains
        for (const g of grains) {
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.r + 9, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Water channel in center
        const waterX = w / 2;
        const waterY = h / 2;
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(waterX, waterY, 48 + Math.sin(t) * 4, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Non-Wetting Water Stream', waterX, waterY + 4);
      } else {
        // Mixed-wet
        ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.fillRect(0, 0, w, h);

        // Heterogeneous coating
        grains.forEach((g, idx) => {
          ctx.strokeStyle = idx % 2 === 0 ? '#38bdf8' : '#451a03';
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.r + 6, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Biphasic mixture
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(w / 2 - 25, h / 2, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(w / 2 + 25, h / 2, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Water', w / 2 - 25, h / 2 + 4);
        ctx.fillText('Oil', w / 2 + 25, h / 2 + 4);
      }

      // 2. Draw Sand Grains (Porous matrix solid phase)
      for (const g of grains) {
        ctx.fillStyle = '#d6d3d1';
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Grain label
        ctx.fillStyle = '#44403c';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SAND GRAIN', g.x, g.y + 3);
      }

      // Draw Pore Throat arrows
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Fira Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◀ Throat #1 ▶', w / 2, 30);
      ctx.fillText('◀ Throat #2 ▶', w / 2, h - 20);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, activeWettability]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-100 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
              <ZoomIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Pore-Scale Micro-CT &amp; Wettability Mechanics
              </h2>
              <p className="text-xs text-slate-400">
                High-magnification visualization of fluid-rock interfacial contact angles
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

        {/* Wettability Switcher */}
        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Select Rock Wetting State:</span>
          <div className="flex gap-1.5">
            {(['water-wet', 'mixed-wet', 'oil-wet'] as const).map((wet) => (
              <button
                key={wet}
                type="button"
                onClick={() => setActiveWettability(wet)}
                className={`py-1 px-3 text-xs rounded-lg capitalize font-medium transition cursor-pointer ${
                  activeWettability === wet
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {wet.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Display */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <canvas ref={canvasRef} width={580} height={260} className="w-full h-auto block" />
        </div>

        {/* Educational Physics Insight */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-sky-400">
            <Info className="w-4 h-4" />
            {activeWettability === 'water-wet' && 'Water-Wet Reservoir Rock (Contact Angle θ < 70°)'}
            {activeWettability === 'mixed-wet' && 'Mixed-Wet Reservoir Rock (Contact Angle 70° ≤ θ ≤ 110°)'}
            {activeWettability === 'oil-wet' && 'Oil-Wet Reservoir Rock (Contact Angle θ > 110°)'}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {activeWettability === 'water-wet' &&
              'In water-wet rock (typical sandstones like Berea), water spontaneously imbibes into narrow pore throats by capillary suction. Water forms a continuous thin wetting film over quartz grains, forcing non-wetting crude oil into the pore centers where it is displaced cleanly with a sharp shock front.'}
            {activeWettability === 'mixed-wet' &&
              'In mixed-wet rocks (common in carbonates and asphaltic crude reservoirs), smaller micropores retain water while larger macropore walls become coated with polar organic components from the crude oil. Water cuts increase progressively after breakthrough.'}
            {activeWettability === 'oil-wet' &&
              'In oil-wet formations, oil tenaciously adheres to rock grain surfaces as a continuous film. Injected water has no capillary suction and bypasses the oil through the easiest macropores, leading to very early water breakthrough and prolonged low-rate oil production tail.'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
