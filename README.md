# PetroVietnam University (PVU) - Core Flood Simulator

> **Multiphase Darcy Flow & Buckley-Leverett Waterflooding Displacement Simulator**  
> Developed for educational & reservoir engineering research at **PetroVietnam University (PVU)**.  
> **Watermark:** Willam Pham

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-cyan.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

The **Core Flood Simulator** is a high-resolution, interactive web simulation of multiphase fluid displacement in porous media. Built strictly in accordance with **Darcy's Law** for multiphase fluid flow and **Buckley-Leverett (1942) / Welge (1952)** displacement theory, it allows petroleum engineering students and researchers to visualize:

- **$7 \times 100$ Mesh Grid**:
  - **7 Horizontal Layers ($L_1$ to $L_7$)**: Observe the vertical dynamics of buoyancy segregation and gravity underrun tongues.
  - **100 Axial Slices**: High-resolution continuous tracking of the water shock front advance ($v_f$) along the core length.
- **Physical Fluid Colors**:
  - Injected Water: Light Sky Blue (`#38bdf8`)
  - Displaced Crude Oil: Deep Dark Slate/Black (`#0f172a`)
  - Rock Matrix: Sandstone grains with visible pore throat micro-textures
- **Realistic Hassler Core Holder Visualizer**:
  - Real-time Differential Pressure Gauge ($\Delta P = P_{\text{in}} - P_{\text{out}}$)
  - Inlet and Producer end-caps with flowing fluid pipelines
  - Interactive hover inspection for localized $S_w$, $S_o$, $k_{rw}$, and $k_{ro}$
  - Micro-pore scale modal for capillary meniscus and pore throat displacement
- **Exact Physical Time Calibration**:
  - For any core pore volume ($V_p$) and injection rate ($q$), the physical time to reach 1.0 Pore Volume Injected (PVI) is rigorously computed:
    $$t_{1\text{PV}} = \frac{V_p}{q}$$
  - Speed multipliers ($1\times$ real physical time up to $50\times$ accelerated time) maintain strict synchronization.
- **Welge Tangent & Corey Relative Permeability**:
  - Interactive Welge tangent construction maximizing chord slope $\frac{f_w(S_w)}{S_w - S_{wi}}$
  - Corey models with wettability presets: Water-wet, Mixed-wet, Oil-wet, and Custom
  - Comprehensive analytical charts: $S_w(x)$ profiles, $k_{rw} / k_{ro}$ curves, fractional flow $f_w$, recovery history $N_p / \text{PV}$, and $\Delta P$ pressure drop.

---

## Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher recommended)
- **npm**, **yarn**, **pnpm**, or **bun**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/pvu-core-flood-simulator.git
   cd pvu-core-flood-simulator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` (or the port specified in terminal output).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the Vite development server on `http://localhost:3000` |
| `npm start` | Alias for `npm run dev` |
| `npm run build` | Compiles TypeScript and builds production assets into `dist/` |
| `npm run preview` | Locally preview the production build |
| `npm run lint` | Runs TypeScript compiler type-checking (`tsc --noEmit`) |
| `npm run clean` | Cleans build artifacts (`dist/`) |

---

## Mathematical Formulation

### 1. Buckley-Leverett 1D Frontal Advance Equation
The velocity of a plane of constant water saturation $S_w$ during linear displacement is given by:
$$v(S_w) = \left(\frac{dx}{dt}\right)_{S_w} = \frac{q}{\phi A} \left(\frac{df_w}{dS_w}\right)_{S_w}$$
where:
- $q$: Volumetric injection rate ($\text{cm}^3/\text{s}$)
- $\phi$: Core porosity (fraction)
- $A$: Core cross-sectional area ($\text{cm}^2 = \frac{\pi D^2}{4}$)
- $f_w$: Fractional flow of water

### 2. Fractional Flow with Gravity & Capillarity
From Darcy's Law for oil and water:
$$f_w(S_w) = \frac{1 + \frac{k k_{ro} A}{q \mu_o}\left(\frac{\partial P_c}{\partial x} - \Delta\rho g \sin\theta\right)}{1 + \frac{k_{ro}}{k_{rw}} \frac{\mu_w}{\mu_o}}$$

### 3. Welge Tangent Construction
The shock front saturation $S_{wf}$ is obtained by drawing a tangent line from $(S_w = S_{wi}, f_w = 0)$ to the fractional flow curve $f_w(S_w)$:
$$\left(\frac{df_w}{dS_w}\right)_{S_{wf}} = \frac{f_w(S_{wf})}{S_{wf} - S_{wi}}$$
The breakthrough pore volume injected is:
$$\text{PVI}_{\text{BT}} = \frac{1}{\left(\frac{df_w}{dS_w}\right)_{S_{wf}}}$$

### 4. Corey Relative Permeability Model
Normalized water saturation:
$$S_w^* = \frac{S_w - S_{wi}}{1 - S_{wi} - S_{or}}$$
Relative permeabilities:
$$k_{rw} = k_{rw}^\circ (S_w^*)^{n_w}$$
$$k_{ro} = k_{ro}^\circ (1 - S_w^*)^{n_o}$$

---

## Project Structure

```
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore patterns
├── index.html                # HTML entry point with metadata
├── package.json              # Project dependencies and npm scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite bundler configuration with Tailwind CSS plugin
├── public/                   # Public static assets
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Main application layout, animation loop, and state
    ├── index.css             # Tailwind v4 CSS and custom styles
    ├── types/
    │   └── simulator.ts      # Core physical types, parameters, and interfaces
    ├── utils/
    │   ├── physics.ts        # Darcy flow, Buckley-Leverett, Welge solver, and geometry
    │   └── presets.ts        # Reservoir scenario presets (including 100 cc Benchmark)
    └── components/
        ├── Navbar.tsx        # Header with PVU logo, controls, presets, and speed
        ├── ParametersPanel.tsx # Parameter input cards (Core, Fluids, Injection, Corey, EOR)
        ├── CoreVisualizer.tsx # Canvas-based Hassler core holder, mesh, and gauge
        ├── AnalyticsCharts.tsx # SVG charts (Profiles, Rel Perm, Welge, Production, ΔP)
        ├── PoreScaleModal.tsx # Microscopic pore throat meniscus visualizer
        └── TheoryModal.tsx   # Theoretical derivations and reference formulas
```

---

## 100 cc Benchmark Verification

To verify physical timing and frontal speed:
1. In the **Simulation Parameters** panel, click **"Load 100 cc Benchmark"**.
2. Parameters set:
   - Length $L = 20.0\text{ cm}$, Diameter $D = 4.0\text{ cm}$ ($A = 12.57\text{ cm}^2$, Bulk Volume $V_b = 251.33\text{ cm}^3$)
   - Porosity $\phi = 0.3979 \implies \text{Pore Volume } V_p = 100.0\text{ cc}$
   - Injection rate $q = 1.0\text{ cc/s}$ ($60.0\text{ cc/min}$)
3. **Expected Results:**
   - Time to fill 1.0 PV: **Exactly $100.0\text{ seconds}$** at $1\times$ speed.
   - Frontal advance speed: matches Buckley-Leverett shock velocity $v_f = \frac{q}{\phi A} \left(\frac{df_w}{dS_w}\right)_{S_{wf}}$.
   - Water breakthrough occurs at exactly $t_{\text{BT}} = 100 \times \text{PVI}_{\text{BT}}\text{ seconds}$.

---

## License & Credits

- **Institution:** [PetroVietnam University (PVU)](https://pvu.edu.vn/)
- **Author / Watermark:** Willam Pham
- **License:** MIT License
