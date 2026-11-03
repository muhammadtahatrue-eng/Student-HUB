import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Package } from 'lucide-react';

/**
 * Future-ready product item structure.
 * When real products are introduced later, populate a catalog array using this interface.
 */
export interface XeusarStoreProduct {
  id: string;
  name: string;
  summary: string;
  category?: string;
  available: boolean;
}

interface ProductsViewProps {
  onBackToHome: () => void;
  /**
   * Reserved for future product catalog expansion.
   * Currently kept empty so the page renders in Coming Soon mode.
   */
  products?: XeusarStoreProduct[];
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

// 8 vertices of a unit cube [-1, 1]^3
// 0..3: Top face (y = -1), 4..7: Bottom face (y = +1)
const CUBE_VERTICES: Vec3[] = [
  { x: -1, y: -1, z: -1 }, // 0: Top-Back-Left
  { x: 1, y: -1, z: -1 },  // 1: Top-Back-Right
  { x: 1, y: -1, z: 1 },   // 2: Top-Front-Right
  { x: -1, y: -1, z: 1 },  // 3: Top-Front-Left
  { x: -1, y: 1, z: -1 },  // 4: Bottom-Back-Left
  { x: 1, y: 1, z: -1 },   // 5: Bottom-Back-Right
  { x: 1, y: 1, z: 1 },    // 6: Bottom-Front-Right
  { x: -1, y: 1, z: 1 }    // 7: Bottom-Front-Left
];

// 4 side faces (ordered around the vertical axis)
const SIDE_FACES: [number, number, number, number][] = [
  [0, 1, 5, 4], // Back
  [1, 2, 6, 5], // Right
  [2, 3, 7, 6], // Front
  [3, 0, 4, 7]  // Left
];

// 12 edges of the cube with metadata for top-face scanner response
const CUBE_EDGES: { a: number; b: number; isTop: boolean; zMid: number }[] = [
  // Top face edges (0..3)
  { a: 0, b: 1, isTop: true, zMid: -1 },
  { a: 1, b: 2, isTop: true, zMid: 0 },
  { a: 2, b: 3, isTop: true, zMid: 1 },
  { a: 3, b: 0, isTop: true, zMid: 0 },
  // Bottom face edges (4..7)
  { a: 4, b: 5, isTop: false, zMid: -1 },
  { a: 5, b: 6, isTop: false, zMid: 0 },
  { a: 6, b: 7, isTop: false, zMid: 1 },
  { a: 7, b: 4, isTop: false, zMid: 0 },
  // Vertical pillar edges (8..11)
  { a: 0, b: 4, isTop: false, zMid: -1 },
  { a: 1, b: 5, isTop: false, zMid: -1 },
  { a: 2, b: 6, isTop: false, zMid: 1 },
  { a: 3, b: 7, isTop: false, zMid: 1 }
];

const HolographicScannerBoxSvg: React.FC = () => {
  const outerRingRef = useRef<SVGCircleElement | null>(null);
  const innerRingRef = useRef<SVGCircleElement | null>(null);
  const bottomFaceRef = useRef<SVGPolygonElement | null>(null);
  const sideFaceRefs = useRef<(SVGPolygonElement | null)[]>([]);
  const topUnderGlowRef = useRef<SVGPolygonElement | null>(null);
  const topFaceRef = useRef<SVGPolygonElement | null>(null);
  const innerCoreRef = useRef<SVGPolygonElement | null>(null);
  const packageSeamRef = useRef<SVGLineElement | null>(null);
  const scanStripRef = useRef<SVGPolygonElement | null>(null);
  const scanDepthGlowRef = useRef<SVGPolygonElement | null>(null);
  const scanBeamGlowRef = useRef<SVGLineElement | null>(null);
  const scanBeamCoreRef = useRef<SVGLineElement | null>(null);
  const scanEndpointARef = useRef<SVGCircleElement | null>(null);
  const scanEndpointBRef = useRef<SVGCircleElement | null>(null);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const vertexGlowRefs = useRef<(SVGCircleElement | null)[]>([]);
  const vertexCoreRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const pitch = (30 * Math.PI) / 180; // Isometric 30-degree pitch
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const centerX = 120;
    const centerY = 120;
    const baseScale = 39.5;
    const cameraDist = 9.0;

    // Timing constants: 10s per 360° cube revolution, 2s per side-to-side scanner sweep (5 sweeps per revolution)
    const CUBE_REVOLUTION_SECONDS = 10.0;
    const SCAN_SWEEP_SECONDS = 2.0;

    const project3D = (pt: Vec3, yaw: number): ProjectedPoint => {
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);

      // Rotate around vertical Y-axis
      const rx = pt.x * cosYaw - pt.z * sinYaw;
      const ry = pt.y;
      const rz = pt.x * sinYaw + pt.z * cosYaw;

      // Isometric tilt around horizontal X-axis
      const tx = rx;
      const ty = ry * cosPitch - rz * sinPitch;
      const tz = ry * sinPitch + rz * cosPitch;

      // Restrained perspective so the cube maintains a rock-steady scale and center
      const perspective = cameraDist / (cameraDist - tz * 0.22);

      return {
        x: centerX + tx * baseScale * perspective,
        y: centerY + ty * baseScale * perspective,
        z: tz
      };
    };

    const formatPolygonPoints = (pts: ProjectedPoint[]) =>
      pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

    const renderFrame = (timeMs: number, reducedMotion: boolean) => {
      const t = timeMs * 0.001;
      // 1 full smooth linear 360-degree revolution every 10 seconds
      const yaw = reducedMotion
        ? Math.PI / 4
        : ((t / CUBE_REVOLUTION_SECONDS) * Math.PI * 2) % (Math.PI * 2);

      // 1 side-to-side sweep every 2 seconds (5 sweeps per 10-second cube revolution)
      // Smoothly reverses at each edge [-0.94, +0.94]
      const scanWave = reducedMotion ? 0.18 : -Math.cos((t / SCAN_SWEEP_SECONDS) * Math.PI);
      const scanZ = scanWave * 0.94;
      const stripHalfWidth = 0.2;

      // 1. Subtle layered ring motion
      if (outerRingRef.current) {
        const ringAngle = reducedMotion ? 0 : (t * 6) % 360;
        const outerOpacity = reducedMotion ? 0.08 : 0.065 + 0.025 * Math.sin(t * 0.9);
        outerRingRef.current.setAttribute('transform', `rotate(${ringAngle.toFixed(2)} 120 120)`);
        outerRingRef.current.setAttribute('stroke', `rgba(255,255,255,${outerOpacity.toFixed(3)})`);
      }

      if (innerRingRef.current) {
        const innerPulse = reducedMotion ? 0.2 : 0.16 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.4));
        innerRingRef.current.setAttribute('stroke', `rgba(0,240,255,${innerPulse.toFixed(3)})`);
      }

      // 2. Project all 8 cube vertices
      const projected = CUBE_VERTICES.map((v) => project3D(v, yaw));

      // 3. Bottom face (subtle wireframe base)
      if (bottomFaceRef.current) {
        bottomFaceRef.current.setAttribute(
          'points',
          formatPolygonPoints([projected[4], projected[5], projected[6], projected[7]])
        );
      }

      // 4. Side faces with natural depth shading
      SIDE_FACES.forEach((faceIndices, idx) => {
        const poly = sideFaceRefs.current[idx];
        if (!poly) return;
        const pts = faceIndices.map((vi) => projected[vi]);
        poly.setAttribute('points', formatPolygonPoints(pts));

        const avgZ = (pts[0].z + pts[1].z + pts[2].z + pts[3].z) * 0.25;
        const isFrontFacing = avgZ > 0;
        const fillAlpha = isFrontFacing ? 0.03 + avgZ * 0.018 : 0.012;
        poly.setAttribute(
          'fill',
          isFrontFacing
            ? `rgba(0,240,255,${Math.min(0.055, Math.max(0.018, fillAlpha)).toFixed(3)})`
            : `rgba(255,255,255,0.014)`
        );
      });

      // 5. Subtle cyan reflection/glow plane directly beneath the top face
      if (topUnderGlowRef.current) {
        const underPts = [
          project3D({ x: -0.92, y: -0.74, z: -0.92 }, yaw),
          project3D({ x: 0.92, y: -0.74, z: -0.92 }, yaw),
          project3D({ x: 0.92, y: -0.74, z: 0.92 }, yaw),
          project3D({ x: -0.92, y: -0.74, z: 0.92 }, yaw)
        ];
        topUnderGlowRef.current.setAttribute('points', formatPolygonPoints(underPts));
      }

      // 6. Top face polygon
      if (topFaceRef.current) {
        topFaceRef.current.setAttribute(
          'points',
          formatPolygonPoints([projected[0], projected[1], projected[2], projected[3]])
        );
      }

      // 7. Inner floating prism core (y = -0.38, scaled to 0.42)
      if (innerCoreRef.current) {
        const coreScale = 0.42;
        const coreY = -0.38;
        const corePts = [
          project3D({ x: -coreScale, y: coreY, z: -coreScale }, yaw),
          project3D({ x: coreScale, y: coreY, z: -coreScale }, yaw),
          project3D({ x: coreScale, y: coreY, z: coreScale }, yaw),
          project3D({ x: -coreScale, y: coreY, z: coreScale }, yaw)
        ];
        innerCoreRef.current.setAttribute('points', formatPolygonPoints(corePts));
      }

      // 8. Package seam line across the center of the top face (z = 0)
      if (packageSeamRef.current) {
        const seamA = project3D({ x: -1, y: -1, z: 0 }, yaw);
        const seamB = project3D({ x: 1, y: -1, z: 0 }, yaw);
        packageSeamRef.current.setAttribute('x1', seamA.x.toFixed(2));
        packageSeamRef.current.setAttribute('y1', seamA.y.toFixed(2));
        packageSeamRef.current.setAttribute('x2', seamB.x.toFixed(2));
        packageSeamRef.current.setAttribute('y2', seamB.y.toFixed(2));
        const seamProximity = Math.max(0, 1 - Math.abs(scanZ) / 0.32);
        const seamAlpha = 0.32 + seamProximity * 0.36;
        packageSeamRef.current.setAttribute('stroke', `rgba(0,240,255,${seamAlpha.toFixed(3)})`);
      }

      // 9. Animated scanning strip & beam mapped directly on the rotating top face (y = -1)
      const zStart = Math.max(-1, scanZ - stripHalfWidth);
      const zEnd = Math.min(1, scanZ + stripHalfWidth);

      if (scanStripRef.current) {
        const stripPts = [
          project3D({ x: -1, y: -1, z: zStart }, yaw),
          project3D({ x: 1, y: -1, z: zStart }, yaw),
          project3D({ x: 1, y: -1, z: zEnd }, yaw),
          project3D({ x: -1, y: -1, z: zEnd }, yaw)
        ];
        scanStripRef.current.setAttribute('points', formatPolygonPoints(stripPts));
      }

      // Subtle holographic vertical light curtain beneath the scanner line inside the top of the box
      if (scanDepthGlowRef.current) {
        const curtainPts = [
          project3D({ x: -0.96, y: -1, z: scanZ }, yaw),
          project3D({ x: 0.96, y: -1, z: scanZ }, yaw),
          project3D({ x: 0.96, y: -0.54, z: scanZ }, yaw),
          project3D({ x: -0.96, y: -0.54, z: scanZ }, yaw)
        ];
        scanDepthGlowRef.current.setAttribute('points', formatPolygonPoints(curtainPts));
      }

      const scanLeft = project3D({ x: -1, y: -1, z: scanZ }, yaw);
      const scanRight = project3D({ x: 1, y: -1, z: scanZ }, yaw);

      if (scanBeamGlowRef.current) {
        scanBeamGlowRef.current.setAttribute('x1', scanLeft.x.toFixed(2));
        scanBeamGlowRef.current.setAttribute('y1', scanLeft.y.toFixed(2));
        scanBeamGlowRef.current.setAttribute('x2', scanRight.x.toFixed(2));
        scanBeamGlowRef.current.setAttribute('y2', scanRight.y.toFixed(2));
      }

      if (scanBeamCoreRef.current) {
        scanBeamCoreRef.current.setAttribute('x1', scanLeft.x.toFixed(2));
        scanBeamCoreRef.current.setAttribute('y1', scanLeft.y.toFixed(2));
        scanBeamCoreRef.current.setAttribute('x2', scanRight.x.toFixed(2));
        scanBeamCoreRef.current.setAttribute('y2', scanRight.y.toFixed(2));
      }

      if (scanEndpointARef.current) {
        scanEndpointARef.current.setAttribute('cx', scanLeft.x.toFixed(2));
        scanEndpointARef.current.setAttribute('cy', scanLeft.y.toFixed(2));
      }

      if (scanEndpointBRef.current) {
        scanEndpointBRef.current.setAttribute('cx', scanRight.x.toFixed(2));
        scanEndpointBRef.current.setAttribute('cy', scanRight.y.toFixed(2));
      }

      // 10. All 12 wireframe edges with camera-depth weighting and scanner illumination
      CUBE_EDGES.forEach((edge, idx) => {
        const lineEl = edgeRefs.current[idx];
        if (!lineEl) return;

        const pa = projected[edge.a];
        const pb = projected[edge.b];
        lineEl.setAttribute('x1', pa.x.toFixed(2));
        lineEl.setAttribute('y1', pa.y.toFixed(2));
        lineEl.setAttribute('x2', pb.x.toFixed(2));
        lineEl.setAttribute('y2', pb.y.toFixed(2));

        const midZ = (pa.z + pb.z) * 0.5;
        // Normalized depth [0..1] where 1 is closest to viewer
        const depthNorm = Math.min(1, Math.max(0, (midZ + 1.35) / 2.7));

        if (edge.isTop) {
          // Top edges respond to scanner proximity
          const va = CUBE_VERTICES[edge.a];
          const vb = CUBE_VERTICES[edge.b];
          const edgeLocalZ = (va.z + vb.z) * 0.5;
          const distToScanner =
            va.z === vb.z ? Math.abs(scanZ - edgeLocalZ) : Math.abs(scanZ) * 0.5;
          const scanBoost = Math.max(0, 1 - distToScanner / 0.42);

          const alpha = Math.min(0.95, 0.42 + depthNorm * 0.24 + scanBoost * 0.32);
          const width = 1.35 + depthNorm * 0.3 + scanBoost * 0.45;
          lineEl.setAttribute('stroke', `rgba(0,240,255,${alpha.toFixed(3)})`);
          lineEl.setAttribute('stroke-width', width.toFixed(2));
        } else {
          // Side and bottom edges: front-facing glow cyan, rear-facing subtle gray
          const isFrontEdge = depthNorm > 0.52;
          if (isFrontEdge) {
            const alpha = 0.22 + (depthNorm - 0.5) * 0.48;
            lineEl.setAttribute('stroke', `rgba(0,240,255,${alpha.toFixed(3)})`);
            lineEl.setAttribute('stroke-width', (1.15 + depthNorm * 0.4).toFixed(2));
          } else {
            const alpha = 0.14 + depthNorm * 0.18;
            lineEl.setAttribute('stroke', `rgba(255,255,255,${alpha.toFixed(3)})`);
            lineEl.setAttribute('stroke-width', '1.1');
          }
        }
      });

      // 11. 8 glowing vertex points with gentle staggered pulse + scanner illumination on top vertices
      projected.forEach((pt, idx) => {
        const glowCircle = vertexGlowRefs.current[idx];
        const coreCircle = vertexCoreRefs.current[idx];
        if (!glowCircle || !coreCircle) return;

        glowCircle.setAttribute('cx', pt.x.toFixed(2));
        glowCircle.setAttribute('cy', pt.y.toFixed(2));
        coreCircle.setAttribute('cx', pt.x.toFixed(2));
        coreCircle.setAttribute('cy', pt.y.toFixed(2));

        const isTopVertex = idx < 4;
        const localVertex = CUBE_VERTICES[idx];
        const scanProximity = isTopVertex
          ? Math.max(0, 1 - Math.abs(scanZ - localVertex.z) / 0.38)
          : 0;

        const staggeredPulse = reducedMotion
          ? 0.5
          : 0.5 + 0.5 * Math.sin(t * 2.0 + idx * 0.85);
        const depthNorm = Math.min(1, Math.max(0, (pt.z + 1.35) / 2.7));

        const coreRadius =
          (isTopVertex ? 2.25 : 1.9) +
          depthNorm * 0.45 +
          scanProximity * 0.95 +
          staggeredPulse * 0.2;
        const glowRadius = coreRadius * (2.0 + scanProximity * 0.65);
        const glowOpacity =
          (0.12 + depthNorm * 0.15 + staggeredPulse * 0.12 + scanProximity * 0.36) *
          (isTopVertex ? 1 : 0.72);

        coreCircle.setAttribute('r', coreRadius.toFixed(2));
        coreCircle.setAttribute(
          'fill',
          scanProximity > 0.4
            ? '#ffffff'
            : isTopVertex || depthNorm > 0.55
            ? '#00f0ff'
            : 'rgba(255,255,255,0.7)'
        );

        glowCircle.setAttribute('r', glowRadius.toFixed(2));
        glowCircle.setAttribute('fill', `rgba(0,240,255,${Math.min(0.68, glowOpacity).toFixed(3)})`);
      });
    };

    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (mediaQuery?.matches) {
      renderFrame(0, true);
      return;
    }

    let animationFrameId: number;
    const tick = (now: number) => {
      renderFrame(now, false);
      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-44 h-44 sm:w-52 sm:h-52 overflow-visible select-none pointer-events-none"
    >
      <defs>
        {/* Subtle Holographic Cyan Glow Filter for Scanner & Front Edges */}
        <filter id="xeusar-scanner-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle Top-Surface Gradient */}
        <linearGradient id="xeusar-top-face-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,240,255,0.11)" />
          <stop offset="50%" stopColor="rgba(0,240,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,240,255,0.09)" />
        </linearGradient>

        {/* Faint Translucent Cyan Light Strip Gradient for Scanner */}
        <linearGradient id="xeusar-scan-strip-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,240,255,0.03)" />
          <stop offset="50%" stopColor="rgba(0,240,255,0.20)" />
          <stop offset="100%" stopColor="rgba(0,240,255,0.03)" />
        </linearGradient>

        {/* Subtle Vertical Reflection Curtain Beneath Scanner */}
        <linearGradient id="xeusar-scan-curtain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,240,255,0.16)" />
          <stop offset="100%" stopColor="rgba(0,240,255,0)" />
        </linearGradient>
      </defs>

      {/* Outer subtle dashed orbit ring */}
      <circle
        ref={outerRingRef}
        cx="120"
        cy="120"
        r="94"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
        strokeDasharray="4 6"
      />

      {/* Inner pulsing cyan ring */}
      <circle
        ref={innerRingRef}
        cx="120"
        cy="120"
        r="70"
        stroke="rgba(0,240,255,0.2)"
        strokeWidth="1"
      />

      {/* Cube Bottom Wireframe Face */}
      <polygon
        ref={bottomFaceRef}
        points="120,118 176,150 120,182 64,150"
        fill="rgba(0,240,255,0.015)"
      />

      {/* 4 Rotating Side Faces */}
      {[0, 1, 2, 3].map((idx) => (
        <polygon
          key={`side-face-${idx}`}
          ref={(el) => {
            sideFaceRefs.current[idx] = el;
          }}
          points="64,86 120,118 120,182 64,150"
          fill="rgba(255,255,255,0.02)"
        />
      ))}

      {/* Faint Cyan Reflection Plane Beneath the Top Face */}
      <polygon
        ref={topUnderGlowRef}
        points="120,66 168,94 120,122 72,94"
        fill="rgba(0,240,255,0.045)"
      />

      {/* Inner Floating Holographic Core Prism */}
      <polygon
        ref={innerCoreRef}
        points="120,76 144,90 120,104 96,90"
        fill="rgba(0,240,255,0.18)"
        stroke="rgba(0,240,255,0.35)"
        strokeWidth="0.9"
      />

      {/* Rotating Top Face */}
      <polygon
        ref={topFaceRef}
        points="120,54 176,86 120,118 64,86"
        fill="url(#xeusar-top-face-grad)"
      />

      {/* Package Seam Line on Top Face */}
      <line
        ref={packageSeamRef}
        x1="92"
        y1="70"
        x2="148"
        y2="102"
        stroke="rgba(0,240,255,0.45)"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      {/* Vertical Light Curtain Under Scanner Beam */}
      <polygon
        ref={scanDepthGlowRef}
        points="92,70 148,102 148,122 92,90"
        fill="url(#xeusar-scan-curtain-grad)"
      />

      {/* Illuminated Translucent Cyan Strip Across Top Face */}
      <polygon
        ref={scanStripRef}
        points="92,70 148,102 136,109 80,77"
        fill="url(#xeusar-scan-strip-grad)"
      />

      {/* 12 3D Wireframe Cube Edges */}
      {CUBE_EDGES.map((_, idx) => (
        <line
          key={`cube-edge-${idx}`}
          ref={(el) => {
            edgeRefs.current[idx] = el;
          }}
          x1="120"
          y1="54"
          x2="176"
          y2="86"
          stroke="rgba(0,240,255,0.45)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* Scanner Beam Soft Cyan Glow Line */}
      <line
        ref={scanBeamGlowRef}
        x1="92"
        y1="70"
        x2="148"
        y2="102"
        stroke="#00f0ff"
        strokeWidth="2.8"
        strokeOpacity="0.48"
        strokeLinecap="round"
        filter="url(#xeusar-scanner-glow)"
      />

      {/* Scanner Beam Bright Core Line */}
      <line
        ref={scanBeamCoreRef}
        x1="92"
        y1="70"
        x2="148"
        y2="102"
        stroke="#e0ffff"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      {/* Scanner Edge Contact Nodes */}
      <circle
        ref={scanEndpointARef}
        cx="92"
        cy="70"
        r="1.9"
        fill="#ffffff"
        filter="url(#xeusar-scanner-glow)"
      />
      <circle
        ref={scanEndpointBRef}
        cx="148"
        cy="102"
        r="1.9"
        fill="#ffffff"
        filter="url(#xeusar-scanner-glow)"
      />

      {/* 8 Cube Vertex Nodes (Soft Outer Pulse + Crisp Core) */}
      {CUBE_VERTICES.map((_, idx) => (
        <g key={`cube-vertex-${idx}`}>
          <circle
            ref={(el) => {
              vertexGlowRefs.current[idx] = el;
            }}
            cx="120"
            cy="54"
            r="5.5"
            fill="rgba(0,240,255,0.28)"
          />
          <circle
            ref={(el) => {
              vertexCoreRefs.current[idx] = el;
            }}
            cx="120"
            cy="54"
            r="2.6"
            fill="#00f0ff"
          />
        </g>
      ))}
    </svg>
  );
};

export const ProductsView: React.FC<ProductsViewProps> = ({
  onBackToHome,
  products = []
}) => {
  const isComingSoon = products.length === 0;

  return (
    <section
      aria-labelledby="xeusar-products-heading"
      className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-28 md:pb-20 font-outfit text-white flex flex-col justify-center min-h-[75vh]"
    >
      {isComingSoon && (
        <div className="relative rounded-3xl border border-white/15 bg-black/60 backdrop-blur-2xl p-6 sm:p-12 md:p-16 shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[28rem] h-[16rem] rounded-full bg-cyan-500/10 blur-3xl"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Core Store Copy & Primary Action */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Eyebrow & Status Badge Row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-jetbrains font-semibold tracking-[0.2em] uppercase text-cyan-300">
                  <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>THE XEUSAR STORE</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/15 border border-cyan-400/35 text-[11px] font-jetbrains font-bold tracking-widest uppercase text-cyan-300">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"
                  />
                  <span>COMING SOON</span>
                </span>
              </div>

              {/* Main Heading */}
              <h1
                id="xeusar-products-heading"
                className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.08]"
              >
                Something Useful Is Coming.
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
                We&apos;re working on bringing you a collection of useful products designed to
                complement your academic journey and the Xeusar experience. Our product collection
                is currently in development, and we&apos;ll share more details when it&apos;s
                ready.
              </p>

              {/* Supporting Message Callout */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 max-w-xl">
                <div className="text-[11px] font-jetbrains font-bold uppercase tracking-widest text-cyan-300 mb-1">
                  COMING SOON
                </div>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                  Our collection isn&apos;t available just yet. Check back soon for updates.
                </p>
              </div>

              {/* Primary Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-black hover:bg-white/90 text-xs sm:text-sm font-black uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.25)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </button>
              </div>
            </div>

            {/* Right Column: Animated 3D Holographic Scanner Product Box */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative w-full max-w-[300px] aspect-square rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 flex flex-col items-center justify-center shadow-inner overflow-hidden">
                {/* Corner geometric accents (Stationary) */}
                <div
                  aria-hidden="true"
                  className="absolute top-4 left-4 w-3 h-3 border-t border-l border-cyan-400/40"
                />
                <div
                  aria-hidden="true"
                  className="absolute top-4 right-4 w-3 h-3 border-t border-r border-cyan-400/40"
                />
                <div
                  aria-hidden="true"
                  className="absolute bottom-4 left-4 w-3 h-3 border-b border-l border-cyan-400/40"
                />
                <div
                  aria-hidden="true"
                  className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-cyan-400/40"
                />

                {/* Animated 3D Holographic Wireframe Cube & Top-Surface Scanner */}
                <HolographicScannerBoxSvg />

                <div className="mt-2 text-center">
                  <span className="text-[11px] font-jetbrains uppercase tracking-[0.22em] text-white/55">
                    COMING SOON
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
