# High-Intensity Neon Lighting & Spring-Momentum Thread Physics

Supercharge the neon lighting system with high-intensity point lights and luminous emissive core glow, paired with spring-physics momentum (`k: 0.08`, `damping: 0.92`), velocity-lag inertia, and flowing ribbon trail curve generation following the user's detailed specification.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed decisions guide this implementation:

- **Amplified Neon Lighting & Emissive Core Glow**:
  - Boost point light brightness and atmospheric radiance: increase light intensity from 180 to 450+ with tight point falloff, and add `emissive` color with `emissiveIntensity: 0.65`–`0.85` on the tubular materials so the threads glow with genuine internal neon radiance even in deep shadows.
  - Set renderer tone mapping exposure to `1.35` for rich, saturated neon color punch.
- **Physics-Based Spring Momentum (`k: 0.08`, `damping: 0.92`)**:
  - Implement the exact spring equation:
    $$\vec{F} = (\vec{P}_{\text{target}} - \vec{P}_{\text{current}}) \cdot k$$
    $$\vec{V} = (\vec{V} + \vec{F}) \cdot \text{damping}$$
    $$\vec{P}_{\text{current}} = \vec{P}_{\text{current}} + \vec{V}$$
  - Creates the authentic natural trailing feeling with a subtle, satisfying bounce on sudden cursor direction changes.
- **Flowing Ribbon Trail Mechanics**:
  - Maintain a dynamic sliding history buffer of 3D positions for each thread ($N \approx 72\text{--}90$ control segments) that continuously paints the ribbon trail as the cursor sweeps across space.
  - Interpolate smooth 3D curves using `THREE.CatmullRomCurve3` with continuous $Z$-axis twisting rotation (`0.02` rad/frame) creating the dynamic ribbon wave.
- **Palette Transitions**: Retain default grayscale threads (`#ffffff`, `#333333`, `#aaaaaa`) with brilliant white illumination, transitioning dynamically to randomized high-intensity neon color combinations on click.

---

## 1. Overview & Core Concept

- **Visual Impact**: The 3D threads illuminate the scene with brilliant neon glow, casting vibrant specular reflections. Instead of rigid orbiting, the threads now behave like energized, luminous physical ribbons possessing mass and inertia, trailing behind cursor motion with smooth spring momentum and gentle bounce.

---

## 2. Technical Math & Movement Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Thread Movement Pipeline                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   1. Mouse 3D Target:   X, Y ∈ [-35, 35], Z ∈ [-10, 10]                │
│   2. Spring Physics:    k = 0.08, damping = 0.92 (velocity integration)│
│   3. Trail History:     Slide historical positions + Catmull-Rom spline│
│   4. Geometry Update:   Dynamic TubeGeometry with radius tapering      │
│   5. Shading & Glow:    Emissive glow + 4 × PointLights (intensity 450)│
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```
