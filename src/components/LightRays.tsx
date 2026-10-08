import { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';

/**
 * LightRays Background Component
 * 
 * A high-performance WebGL-based light ray effect that simulates atmospheric lighting.
 * Supports various origins, mouse following, and organic movement using OGL.
 */

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

export interface LightRaysProps {
  /** The starting point of the light rays */
  raysOrigin?: RaysOrigin;
  /** Primary color of the rays (hex) */
  raysColor?: string;
  /** Animation speed multiplier */
  raysSpeed?: number;
  /** Spread/width of the light beam */
  lightSpread?: number;
  /** Length of the rays relative to container size */
  rayLength?: number;
  /** Enable pulsing intensity */
  pulsating?: boolean;
  /** Distance before rays fade out */
  fadeDistance?: number;
  /** Color saturation (0 to 1) */
  saturation?: number;
  /** Whether rays should tilt towards the mouse */
  followMouse?: boolean;
  /** Intensity of mouse influence (0 to 1) */
  mouseInfluence?: number;
  /** Amount of grain/noise texture */
  noiseAmount?: number;
  /** Amount of wave distortion */
  distortion?: number;
  /** Additional CSS classes */
  className?: string;
}

const DEFAULT_COLOR = '#ffffff';

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (
  origin: RaysOrigin,
  w: number,
  h: number
): { anchor: [number, number]; dir: [number, number] } => {
  const outside = 0.2;
  // In WebGL gl_FragCoord: (0,0) is bottom-left, (w,h) is top-right
  switch (origin) {
    case 'top-left':
      return { anchor: [-outside * w, (1 + outside) * h], dir: [0.707, -0.707] };
    case 'top-right':
      return { anchor: [(1 + outside) * w, (1 + outside) * h], dir: [-0.707, -0.707] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [-outside * w, -outside * h], dir: [0.707, 0.707] };
    case 'bottom-center':
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
    case 'bottom-right':
      return { anchor: [(1 + outside) * w, -outside * h], dir: [-0.707, 0.707] };
    case 'top-center':
    default:
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
  }
};

type Vec2 = [number, number];
type Vec3 = [number, number, number];

interface Uniforms {
  iTime: { value: number };
  iResolution: { value: Vec2 };
  rayPos: { value: Vec2 };
  rayDir: { value: Vec2 };
  raysColor: { value: Vec3 };
  raysSpeed: { value: number };
  lightSpread: { value: number };
  rayLength: { value: number };
  pulsating: { value: number };
  fadeDistance: { value: number };
  saturation: { value: number };
  mousePos: { value: Vec2 };
  mouseInfluence: { value: number };
  noiseAmount: { value: number };
  distortion: { value: number };
  flowPhase: { value: number };
  flowMotion: { value: number };
}

export function LightRays({
  raysOrigin = 'top-center',
  raysColor = DEFAULT_COLOR,
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0.0,
  distortion = 0.0,
  className = ''
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Uniforms | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationIdRef = useRef<number | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const targetColorRef = useRef<[number, number, number]>(hexToRgb(raysColor));
  const currentColorRef = useRef<[number, number, number]>(hexToRgb(raysColor));

  // Fluid spring simulation state for organic flowing motion
  const targetRayPosRef = useRef<[number, number]>([0, 0]);
  const currentRayPosRef = useRef<[number, number]>([0, 0]);
  const posVelocityRef = useRef<[number, number]>([0, 0]);

  const targetRayDirRef = useRef<[number, number]>([0, -1]);
  const currentRayDirRef = useRef<[number, number]>([0, -1]);
  const dirVelocityRef = useRef<[number, number]>([0, 0]);

  const flowPhaseRef = useRef<number>(0);
  const smoothFlowMotionRef = useRef<number>(0);

  // Dynamic uniform updates without re-allocating WebGL context
  useEffect(() => {
    targetColorRef.current = hexToRgb(raysColor);
    if (!uniformsRef.current) return;
    uniformsRef.current.raysSpeed.value = raysSpeed;
    uniformsRef.current.lightSpread.value = lightSpread;
    uniformsRef.current.rayLength.value = rayLength;
    uniformsRef.current.pulsating.value = pulsating ? 1.0 : 0.0;
    uniformsRef.current.fadeDistance.value = fadeDistance;
    uniformsRef.current.saturation.value = saturation;
    uniformsRef.current.mouseInfluence.value = mouseInfluence;
    uniformsRef.current.noiseAmount.value = noiseAmount;
    uniformsRef.current.distortion.value = distortion;

    if (rendererRef.current && containerRef.current) {
      const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
      const dpr = rendererRef.current.dpr;
      const { anchor, dir } = getAnchorAndDir(raysOrigin, wCSS * dpr, hCSS * dpr);
      targetRayPosRef.current = anchor;
      targetRayDirRef.current = dir;
    }
  }, [
    raysOrigin,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    observerRef.current = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observerRef.current.observe(containerRef.current);
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;
    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }

    const initializeWebGL = async () => {
      try {
        if (!containerRef.current) return;
        await new Promise(resolve => setTimeout(resolve, 10));
        if (!containerRef.current) return;

        const renderer = new Renderer({
          dpr: Math.min(window.devicePixelRatio, 2),
          alpha: true
        });
        rendererRef.current = renderer;
        const gl = renderer.gl;

      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';
      gl.canvas.style.display = 'block';

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(gl.canvas);

      const vert = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      const frag = `
        precision highp float;
        uniform float iTime;
        uniform vec2  iResolution;
        uniform vec2  rayPos;
        uniform vec2  rayDir;
        uniform vec3  raysColor;
        uniform float raysSpeed;
        uniform float lightSpread;
        uniform float rayLength;
        uniform float pulsating;
        uniform float fadeDistance;
        uniform float saturation;
        uniform vec2  mousePos;
        uniform float mouseInfluence;
        uniform float noiseAmount;
        uniform float distortion;
        uniform float flowPhase;
        uniform float flowMotion;
        varying vec2 vUv;

        float noise(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                          float seedA, float seedB, float speed) {
          vec2 sourceToCoord = coord - raySource;
          vec2 dirNorm = normalize(sourceToCoord);
          float cosAngle = dot(dirNorm, rayRefDirection);
          
          // Organic fluid wave ripples traveling along the beams as they flow across space
          float flowRipple = sin(length(sourceToCoord) * 0.0055 - flowPhase * 3.4);
          float d = distortion * (sin(iTime * 1.5 + length(sourceToCoord) * 0.005) + flowRipple * flowMotion * 0.55);
          float distortedAngle = cosAngle + d;
          
          // Gently widen the beam while moving to create a liquid volumetric stream
          float dynamicSpread = lightSpread + flowMotion * 0.28;
          float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(dynamicSpread, 0.001));
          float distance = length(sourceToCoord);
          float maxDistance = max(iResolution.x, iResolution.y) * rayLength;
          float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
          
          float fadeFactor = fadeDistance * max(iResolution.x, iResolution.y);
          float fadeFalloff = clamp((fadeFactor - distance) / fadeFactor, 0.0, 1.0);
          
          float pulse = pulsating > 0.5 ? (0.85 + 0.15 * sin(iTime * speed * 4.0)) : 1.0;
          
          float baseStrength = clamp(
            (0.5 + 0.2 * sin(distortedAngle * seedA + iTime * speed + flowPhase * 0.6)) +
            (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed * 0.8 - flowPhase * 0.45)),
            0.0, 1.0
          );
          
          return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 coord = vec2(fragCoord.x, fragCoord.y);
          
          vec2 finalRayDir = normalize(rayDir);
          if (mouseInfluence > 0.0) {
            vec2 mouseScreenPos = mousePos * iResolution.xy;
            vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
            finalRayDir = normalize(mix(finalRayDir, mouseDirection, mouseInfluence));
          }

          float r1 = rayStrength(rayPos, finalRayDir, coord, 45.2, 31.4, 0.8 * raysSpeed);
          float r2 = rayStrength(rayPos, finalRayDir, coord, 28.5, 19.8, 1.2 * raysSpeed);
          float r3 = rayStrength(rayPos, finalRayDir, coord, 12.1, 56.2, 0.5 * raysSpeed);
          
          float combined = (r1 * 0.4 + r2 * 0.4 + r3 * 0.2);
          combined = pow(combined, 0.7); // Boost mid-tones for visibility
          combined *= 1.5; // Overall intensity boost
          vec3 finalColor = raysColor * combined;
          
          if (noiseAmount > 0.0) {
            float n = noise(coord * 0.01 + iTime * 0.05);
            finalColor *= (1.0 - noiseAmount + noiseAmount * n);
          }

          if (saturation != 1.0) {
            float gray = dot(finalColor, vec3(0.299, 0.587, 0.114));
            finalColor = mix(vec3(gray), finalColor, saturation);
          }

          gl_FragColor = vec4(finalColor, combined * 0.85);
        }
      `;

      const uniforms: Uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        rayPos: { value: [0, 0] },
        rayDir: { value: [0, -1] },
        raysColor: { value: hexToRgb(raysColor) },
        raysSpeed: { value: raysSpeed },
        lightSpread: { value: lightSpread },
        rayLength: { value: rayLength },
        pulsating: { value: pulsating ? 1.0 : 0.0 },
        fadeDistance: { value: fadeDistance },
        saturation: { value: saturation },
        mousePos: { value: [0.5, 0.5] },
        mouseInfluence: { value: mouseInfluence },
        noiseAmount: { value: noiseAmount },
        distortion: { value: distortion },
        flowPhase: { value: 0 },
        flowMotion: { value: 0 }
      };
      uniformsRef.current = uniforms;

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: vert,
        fragment: frag,
        uniforms,
        transparent: true
      });
      const mesh = new Mesh(gl, { geometry, program });
      meshRef.current = mesh;

      const updatePlacement = () => {
        if (!containerRef.current || !renderer) return;
        const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
        renderer.setSize(wCSS, hCSS);
        const dpr = renderer.dpr;
        const w = wCSS * dpr;
        const h = hCSS * dpr;
        
        uniforms.iResolution.value = [w, h];
        const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);
        targetRayPosRef.current = anchor;
        currentRayPosRef.current = [anchor[0], anchor[1]];
        posVelocityRef.current = [0, 0];
        targetRayDirRef.current = dir;
        currentRayDirRef.current = [dir[0], dir[1]];
        dirVelocityRef.current = [0, 0];
        uniforms.rayPos.value = anchor;
        uniforms.rayDir.value = dir;
      };

      const loop = (t: number) => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) return;
        
        uniforms.iTime.value = t * 0.001;
        
        if (followMouse && mouseInfluence > 0.0) {
          const smoothing = 0.965;
          smoothMouseRef.current.x = smoothMouseRef.current.x * smoothing + mouseRef.current.x * (1 - smoothing);
          smoothMouseRef.current.y = smoothMouseRef.current.y * smoothing + mouseRef.current.y * (1 - smoothing);
          uniforms.mousePos.value = [smoothMouseRef.current.x, 1.0 - smoothMouseRef.current.y];
        }

        // Slower, velvety color melt for liquid holographic hue transitions
        const cur = currentColorRef.current;
        const tgt = targetColorRef.current;
        cur[0] += (tgt[0] - cur[0]) * 0.016;
        cur[1] += (tgt[1] - cur[1]) * 0.016;
        cur[2] += (tgt[2] - cur[2]) * 0.016;
        uniforms.raysColor.value = [cur[0], cur[1], cur[2]];

        // Slower, ultra-smooth fluid spring physics for majestic gliding rays
        const posStiffness = 0.009;
        const posDamping = 0.89;

        const curPos = currentRayPosRef.current;
        const tgtPos = targetRayPosRef.current;
        const pVel = posVelocityRef.current;
        pVel[0] = (pVel[0] + (tgtPos[0] - curPos[0]) * posStiffness) * posDamping;
        pVel[1] = (pVel[1] + (tgtPos[1] - curPos[1]) * posStiffness) * posDamping;
        curPos[0] += pVel[0];
        curPos[1] += pVel[1];
        uniforms.rayPos.value = [curPos[0], curPos[1]];

        // Deliberate, sweeping direction pivot for cinematic spotlight motion
        const dirStiffness = 0.007;
        const dirDamping = 0.90;

        const curDir = currentRayDirRef.current;
        const tgtDir = targetRayDirRef.current;
        const dVel = dirVelocityRef.current;
        dVel[0] = (dVel[0] + (tgtDir[0] - curDir[0]) * dirStiffness) * dirDamping;
        dVel[1] = (dVel[1] + (tgtDir[1] - curDir[1]) * dirStiffness) * dirDamping;
        curDir[0] += dVel[0];
        curDir[1] += dVel[1];
        const dLen = Math.hypot(curDir[0], curDir[1]) || 1;
        uniforms.rayDir.value = [curDir[0] / dLen, curDir[1] / dLen];

        // Gentle undulating wave flow proportional to the slower majestic pace
        const maxDim = Math.max(uniforms.iResolution.value[0], uniforms.iResolution.value[1]) || 1000;
        const motionVel = Math.hypot(pVel[0], pVel[1]) / (maxDim * 0.005);
        const targetMotion = Math.min(motionVel, 1.4);
        smoothFlowMotionRef.current += (targetMotion - smoothFlowMotionRef.current) * 0.05;
        uniforms.flowMotion.value = smoothFlowMotionRef.current;

        flowPhaseRef.current += 0.010 + smoothFlowMotionRef.current * 0.030;
        uniforms.flowPhase.value = flowPhaseRef.current;

        renderer.render({ scene: mesh });
        animationIdRef.current = requestAnimationFrame(loop);
      };

      window.addEventListener('resize', updatePlacement);
      updatePlacement();
      animationIdRef.current = requestAnimationFrame(loop);

      cleanupFunctionRef.current = () => {
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
        window.removeEventListener('resize', updatePlacement);
        if (renderer.gl.canvas.parentNode) {
          renderer.gl.canvas.parentNode.removeChild(renderer.gl.canvas);
        }
      };
    } catch (err) {
      console.warn('LightRays: WebGL unavailable or disabled, falling back to CSS background:', err);
    }
  };

  initializeWebGL();
    return () => cleanupFunctionRef.current?.();
  }, [isVisible]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
    };

    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [followMouse]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    />
  );
}

export default LightRays;
