import React, { useState, useMemo } from 'react';
import { SimulationParams, SimulationState, WelgeAnalysis } from '../types/simulator';
import {
  calculateFractionalFlow,
  calculateRelPerm,
  getEffectiveCorey,
  getEffectiveViscosities,
} from '../utils/physics';
import {
  Activity,
  Layers,
  LineChart,
  Maximize2,
  TrendingUp,
  Workflow,
  Sparkles,
} from 'lucide-react';

interface AnalyticsChartsProps {
  params: SimulationParams;
  state: SimulationState;
  welge: WelgeAnalysis;
}

type TabType = 'sw-profile' | 'fractional-flow' | 'rel-perm' | 'production' | 'delta-p' | 'all';

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  params,
  state,
  welge,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('sw-profile');
  const corey = useMemo(() => getEffectiveCorey(params), [params]);
  const { muW, muO } = useMemo(() => getEffectiveViscosities(params), [params]);

  // Pre-calculate curves for Fractional Flow & Rel Perm
  const curvePoints = useMemo(() => {
    const points: { Sw: number; fw: number; krw: number; kro: number }[] = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const Sw = i / steps;
      const { krw, kro } = calculateRelPerm(Sw, corey);
      const fw = calculateFractionalFlow(Sw, params);
      points.push({ Sw, fw, krw, kro });
    }
    return points;
  }, [params, corey]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm flex flex-col gap-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            onClick={() => setActiveTab('sw-profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'sw-profile'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Saturation Profile $S_w(x)$
          </button>

          <button
            onClick={() => setActiveTab('fractional-flow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'fractional-flow'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            Fractional Flow &amp; Welge
          </button>

          <button
            onClick={() => setActiveTab('rel-perm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'rel-perm'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Corey Rel Perm ($k_r$)
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'production'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Recovery &amp; Water Cut
          </button>

          <button
            onClick={() => setActiveTab('delta-p')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'delta-p'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            Pressure Drop ($\Delta P$)
          </button>
        </div>

        <button
          onClick={() => setActiveTab(activeTab === 'all' ? 'sw-profile' : 'all')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Grid / Single View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          {activeTab === 'all' ? 'Single View' : 'Multi-Grid View'}
        </button>
      </div>

      {/* Chart Panels */}
      {activeTab === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartSwProfile params={params} state={state} welge={welge} height={220} />
          <ChartFractionalFlow params={params} welge={welge} curvePoints={curvePoints} height={220} />
          <ChartRelPerm corey={corey} curvePoints={curvePoints} height={220} />
          <ChartProduction state={state} welge={welge} height={220} />
          <div className="md:col-span-2">
            <ChartDeltaP state={state} params={params} height={200} />
          </div>
        </div>
      ) : (
        <div className="w-full">
          {activeTab === 'sw-profile' && (
            <ChartSwProfile params={params} state={state} welge={welge} height={320} showDetails />
          )}
          {activeTab === 'fractional-flow' && (
            <ChartFractionalFlow params={params} welge={welge} curvePoints={curvePoints} height={320} showDetails />
          )}
          {activeTab === 'rel-perm' && (
            <ChartRelPerm corey={corey} curvePoints={curvePoints} height={320} showDetails />
          )}
          {activeTab === 'production' && (
            <ChartProduction state={state} welge={welge} height={320} showDetails />
          )}
          {activeTab === 'delta-p' && (
            <ChartDeltaP state={state} params={params} height={320} showDetails />
          )}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   1. SATURATION PROFILE CHART Sw(x)
   ========================================================================= */
interface SubChartProps {
  params: SimulationParams;
  state: SimulationState;
  welge: WelgeAnalysis;
  height?: number;
  showDetails?: boolean;
}

const ChartSwProfile: React.FC<SubChartProps> = ({ params, state, welge, height = 260, showDetails }) => {
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number; xCm: number; Sw: number } | null>(null);
  const corey = getEffectiveCorey(params);

  const N = state.gridSw.length;
  const padding = { left: 45, right: 30, top: 25, bottom: 35 };
  const w = 600;
  const h = height;

  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Scale map functions
  const scaleX = (xNorm: number) => padding.left + xNorm * chartW;
  const scaleY = (Sw: number) => padding.top + (1 - Sw) * chartH;

  // Numerical polyline points
  const points = state.gridSw.map((Sw, i) => {
    const xNorm = (i + 0.5) / N;
    return `${scaleX(xNorm)},${scaleY(Sw)}`;
  }).join(' ');

  // Analytical Buckley-Leverett Shock position at current PVI
  // x_f / L = PVI * (dfw/dSw)_shock = PVI / PVI_BT
  const analyticalShockX = welge.pvi_BT > 0 ? Math.min(1.0, state.timePVI / welge.pvi_BT) : 0;

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          Water Saturation Profile $S_w(x)$
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Injected: <strong className="text-emerald-400">{state.timePVI.toFixed(2)} PV</strong>
        </span>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const svgX = (mouseX / rect.width) * w;
            if (svgX >= padding.left && svgX <= padding.left + chartW) {
              const normX = (svgX - padding.left) / chartW;
              const cellIdx = Math.max(0, Math.min(N - 1, Math.floor(normX * N)));
              const Sw = state.gridSw[cellIdx] || corey.Swi;
              setHoverPt({
                x: scaleX(normX),
                y: scaleY(Sw),
                xCm: normX * params.lengthCm,
                Sw,
              });
            } else {
              setHoverPt(null);
            }
          }}
          onMouseLeave={() => setHoverPt(null)}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
            <g key={v}>
              <line
                x1={padding.left}
                y1={scaleY(v)}
                x2={padding.left + chartW}
                y2={scaleY(v)}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.6"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={scaleY(v) + 3}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="Fira Code"
                textAnchor="end"
              >
                {(v * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
            <g key={v}>
              <line
                x1={scaleX(v)}
                y1={padding.top}
                x2={scaleX(v)}
                y2={padding.top + chartH}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.6"
              />
              <text
                x={scaleX(v)}
                y={padding.top + chartH + 15}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="Fira Code"
                textAnchor="middle"
              >
                {(v * params.lengthCm).toFixed(1)} cm
              </text>
            </g>
          ))}

          {/* Bound regions: Connate water Swi and Residual oil 1 - Sor */}
          <line
            x1={padding.left}
            y1={scaleY(corey.Swi)}
            x2={padding.left + chartW}
            y2={scaleY(corey.Swi)}
            stroke="#64748b"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left + chartW - 4}
            y={scaleY(corey.Swi) - 4}
            fill="#94a3b8"
            fontSize="8"
            fontFamily="Fira Code"
            textAnchor="end"
          >
            Swi = {(corey.Swi * 100).toFixed(0)}%
          </text>

          <line
            x1={padding.left}
            y1={scaleY(1 - corey.Sor)}
            x2={padding.left + chartW}
            y2={scaleY(1 - corey.Sor)}
            stroke="#64748b"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left + chartW - 4}
            y={scaleY(1 - corey.Sor) + 10}
            fill="#94a3b8"
            fontSize="8"
            fontFamily="Fira Code"
            textAnchor="end"
          >
            1 - Sor = {((1 - corey.Sor) * 100).toFixed(0)}%
          </text>

          {/* Analytical shock front position line */}
          {analyticalShockX > 0 && analyticalShockX <= 1.0 && (
            <g>
              <line
                x1={scaleX(analyticalShockX)}
                y1={padding.top}
                x2={scaleX(analyticalShockX)}
                y2={padding.top + chartH}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />
              <text
                x={scaleX(analyticalShockX)}
                y={padding.top - 8}
                fill="#f59e0b"
                fontSize="9"
                fontFamily="Fira Code"
                fontWeight="bold"
                textAnchor="middle"
              >
                Front: {(analyticalShockX * params.lengthCm).toFixed(1)} cm
              </text>
            </g>
          )}

          {/* Numerical Saturation Profile curve (Bright electric cyan, clearly visible) */}
          <polyline
            points={points}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover crosshair */}
          {hoverPt && (
            <g>
              <line
                x1={hoverPt.x}
                y1={padding.top}
                x2={hoverPt.x}
                y2={padding.top + chartH}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle cx={hoverPt.x} cy={hoverPt.y} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padding.left + chartW / 2}
            y={padding.top + chartH + 28}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Distance from Inlet $x$ (cm)
          </text>
          <text
            transform={`rotate(-90) translate(-${padding.top + chartH / 2}, 14)`}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Water Saturation $S_w$
          </text>
        </svg>

        {hoverPt && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900 border border-sky-500/50 text-slate-100 text-[11px] font-mono px-2 py-1 rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoverPt.x / w) * 100}%`,
              top: `${(hoverPt.y / h) * 100}%`,
            }}
          >
            x: {hoverPt.xCm.toFixed(1)} cm | Sw: {(hoverPt.Sw * 100).toFixed(1)}%
          </div>
        )}
      </div>

      {showDetails && (
        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
          <span>
            Shock Saturation ($S_{'{'}wf{'}'}$): <strong className="text-amber-400">{(welge.Swf * 100).toFixed(1)}%</strong>
          </span>
          <span>
            Shock Speed: <strong className="text-sky-400">{welge.df_dSw_shock.toFixed(2)} cm/cm</strong>
          </span>
          <span>
            Theoretical Breakthrough: <strong className="text-emerald-400">{welge.pvi_BT.toFixed(2)} PVI</strong>
          </span>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   2. FRACTIONAL FLOW & WELGE TANGENT CHART
   ========================================================================= */
interface FractionalFlowProps {
  params: SimulationParams;
  welge: WelgeAnalysis;
  curvePoints: { Sw: number; fw: number; krw: number; kro: number }[];
  height?: number;
  showDetails?: boolean;
}

const ChartFractionalFlow: React.FC<FractionalFlowProps> = ({
  params,
  welge,
  curvePoints,
  height = 260,
  showDetails,
}) => {
  const [hoverSw, setHoverSw] = useState<{ Sw: number; fw: number } | null>(null);
  const corey = getEffectiveCorey(params);

  const padding = { left: 45, right: 30, top: 25, bottom: 35 };
  const w = 600;
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const scaleX = (Sw: number) => padding.left + Sw * chartW;
  const scaleY = (fw: number) => padding.top + (1 - fw) * chartH;

  const fwPolyline = curvePoints
    .map((pt) => `${scaleX(pt.Sw)},${scaleY(pt.fw)}`)
    .join(' ');

  // Welge tangent line:
  // Passes through (Swi, 0), (Swf, fwf), and extrapolates to fw = 1.0 at Sw = avgSw_BT
  const p1 = { x: scaleX(corey.Swi), y: scaleY(0) };
  const pShock = { x: scaleX(welge.Swf), y: scaleY(welge.fwf) };
  const pExtrapolated = { x: scaleX(Math.min(1.0, welge.avgSw_BT)), y: scaleY(1.0) };

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Workflow className="w-3.5 h-3.5 text-emerald-400" />
          Fractional Flow $f_w(S_w)$ &amp; Welge Tangent
        </h3>
        <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Tangent slope: {welge.tangentSlope.toFixed(2)}
        </span>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const svgX = (mouseX / rect.width) * w;
            if (svgX >= padding.left && svgX <= padding.left + chartW) {
              const Sw = (svgX - padding.left) / chartW;
              const fw = calculateFractionalFlow(Sw, params);
              setHoverSw({ Sw, fw });
            } else {
              setHoverSw(null);
            }
          }}
          onMouseLeave={() => setHoverSw(null)}
        >
          {/* Grid lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
            <g key={v}>
              <line
                x1={padding.left}
                y1={scaleY(v)}
                x2={padding.left + chartW}
                y2={scaleY(v)}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.6"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={scaleY(v) + 3}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="Fira Code"
                textAnchor="end"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
            <g key={v}>
              <line
                x1={scaleX(v)}
                y1={padding.top}
                x2={scaleX(v)}
                y2={padding.top + chartH}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.6"
              />
              <text
                x={scaleX(v)}
                y={padding.top + chartH + 15}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="Fira Code"
                textAnchor="middle"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Welge Tangent Line (Bright Amber) */}
          <line
            x1={p1.x}
            y1={p1.y}
            x2={pExtrapolated.x}
            y2={pExtrapolated.y}
            stroke="#f59e0b"
            strokeWidth="3"
            strokeDasharray="5 3"
          />

          {/* Fractional Flow S-Curve (Bright Emerald Green) */}
          <polyline
            points={fwPolyline}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Key Welge points */}
          {/* 1. (Swi, 0) */}
          <circle cx={p1.x} cy={p1.y} r="4.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
          <text x={p1.x} y={p1.y + 14} fill="#cbd5e1" fontSize="9" fontFamily="Fira Code" textAnchor="middle">
            (Swi, 0)
          </text>

          {/* 2. Shock point (Swf, fwf) */}
          <circle cx={pShock.x} cy={pShock.y} r="5.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="2" />
          <text x={pShock.x + 8} y={pShock.y - 6} fill="#f59e0b" fontSize="10" fontFamily="Fira Code" fontWeight="bold">
            Shock ({welge.Swf.toFixed(2)}, {welge.fwf.toFixed(2)})
          </text>

          {/* 3. Extrapolated intersection at fw = 1.0 */}
          <circle cx={pExtrapolated.x} cy={pExtrapolated.y} r="5" fill="#c084fc" stroke="#0f172a" strokeWidth="1.5" />
          <text x={pExtrapolated.x} y={pExtrapolated.y - 8} fill="#c084fc" fontSize="9" fontFamily="Fira Code" fontWeight="bold" textAnchor="middle">
            S̄wf = {(welge.avgSw_BT).toFixed(2)}
          </text>

          {/* Hover indicator */}
          {hoverSw && (
            <circle
              cx={scaleX(hoverSw.Sw)}
              cy={scaleY(hoverSw.fw)}
              r="4"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="2"
            />
          )}

          {/* Axis Labels */}
          <text
            x={padding.left + chartW / 2}
            y={padding.top + chartH + 28}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Water Saturation $S_w$
          </text>
          <text
            transform={`rotate(-90) translate(-${padding.top + chartH / 2}, 14)`}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Water Fractional Flow $f_w$
          </text>
        </svg>

        {hoverSw && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900 border border-emerald-500/50 text-slate-100 text-[11px] font-mono px-2 py-1 rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(scaleX(hoverSw.Sw) / w) * 100}%`,
              top: `${(scaleY(hoverSw.fw) / h) * 100}%`,
            }}
          >
            Sw: {(hoverSw.Sw * 100).toFixed(1)}% | fw: {(hoverSw.fw).toFixed(3)}
          </div>
        )}
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300">
          <div>
            Shock Saturation: <span className="text-amber-400">{(welge.Swf * 100).toFixed(1)}%</span>
          </div>
          <div>
            Shock Flow (fwf): <span className="text-emerald-400">{(welge.fwf).toFixed(3)}</span>
          </div>
          <div>
            Avg S̄wf at BT: <span className="text-purple-400">{(welge.avgSw_BT * 100).toFixed(1)}%</span>
          </div>
          <div>
            Predicted RF at BT: <span className="text-sky-400">{welge.recovery_BT.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   3. COREY RELATIVE PERMEABILITY CHART
   ========================================================================= */
interface RelPermProps {
  corey: ReturnType<typeof getEffectiveCorey>;
  curvePoints: { Sw: number; krw: number; kro: number }[];
  height?: number;
  showDetails?: boolean;
}

const ChartRelPerm: React.FC<RelPermProps> = ({ corey, curvePoints, height = 260, showDetails }) => {
  const [hoverSw, setHoverSw] = useState<{ Sw: number; krw: number; kro: number } | null>(null);

  const padding = { left: 45, right: 30, top: 25, bottom: 35 };
  const w = 600;
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const scaleX = (Sw: number) => padding.left + Sw * chartW;
  const scaleY = (kr: number) => padding.top + (1 - kr) * chartH;

  const krwPolyline = curvePoints.map((pt) => `${scaleX(pt.Sw)},${scaleY(pt.krw)}`).join(' ');
  const kroPolyline = curvePoints.map((pt) => `${scaleX(pt.Sw)},${scaleY(pt.kro)}`).join(' ');

  // Find approximate crossover Sw
  let crossoverSw = 0.5;
  let minDiff = 999;
  for (const pt of curvePoints) {
    if (pt.Sw >= corey.Swi && pt.Sw <= 1 - corey.Sor) {
      const diff = Math.abs(pt.krw - pt.kro);
      if (diff < minDiff) {
        minDiff = diff;
        crossoverSw = pt.Sw;
      }
    }
  }

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          Corey Relative Permeability ($k_{'{'}rw{'}'}$ &amp; $k_{'{'}ro{'}'}$)
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-sky-400 flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span> krw
          </span>
          <span className="text-amber-400 flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> kro
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const svgX = (mouseX / rect.width) * w;
            if (svgX >= padding.left && svgX <= padding.left + chartW) {
              const Sw = (svgX - padding.left) / chartW;
              const { krw, kro } = calculateRelPerm(Sw, corey);
              setHoverSw({ Sw, krw, kro });
            } else {
              setHoverSw(null);
            }
          }}
          onMouseLeave={() => setHoverSw(null)}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
            <g key={v}>
              <line
                x1={padding.left}
                y1={scaleY(v)}
                x2={padding.left + chartW}
                y2={scaleY(v)}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.6"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={scaleY(v) + 3}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="Fira Code"
                textAnchor="end"
              >
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
            <g key={v}>
              <line
                x1={scaleX(v)}
                y1={padding.top}
                x2={scaleX(v)}
                y2={padding.top + chartH}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.6"
              />
              <text
                x={scaleX(v)}
                y={padding.top + chartH + 15}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="Fira Code"
                textAnchor="middle"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Mobile saturation window shaded */}
          <rect
            x={scaleX(corey.Swi)}
            y={padding.top}
            width={scaleX(1 - corey.Sor) - scaleX(corey.Swi)}
            height={chartH}
            fill="#38bdf8"
            fillOpacity="0.08"
          />

          {/* Curves (Bright Sky Blue krw, Bright Warm Orange kro) */}
          <polyline points={krwPolyline} fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
          <polyline points={kroPolyline} fill="none" stroke="#fb923c" strokeWidth="3.5" strokeLinecap="round" />

          {/* Crossover point */}
          <circle
            cx={scaleX(crossoverSw)}
            cy={scaleY(calculateRelPerm(crossoverSw, corey).krw)}
            r="4"
            fill="#cbd5e1"
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* Hover */}
          {hoverSw && (
            <g>
              <line
                x1={scaleX(hoverSw.Sw)}
                y1={padding.top}
                x2={scaleX(hoverSw.Sw)}
                y2={padding.top + chartH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle cx={scaleX(hoverSw.Sw)} cy={scaleY(hoverSw.krw)} r="3.5" fill="#38bdf8" />
              <circle cx={scaleX(hoverSw.Sw)} cy={scaleY(hoverSw.kro)} r="3.5" fill="#f59e0b" />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padding.left + chartW / 2}
            y={padding.top + chartH + 28}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Water Saturation $S_w$
          </text>
          <text
            transform={`rotate(-90) translate(-${padding.top + chartH / 2}, 14)`}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Relative Permeability $k_r$
          </text>
        </svg>

        {hoverSw && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900 border border-slate-700 text-slate-100 text-[11px] font-mono px-2 py-1 rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(scaleX(hoverSw.Sw) / w) * 100}%`,
              top: `${(scaleY(hoverSw.krw) / h) * 100}%`,
            }}
          >
            Sw: {(hoverSw.Sw * 100).toFixed(0)}% | krw: {hoverSw.krw.toFixed(3)} | kro: {hoverSw.kro.toFixed(3)}
          </div>
        )}
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300">
          <div>
            Endpoint $k_{'{'}rw{'}'}^{'{'}o{'}'}$: <span className="text-sky-400">{corey.krwMax.toFixed(2)}</span>
          </div>
          <div>
            Endpoint $k_{'{'}ro{'}'}^{'{'}o{'}'}$: <span className="text-amber-400">{corey.kroMax.toFixed(2)}</span>
          </div>
          <div>
            Exponents: <span className="text-slate-200">nw={corey.nw}, no={corey.no}</span>
          </div>
          <div>
            Crossover $S_w$: <span className="text-purple-400">{(crossoverSw * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   4. PRODUCTION PERFORMANCE (RECOVERY & WATER CUT)
   ========================================================================= */
interface ProductionProps {
  state: SimulationState;
  welge: WelgeAnalysis;
  height?: number;
  showDetails?: boolean;
}

const ChartProduction: React.FC<ProductionProps> = ({ state, welge, height = 260, showDetails }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const padding = { left: 45, right: 45, top: 25, bottom: 35 };
  const w = 600;
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Max PVI on x-axis (at least 2.0 PVI or current + 0.5)
  const maxPVI = Math.max(2.0, state.timePVI + 0.3);

  const scaleX = (pvi: number) => padding.left + (pvi / maxPVI) * chartW;
  const scaleYRec = (rf: number) => padding.top + (1 - rf / 100) * chartH;
  const scaleYCut = (fw: number) => padding.top + (1 - fw) * chartH;

  const rfPolyline = state.history
    .map((pt) => `${scaleX(pt.pvi)},${scaleYRec(pt.recoveryFactor)}`)
    .join(' ');

  const cutPolyline = state.history
    .map((pt) => `${scaleX(pt.pvi)},${scaleYCut(pt.waterCut)}`)
    .join(' ');

  const latest = state.history[state.history.length - 1];

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          Production History ($RF\%$ &amp; Water Cut $f_w$)
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> Oil Recovery %
          </span>
          <span className="text-sky-400 flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span> Water Cut fw
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const svgX = (mouseX / rect.width) * w;
            if (svgX >= padding.left && svgX <= padding.left + chartW && state.history.length > 0) {
              const hoveredPvi = ((svgX - padding.left) / chartW) * maxPVI;
              // Find closest history item
              let closestIdx = 0;
              let minDiff = 999;
              state.history.forEach((pt, i) => {
                const diff = Math.abs(pt.pvi - hoveredPvi);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = i;
                }
              });
              setHoverIdx(closestIdx);
            } else {
              setHoverIdx(null);
            }
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={padding.left}
                y1={scaleYRec(v)}
                x2={padding.left + chartW}
                y2={scaleYRec(v)}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.6"
                strokeDasharray="3 3"
              />
              {/* Left Y: Recovery % */}
              <text
                x={padding.left - 6}
                y={scaleYRec(v) + 3}
                fill="#22c55e"
                fontSize="9"
                fontFamily="Fira Code"
                fontWeight="bold"
                textAnchor="end"
              >
                {v}%
              </text>
              {/* Right Y: Water cut */}
              <text
                x={padding.left + chartW + 6}
                y={scaleYRec(v) + 3}
                fill="#38bdf8"
                fontSize="9"
                fontFamily="Fira Code"
                fontWeight="bold"
                textAnchor="start"
              >
                {(v / 100).toFixed(2)}
              </text>
            </g>
          ))}

          {/* Breakthrough Marker if happened */}
          {state.breakthroughPVI !== null && (
            <g>
              <line
                x1={scaleX(state.breakthroughPVI)}
                y1={padding.top}
                x2={scaleX(state.breakthroughPVI)}
                y2={padding.top + chartH}
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <text
                x={scaleX(state.breakthroughPVI)}
                y={padding.top - 6}
                fill="#f43f5e"
                fontSize="9"
                fontFamily="Fira Code"
                fontWeight="bold"
                textAnchor="middle"
              >
                BT @ {state.breakthroughPVI.toFixed(2)} PV
              </text>
            </g>
          )}

          {/* Curves (Bright Green RF, Bright Sky Blue Water Cut) */}
          {state.history.length > 0 && (
            <>
              <polyline points={rfPolyline} fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={cutPolyline} fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              {state.history.length === 1 && (
                <>
                  <circle cx={scaleX(state.history[0].pvi)} cy={scaleYRec(state.history[0].recoveryFactor)} r="4.5" fill="#22c55e" />
                  <circle cx={scaleX(state.history[0].pvi)} cy={scaleYCut(state.history[0].waterCut)} r="4.5" fill="#38bdf8" />
                </>
              )}
            </>
          )}

          {/* Hover */}
          {hoverIdx !== null && state.history[hoverIdx] && (
            <g>
              <line
                x1={scaleX(state.history[hoverIdx].pvi)}
                y1={padding.top}
                x2={scaleX(state.history[hoverIdx].pvi)}
                y2={padding.top + chartH}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={scaleX(state.history[hoverIdx].pvi)}
                cy={scaleYRec(state.history[hoverIdx].recoveryFactor)}
                r="4"
                fill="#10b981"
              />
              <circle
                cx={scaleX(state.history[hoverIdx].pvi)}
                cy={scaleYCut(state.history[hoverIdx].waterCut)}
                r="4"
                fill="#0284c7"
              />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padding.left + chartW / 2}
            y={padding.top + chartH + 28}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Injected Pore Volume (PVI)
          </text>
          <text
            transform={`rotate(-90) translate(-${padding.top + chartH / 2}, 14)`}
            fill="#10b981"
            fontSize="10"
            textAnchor="middle"
          >
            Oil Recovery (% OOIP)
          </text>
          <text
            transform={`rotate(90) translate(${padding.top + chartH / 2}, -${w - 12})`}
            fill="#38bdf8"
            fontSize="10"
            textAnchor="middle"
          >
            Water Cut ($f_w$)
          </text>
        </svg>

        {hoverIdx !== null && state.history[hoverIdx] && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900 border border-slate-700 text-slate-100 text-[11px] font-mono px-2 py-1 rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(scaleX(state.history[hoverIdx].pvi) / w) * 100}%`,
              top: `${(scaleYRec(state.history[hoverIdx].recoveryFactor) / h) * 100}%`,
            }}
          >
            PVI: {state.history[hoverIdx].pvi.toFixed(2)} | RF: {state.history[hoverIdx].recoveryFactor.toFixed(1)}% | fw: {state.history[hoverIdx].waterCut.toFixed(3)}
          </div>
        )}
      </div>

      {showDetails && latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300">
          <div>
            Current Recovery: <span className="text-emerald-400">{latest.recoveryFactor.toFixed(1)}%</span>
          </div>
          <div>
            Current Water Cut: <span className="text-sky-400">{(latest.waterCut * 100).toFixed(1)}%</span>
          </div>
          <div>
            Cum Oil: <span className="text-amber-400">{latest.cumOilProducedCm3.toFixed(1)} cm³</span>
          </div>
          <div>
            Cum Water: <span className="text-sky-300">{latest.cumWaterProducedCm3.toFixed(1)} cm³</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   5. DIFFERENTIAL PRESSURE CHART (Delta P vs PVI)
   ========================================================================= */
interface DeltaPProps {
  state: SimulationState;
  params: SimulationParams;
  height?: number;
  showDetails?: boolean;
}

const ChartDeltaP: React.FC<DeltaPProps> = ({ state, params, height = 260, showDetails }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const padding = { left: 55, right: 30, top: 25, bottom: 35 };
  const w = 600;
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const maxPVI = Math.max(2.0, state.timePVI + 0.3);

  // Dynamic max pressure with headroom
  let maxDeltaP = 10;
  state.history.forEach((pt) => {
    if (pt.deltaPPsi > maxDeltaP) maxDeltaP = pt.deltaPPsi;
  });
  maxDeltaP = Math.ceil(maxDeltaP * 1.25);

  const scaleX = (pvi: number) => padding.left + (pvi / maxPVI) * chartW;
  const scaleY = (p: number) => padding.top + (1 - p / maxDeltaP) * chartH;

  const dpPolyline = state.history
    .map((pt) => `${scaleX(pt.pvi)},${scaleY(pt.deltaPPsi)}`)
    .join(' ');

  const latest = state.history[state.history.length - 1];

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <LineChart className="w-3.5 h-3.5 text-rose-400" />
          Pressure Transducer History ($\Delta P$ across core)
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Current: <strong className="text-rose-400">{latest ? latest.deltaPPsi.toFixed(2) : '0.00'} psi</strong>
        </span>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const svgX = (mouseX / rect.width) * w;
            if (svgX >= padding.left && svgX <= padding.left + chartW && state.history.length > 0) {
              const hoveredPvi = ((svgX - padding.left) / chartW) * maxPVI;
              let closestIdx = 0;
              let minDiff = 999;
              state.history.forEach((pt, i) => {
                const diff = Math.abs(pt.pvi - hoveredPvi);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = i;
                }
              });
              setHoverIdx(closestIdx);
            } else {
              setHoverIdx(null);
            }
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
            const val = frac * maxDeltaP;
            return (
              <g key={frac}>
                <line
                  x1={padding.left}
                  y1={scaleY(val)}
                  x2={padding.left + chartW}
                  y2={scaleY(val)}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={scaleY(val) + 3}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="Fira Code"
                  textAnchor="end"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Curve (Bright Coral Rose, clearly visible) */}
          {state.history.length > 0 && (
            <>
              <polyline points={dpPolyline} fill="none" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              {state.history.length === 1 && (
                <circle cx={scaleX(state.history[0].pvi)} cy={scaleY(state.history[0].deltaPPsi)} r="4.5" fill="#f43f5e" />
              )}
            </>
          )}

          {/* Hover */}
          {hoverIdx !== null && state.history[hoverIdx] && (
            <g>
              <line
                x1={scaleX(state.history[hoverIdx].pvi)}
                y1={padding.top}
                x2={scaleX(state.history[hoverIdx].pvi)}
                y2={padding.top + chartH}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={scaleX(state.history[hoverIdx].pvi)}
                cy={scaleY(state.history[hoverIdx].deltaPPsi)}
                r="4"
                fill="#f43f5e"
              />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padding.left + chartW / 2}
            y={padding.top + chartH + 28}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
          >
            Injected Pore Volume (PVI)
          </text>
          <text
            transform={`rotate(-90) translate(-${padding.top + chartH / 2}, 16)`}
            fill="#f43f5e"
            fontSize="10"
            textAnchor="middle"
          >
            Pressure Drop $\Delta P$ (psi)
          </text>
        </svg>

        {hoverIdx !== null && state.history[hoverIdx] && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900 border border-rose-500/50 text-slate-100 text-[11px] font-mono px-2 py-1 rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(scaleX(state.history[hoverIdx].pvi) / w) * 100}%`,
              top: `${(scaleY(state.history[hoverIdx].deltaPPsi) / h) * 100}%`,
            }}
          >
            PVI: {state.history[hoverIdx].pvi.toFixed(2)} | ΔP: {state.history[hoverIdx].deltaPPsi.toFixed(2)} psi
          </div>
        )}
      </div>

      {showDetails && (
        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center font-mono">
          <span>Initial $\Delta P_i$: {state.history.length > 0 ? state.history[0].deltaPPsi.toFixed(2) : '--'} psi</span>
          <span>Core Permeability $k$: {params.permMD} mD</span>
          <span>Darcy Injection Rate: {params.rateCm3Min} cm³/min</span>
        </div>
      )}
    </div>
  );
};
