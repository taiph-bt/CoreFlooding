import React, { useRef, useEffect, useState, useMemo } from 'react';
import { NUM_LAYERS, NUM_SLICES, SimulationParams, SimulationState, WelgeAnalysis } from '../types/simulator';
import { getCoreGeometry, getEffectiveCorey, calculateRelPerm, calculateFrontalVelocities } from '../utils/physics';
import { Droplets, Sparkles, ZoomIn, Grid3X3, Gauge, Clock, Zap, Timer } from 'lucide-react';

interface CoreVisualizerProps {
  params: SimulationParams;
  state: SimulationState;
  welge: WelgeAnalysis;
  onOpenPoreModal: () => void;
  onToggleMeshGrid: () => void;
  onToggleGravity?: () => void;
}

interface Particle {
  x: number; // 0 to 1
  layer: number; // 0 to 6
  size: number;
  speed: number;
}

export const CoreVisualizer: React.FC<CoreVisualizerProps> = ({
  params,
  state,
  welge,
  onOpenPoreModal,
  onToggleMeshGrid,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverData, setHoverData] = useState<{
    layer: number;
    slice: number;
    xCm: number;
    yCm: number;
    Sw: number;
    So: number;
    krw: number;
    kro: number;
    xPx: number;
    yPx: number;
  } | null>(null);

  const geom = useMemo(() => getCoreGeometry(params), [params]);
  const corey = useMemo(() => getEffectiveCorey(params), [params]);
  const velocities = useMemo(() => calculateFrontalVelocities(params, welge), [params, welge]);

  // Flow particles
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: 55 }, () => ({
      x: Math.random(),
      layer: Math.floor(Math.random() * NUM_LAYERS),
      size: 1.4 + Math.random() * 1.8,
      speed: 0.001 + Math.random() * 0.0025,
    }))
  );

  // Procedural rock grains positioned deterministically across the mesh
  const grainsRef = useRef<{ x: number; y: number; r: number; color: string }[]>([]);
  useEffect(() => {
    const grains: { x: number; y: number; r: number; color: string }[] = [];
    const count = 180;
    const colors = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#d6d3d1', '#f1f5f9'];
    for (let i = 0; i < count; i++) {
      grains.push({
        x: Math.random(),
        y: Math.random(),
        r: 1.5 + Math.random() * 2.8,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    grainsRef.current = grains;
  }, []);

  // Compute live average front position along core (strictly non-zero when PVI > 0)
  const averageFrontCm = useMemo(() => {
    if (state.timePVI <= 0.0001) return 0;

    let sumExactSlices = 0;
    const thresholdSw = corey.Swi + 0.015;

    for (let j = 0; j < NUM_LAYERS; j++) {
      let layerExactSlice = 0;
      for (let i = NUM_SLICES - 1; i >= 0; i--) {
        const swCurrent = state.gridSw2D[j]?.[i] ?? corey.Swi;
        if (swCurrent >= thresholdSw) {
          const swAhead = i < NUM_SLICES - 1 ? state.gridSw2D[j][i + 1] : corey.Swi;
          const delta = Math.max(0.005, swCurrent - swAhead);
          const frac = Math.max(0, Math.min(1, (swCurrent - thresholdSw) / delta));
          layerExactSlice = i + frac;
          break;
        }
      }

      // If even slice 0 is receiving water
      if (layerExactSlice === 0) {
        const sw0 = state.gridSw2D[j]?.[0] ?? corey.Swi;
        if (sw0 > corey.Swi) {
          layerExactSlice = Math.min(1.0, (sw0 - corey.Swi) / Math.max(0.01, welge.Swf - corey.Swi));
        }
      }

      sumExactSlices += layerExactSlice;
    }

    const avgSlice = sumExactSlices / NUM_LAYERS;
    const gridFrontCm = (avgSlice / NUM_SLICES) * params.lengthCm;

    // Theoretical analytical front position
    const analyticalFrontCm = welge.pvi_BT > 0
      ? Math.min(params.lengthCm, (state.timePVI / welge.pvi_BT) * params.lengthCm)
      : 0;

    // Combine grid front with analytical front for ultra-smooth responsiveness
    return Math.max(gridFrontCm, Math.min(params.lengthCm, analyticalFrontCm * 0.98));
  }, [state.gridSw2D, state.timePVI, corey.Swi, welge.Swf, welge.pvi_BT, params.lengthCm]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Core holder bounds
      const paddingLeft = 70;
      const paddingRight = 70;
      const paddingTop = 78;
      const paddingBottom = 48;

      const coreX = paddingLeft;
      const coreY = paddingTop;
      const coreW = width - paddingLeft - paddingRight;
      const coreH = height - paddingTop - paddingBottom;

      // 1. Draw Hassler Core Holder Outer Body & Steel Flanges
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(coreX - 16, coreY - 10, coreW + 32, coreH + 20);

      // Rubber confining sleeve (dark viton elastomer)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(coreX - 8, coreY - 6, coreW + 16, coreH + 12);

      // Steel End Caps (Inlet on Left, Producer on Right)
      // Inlet Cap
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(coreX - 28, coreY - 14, 20, coreH + 28, 4);
      ctx.fill();
      ctx.stroke();

      // Outlet Cap
      ctx.beginPath();
      ctx.roundRect(coreX + coreW + 8, coreY - 14, 20, coreH + 28, 4);
      ctx.fill();
      ctx.stroke();

      // Injection line (Left pipe: Water = light blue)
      ctx.strokeStyle = params.eorMode === 'polymer' ? '#a855f7' : '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(10, coreY + coreH / 2);
      ctx.lineTo(coreX - 8, coreY + coreH / 2);
      ctx.stroke();

      // Production line (Right pipe: Dark grey-black if oil, light blue if water breakthrough)
      const latestCut = state.history.length > 0 ? state.history[state.history.length - 1].waterCut : 0;
      const isWaterBreakthrough = latestCut > 0.05;
      ctx.strokeStyle = isWaterBreakthrough ? '#38bdf8' : '#18181b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(coreX + coreW + 8, coreY + coreH / 2);
      ctx.lineTo(width - 10, coreY + coreH / 2);
      ctx.stroke();

      // -----------------------------------------------------------------------
      // 2. DIFFERENTIAL PRESSURE GAUGE MOUNTED DIRECTLY ON CORE MODEL
      // -----------------------------------------------------------------------
      const latestDP = state.history.length > 0 ? state.history[state.history.length - 1].deltaPPsi : 0;
      const gaugeCenterX = coreX + coreW / 2;
      const gaugeCenterY = 40;
      const gaugeRadius = 29;

      // Pressure sensing impulse tubes from inlet (Pin) and outlet (Pout) to the differential gauge manifold
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.8;

      // Tube 1: From core inlet top to gauge manifold
      ctx.beginPath();
      ctx.moveTo(coreX + 15, coreY - 10);
      ctx.lineTo(coreX + 15, gaugeCenterY + 14);
      ctx.lineTo(gaugeCenterX - 10, gaugeCenterY + 14);
      ctx.lineTo(gaugeCenterX - 10, gaugeCenterY + gaugeRadius);
      ctx.stroke();

      // Tube 2: From core outlet top to gauge manifold
      ctx.beginPath();
      ctx.moveTo(coreX + coreW - 15, coreY - 10);
      ctx.lineTo(coreX + coreW - 15, gaugeCenterY + 14);
      ctx.lineTo(gaugeCenterX + 10, gaugeCenterY + 14);
      ctx.lineTo(gaugeCenterX + 10, gaugeCenterY + gaugeRadius);
      ctx.stroke();

      // Gauge mounting bracket
      ctx.fillStyle = '#475569';
      ctx.fillRect(gaugeCenterX - 12, gaugeCenterY + gaugeRadius - 2, 24, 8);

      // Gauge Outer Chrome Bezel
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner Gauge Face
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius - 3, 0, Math.PI * 2);
      ctx.fill();

      // Gauge Dial Tick Marks (-135 deg to +135 deg)
      const maxGaugeScale = Math.max(30, Math.ceil(latestDP * 1.5 / 10) * 10);
      const angleStart = -Math.PI * 0.75;
      const angleEnd = Math.PI * 0.75;
      const totalAngle = angleEnd - angleStart;

      for (let t = 0; t <= 6; t++) {
        const frac = t / 6;
        const tickAngle = angleStart + frac * totalAngle;
        const tickInnerR = gaugeRadius - 7;
        const tickOuterR = gaugeRadius - 3.5;

        ctx.strokeStyle = frac > 0.8 ? '#f43f5e' : '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(
          gaugeCenterX + Math.cos(tickAngle) * tickInnerR,
          gaugeCenterY + Math.sin(tickAngle) * tickInnerR
        );
        ctx.lineTo(
          gaugeCenterX + Math.cos(tickAngle) * tickOuterR,
          gaugeCenterY + Math.sin(tickAngle) * tickOuterR
        );
        ctx.stroke();
      }

      // Gauge Needle Deflection
      const dpClamped = Math.min(maxGaugeScale, Math.max(0, latestDP));
      const needleAngle = angleStart + (dpClamped / maxGaugeScale) * totalAngle;
      const needleLen = gaugeRadius - 6;

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(gaugeCenterX, gaugeCenterY);
      ctx.lineTo(
        gaugeCenterX + Math.cos(needleAngle) * needleLen,
        gaugeCenterY + Math.sin(needleAngle) * needleLen
      );
      ctx.stroke();

      // Needle center pivot cap
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(gaugeCenterX, gaugeCenterY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Gauge Labels (ΔP and value in psi)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 7px "Fira Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ΔP (DARCY GAUGE)', gaugeCenterX, gaugeCenterY - 10);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px "Fira Code", monospace';
      ctx.fillText(`${latestDP.toFixed(1)} psi`, gaugeCenterX, gaugeCenterY + 13);

      // Gauge title label on top
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText('DIFFERENTIAL PRESSURE TRANSDUCER (ΔP = Pin - Pout)', gaugeCenterX, 11);

      // -----------------------------------------------------------------------
      // 3. 2D CORE MESH: 7 HORIZONTAL LAYERS x 100 AXIAL SLICES
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.beginPath();
      ctx.rect(coreX, coreY, coreW, coreH);
      ctx.clip();

      const layerH = coreH / NUM_LAYERS;
      const sliceW = coreW / NUM_SLICES;
      const Swi = corey.Swi;
      const SwMax = 1 - corey.Sor;
      const denomSw = Math.max(0.01, SwMax - Swi);

      // Render each cell in the 7x100 mesh
      // Water color: LIGHT BLUE (#38bdf8 / rgb(56, 189, 248))
      // Oil color: DARK GREY-BLACK (#18181b / rgb(24, 24, 27))
      for (let j = 0; j < NUM_LAYERS; j++) {
        const cellY = coreY + j * layerH;
        for (let i = 0; i < NUM_SLICES; i++) {
          const Sw = state.gridSw2D[j]?.[i] ?? Swi;
          const cellX = coreX + i * sliceW;

          // Normalized saturation (0 for 100% initial oil, 1 for maximum water)
          const norm = Math.max(0, Math.min(1, (Sw - Swi) / denomSw));

          // Interpolate RGB:
          // Oil: #18181b (24, 24, 27) - Dark grey-black
          // Water: #38bdf8 (56, 189, 248) - Light blue
          const r = Math.round(24 * (1 - norm) + 56 * norm);
          const g = Math.round(24 * (1 - norm) + 189 * norm);
          const b = Math.round(27 * (1 - norm) + 248 * norm);

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(cellX, cellY, sliceW + 0.5, layerH + 0.5);
        }
      }

      // Draw rock grains & pore network overlay for visible texture
      ctx.globalAlpha = 0.35;
      for (const grain of grainsRef.current) {
        const gx = coreX + grain.x * coreW;
        const gy = coreY + grain.y * coreH;
        ctx.fillStyle = grain.color;
        ctx.beginPath();
        ctx.arc(gx, gy, grain.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Draw Mesh Grid Lines (7 Horizontal Layers & 100 Axial Slices)
      if (state.showMeshGrid) {
        // Horizontal layer boundaries (7 layers = 6 inner dividers)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1;
        for (let j = 1; j < NUM_LAYERS; j++) {
          const y = coreY + j * layerH;
          ctx.beginPath();
          ctx.moveTo(coreX, y);
          ctx.lineTo(coreX + coreW, y);
          ctx.stroke();
        }

        // Axial slice lines (100 slices: draw divider lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.6;
        for (let i = 1; i < NUM_SLICES; i++) {
          const x = coreX + i * sliceW;
          ctx.beginPath();
          ctx.moveTo(x, coreY);
          ctx.lineTo(x, coreY + coreH);
          ctx.stroke();
        }
      } else {
        // Subtle layer dividers always visible to clearly discern the 7 horizontal layers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 0.8;
        for (let j = 1; j < NUM_LAYERS; j++) {
          const y = coreY + j * layerH;
          ctx.beginPath();
          ctx.moveTo(coreX, y);
          ctx.lineTo(coreX + coreW, y);
          ctx.stroke();
        }
      }

      // Animated Darcy Streamlines
      const isRunning = state.isRunning;
      const flowFactor = Math.max(0.2, params.rateCm3Min / 2);

      for (const p of particlesRef.current) {
        if (isRunning) {
          p.x += p.speed * flowFactor * state.speed;
          if (p.x > 1.0) {
            p.x = 0;
            p.layer = Math.floor(Math.random() * NUM_LAYERS);
          }
        }

        const sliceIdx = Math.min(NUM_SLICES - 1, Math.floor(p.x * NUM_SLICES));
        const cellSw = state.gridSw2D[p.layer]?.[sliceIdx] ?? Swi;

        const px = coreX + p.x * coreW;
        const py = coreY + (p.layer + 0.5) * layerH;

        if (cellSw > Swi + 0.08) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = '#52525b';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 2;
        }

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // -----------------------------------------------------------------------
      // SMOOTH CONTINUOUS FRONTAL ADVANCE TRACKING (NO ZIGZAG)
      // Sub-slice continuous interpolation across all 7 layers
      // -----------------------------------------------------------------------
      // -----------------------------------------------------------------------
      // SMOOTH CONTINUOUS FRONTAL ADVANCE TRACKING (NO ZIGZAG)
      // Sub-slice continuous interpolation across all 7 layers
      // -----------------------------------------------------------------------
      const frontPoints: { x: number; y: number; layer: number; fraction: number }[] = [];
      const thresholdSw = corey.Swi + 0.015;

      for (let j = 0; j < NUM_LAYERS; j++) {
        let exactSlice = 0;
        for (let i = NUM_SLICES - 1; i >= 0; i--) {
          const swCurrent = state.gridSw2D[j][i];
          if (swCurrent >= thresholdSw) {
            // Sub-slice linear interpolation for continuous smooth front
            const swNext = i < NUM_SLICES - 1 ? state.gridSw2D[j][i + 1] : Swi;
            const delta = Math.max(0.005, swCurrent - swNext);
            const frac = Math.max(0, Math.min(1, (swCurrent - thresholdSw) / delta));
            exactSlice = i + frac;
            break;
          }
        }

        if (exactSlice === 0) {
          const sw0 = state.gridSw2D[j][0];
          if (sw0 > corey.Swi) {
            exactSlice = Math.min(1.0, (sw0 - corey.Swi) / Math.max(0.01, welge.Swf - corey.Swi));
          }
        }

        if (exactSlice > 0 || state.timePVI > 0.0005) {
          const normSlice = Math.max(0.05, exactSlice);
          frontPoints.push({
            x: coreX + (normSlice / NUM_SLICES) * coreW,
            y: coreY + (j + 0.5) * layerH,
            layer: j,
            fraction: normSlice / NUM_SLICES,
          });
        }
      }

      // Draw smooth continuous frontal advance curve (eliminates discrete saw-tooth zigzag)
      if (frontPoints.length >= 2) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.0;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(frontPoints[0].x, frontPoints[0].y);

        for (let k = 0; k < frontPoints.length - 1; k++) {
          const current = frontPoints[k];
          const next = frontPoints[k + 1];
          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;
          ctx.quadraticCurveTo(current.x, current.y, midX, midY);
        }
        ctx.lineTo(frontPoints[frontPoints.length - 1].x, frontPoints[frontPoints.length - 1].y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Front markers on each layer
        frontPoints.forEach((pt) => {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Watermark "Willam Pham" directly on the canvas top-right inside core chamber
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = 'bold 9px "Fira Code", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('Willam Pham', coreX + coreW - 8, coreY + 14);

      ctx.restore(); // End clipping

      // Outer border around core
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(coreX, coreY, coreW, coreH);

      // Layer index badges on left edge (Layer 1 Top to Layer 7 Bottom)
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px "Fira Code", monospace';
      ctx.textAlign = 'right';
      for (let j = 0; j < NUM_LAYERS; j++) {
        const y = coreY + (j + 0.65) * layerH;
        ctx.fillText(`L${j + 1}`, coreX - 10, y);
      }

      // Coordinate Scale along core bottom
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Fira Code", monospace';
      ctx.textAlign = 'center';

      const ticks = 5;
      for (let t = 0; t <= ticks; t++) {
        const fraction = t / ticks;
        const tickX = coreX + fraction * coreW;
        const cmVal = (fraction * params.lengthCm).toFixed(1);
        const sliceNum = Math.round(fraction * NUM_SLICES);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tickX, coreY + coreH);
        ctx.lineTo(tickX, coreY + coreH + 6);
        ctx.stroke();

        ctx.fillText(`${cmVal} cm`, tickX, coreY + coreH + 18);
        ctx.fillText(`(Slide ${sliceNum})`, tickX, coreY + coreH + 30);
      }

      // Inlet label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('INLET (x=0)', coreX - 58, coreY + coreH + 18);

      // Outlet label
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('OUTLET (x=L)', coreX + coreW + 58, coreY + coreH + 18);

      // Dynamic Flow Regime & Gravity indication badge
      const M = (corey.krwMax / params.muW) / (corey.kroMax / params.muO);
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';

      if (params.includeGravity && params.orientationDeg === 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`▼ GRAVITY UNDERRUN ACTIVE: Water slumping into bottom L6-L7 | M = ${M.toFixed(1)}`, gaugeCenterX, coreY - 14);
      } else if (M > 1.5) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`⚡ VISCOUS FINGERING ACTIVE (Unfavorable M = ${M.toFixed(1)} > 1): High-perm streaks surge ahead`, gaugeCenterX, coreY - 14);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.fillText(`✓ STABLE PISTON ADVANCE (Favorable M = ${M.toFixed(1)} ≤ 1): Uniform displacement front`, gaugeCenterX, coreY - 14);
      }

      if (isRunning) {
        animFrame = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [params, state, corey]);

  // Mouse move inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 70;
    const paddingRight = 70;
    const paddingTop = 78;
    const paddingBottom = 48;

    const coreX = paddingLeft;
    const coreY = paddingTop;
    const coreW = canvas.width - paddingLeft - paddingRight;
    const coreH = canvas.height - paddingTop - paddingBottom;

    if (x >= coreX && x <= coreX + coreW && y >= coreY && y <= coreY + coreH) {
      const xRatio = (x - coreX) / coreW;
      const yRatio = (y - coreY) / coreH;

      const sliceIdx = Math.max(0, Math.min(NUM_SLICES - 1, Math.floor(xRatio * NUM_SLICES)));
      const layerIdx = Math.max(0, Math.min(NUM_LAYERS - 1, Math.floor(yRatio * NUM_LAYERS)));

      const xCm = xRatio * params.lengthCm;
      const yCm = yRatio * params.diamCm;
      const Sw = state.gridSw2D[layerIdx]?.[sliceIdx] ?? corey.Swi;
      const So = 1 - Sw;
      const { krw, kro } = calculateRelPerm(Sw, corey);

      setHoverData({
        layer: layerIdx + 1,
        slice: sliceIdx + 1,
        xCm,
        yCm,
        Sw,
        So,
        krw,
        kro,
        xPx: x,
        yPx: y,
      });
    } else {
      setHoverData(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm relative overflow-hidden">
      {/* Top Banner & Visualizer Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Hassler Core Holder (7 Layers × 100 Slices Mesh)
              {state.breakthroughPVI !== null && (
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> BT @ {state.breakthroughPVI.toFixed(2)} PV
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Mesh: 7 horizontal layers (gravity segregation) &bull; 100 axial slides (frontal advance)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={onToggleMeshGrid}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium border transition cursor-pointer ${
              state.showMeshGrid
                ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle visible 7x100 mesh grid lines"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            {state.showMeshGrid ? 'Hide Mesh Lines' : 'Show Mesh Grid'}
          </button>

          <button
            onClick={onOpenPoreModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 border border-slate-700 rounded-lg font-medium transition cursor-pointer"
            title="Inspect pore scale displacement physics"
          >
            <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
            Micro-Pore View
          </button>
        </div>
      </div>

      {/* Canvas Display */}
      <div className="relative w-full overflow-x-auto rounded-xl bg-slate-950/80 border border-slate-800 p-2">
        <canvas
          ref={canvasRef}
          width={860}
          height={260}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
          className="w-full max-w-full h-auto cursor-crosshair block mx-auto select-none"
        />

        {/* Hover Saturation Inspection Tooltip */}
        {hoverData && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 border border-sky-500/40 text-slate-200 text-xs rounded-lg p-2.5 shadow-2xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(hoverData.xPx / 860) * 100}%`,
              top: `${(hoverData.yPx / 260) * 100}%`,
            }}
          >
            <div className="font-semibold text-sky-300 border-b border-slate-700/80 pb-1 mb-1.5 flex justify-between gap-4">
              <span>Layer {hoverData.layer} (of 7) &bull; Slide {hoverData.slice}/100</span>
              <span className="text-slate-400">x={hoverData.xCm.toFixed(1)} cm</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
              <span className="text-sky-400 font-semibold">Water (Sw): {(hoverData.Sw * 100).toFixed(1)}%</span>
              <span className="text-stone-300 font-semibold">Oil (So): {(hoverData.So * 100).toFixed(1)}%</span>
              <span className="text-slate-300">krw: {hoverData.krw.toFixed(3)}</span>
              <span className="text-slate-300">kro: {hoverData.kro.toFixed(3)}</span>
            </div>
          </div>
        )}

        {/* Watermark "Willam Pham" in bottom-right corner */}
        <div className="absolute bottom-3 right-4 pointer-events-none select-none text-[11px] font-semibold text-sky-300/80 font-mono tracking-wider bg-slate-950/70 px-2.5 py-0.5 rounded border border-sky-800/40">
          Willam Pham
        </div>
      </div>

      {/* EXACT FRONTAL ADVANCE SPEED & TIMING METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/90 border border-slate-800/90 p-2.5 rounded-xl font-mono mt-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Frontal Advance Speed (vf)
          </span>
          <span className="text-amber-400 font-bold text-xs mt-0.5">
            {velocities.vfCmSec.toFixed(3)} cm/s
          </span>
          <span className="text-[10px] text-slate-500 font-sans">
            ({velocities.vfMmSec.toFixed(2)} mm/s &bull; {velocities.vfCmMin.toFixed(1)} cm/min)
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
            <Timer className="w-3 h-3 text-sky-400" /> Time to 1.0 PV (t_1PV)
          </span>
          <span className="text-sky-400 font-bold text-xs mt-0.5">
            {velocities.timeTo1PV_sec.toFixed(1)} seconds
          </span>
          <span className="text-[10px] text-slate-500 font-sans">
            (at {geom.qCm3Sec.toFixed(2)} cc/s &bull; Vp={geom.poreVolumeCm3.toFixed(1)} cc)
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Breakthrough Time (t_BT)
          </span>
          <span className="text-emerald-400 font-bold text-xs mt-0.5">
            {velocities.t_BT_sec.toFixed(1)} seconds
          </span>
          <span className="text-[10px] text-slate-500 font-sans">
            ({welge.pvi_BT.toFixed(2)} PVI &bull; {(velocities.t_BT_min).toFixed(1)} min)
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
            <Clock className="w-3 h-3 text-rose-400" /> Elapsed Physical Time
          </span>
          <span className="text-rose-400 font-bold text-xs mt-0.5">
            {state.timeSeconds.toFixed(1)} s
          </span>
          <span className="text-[10px] text-slate-500 font-sans">
            Front: {averageFrontCm.toFixed(1)} cm / {params.lengthCm} cm ({((averageFrontCm / params.lengthCm) * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Legend & Petrophysical Footnote */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#38bdf8] shadow-sm inline-block"></span>
            Water (Light Blue)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#18181b] border border-slate-600 shadow-sm inline-block"></span>
            Crude Oil (Dark Grey-Black)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-slate-400 inline-block"></span>
            Sand Grains / Pores
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-amber-400 inline-block"></span>
            Water Front Advance (Smooth)
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <span>
            PV: <strong className="text-slate-200">{geom.poreVolumeCm3.toFixed(1)} cm³</strong>
          </span>
          <span>
            OOIP: <strong className="text-slate-200">{geom.ooipCm3.toFixed(1)} cm³</strong>
          </span>
          <span>
            Flux $u_t$: <strong className="text-slate-200">{(geom.utMs * 86400).toFixed(2)} m/d</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
