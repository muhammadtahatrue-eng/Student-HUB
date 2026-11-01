import { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';

/**
 * LightRays Background Component
 * 
 * High-performance WebGL-based atmospheric flare and draped curtain god-rays.
 * Simulates flowing aurora borealis / silky light curtains emanating from dynamic origins
 * (top-center, top-left, top-right, bottom, etc.) across the viewport.
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
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  brightness?: number;
  scrollBlur?: number;
  className?: string;
}

const DEFAULT_COLOR = '#9ca3af';

const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return [
      parseInt(cleanHex[0] + cleanHex[0], 16) / 255,
      parseInt(cleanHex[1] + cleanHex[1], 16) / 255,
      parseInt(cleanHex[2] + cleanHex[2], 16) / 255
    ];
  }
  return [
    parseInt(cleanHex.slice(0, 2), 16) / 255,
    parseInt(cleanHex.slice(2, 4), 16) / 255,
    parseInt(cleanHex.slice(4, 6), 16) / 255
  ];
};

type Vec2 = [number, number];

interface Uniforms {
  iTime: { value: number };
  iResolution: { value: Vec2 };
  rayPos: { value: Vec2 };
  rayDir: { value: Vec2 };
  raysColor: { value: [number, number, number] };
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
  brightness: { value: number };
}

/**
 * Calculates anchor position and main orientation vector
 * WebGL coordinate system: (0, 0) is bottom-left, (w, h) is top-right.
 */
const getAnchorAndDir = (origin: RaysOrigin, width: number, height: number): { anchor: Vec2; dir: Vec2 } => {
  switch (origin) {
    case 'top-left':
      return { anchor: [0.12 * width, 1.05 * height], dir: [0.707, -0.707] };
    case 'top-right':
      return { anchor: [0.88 * width, 1.05 * height], dir: [-0.707, -0.707] };
    case 'left':
      return { anchor: [-0.05 * width, 0.50 * height], dir: [1.0, 0.0] };
    case 'right':
      return { anchor: [1.05 * width, 0.50 * height], dir: [-1.0, 0.0] };
    case 'bottom-left':
      return { anchor: [0.12 * width, -0.05 * height], dir: [0.707, 0.707] };
    case 'bottom-center':
      return { anchor: [0.50 * width, -0.05 * height], dir: [0.0, 1.0] };
    case 'bottom-right':
      return { anchor: [0.88 * width, -0.05 * height], dir: [-0.707, 0.707] };
    default: // 'top-center'
      return { anchor: [0.50 * width, 1.05 * height], dir: [0.0, -1.0] };
  }
};

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
  brightness = 1.0,
  scrollBlur = 0,
  className = ''
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Uniforms | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationIdRef = useRef<number | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const targetColorRef = useRef<[number, number, number]>(hexToRgb(raysColor));
  const currentColorRef = useRef<[number, number, number]>(hexToRgb(raysColor));

  // Fluid spring physics simulation state for place changing
  const targetRayPosRef = useRef<Vec2>([0, 0]);
  const currentRayPosRef = useRef<Vec2>([0, 0]);
  const posVelocityRef = useRef<Vec2>([0, 0]);

  const targetRayDirRef = useRef<Vec2>([0, -1]);
  const currentRayDirRef = useRef<Vec2>([0, -1]);
  const dirVelocityRef = useRef<Vec2>([0, 0]);

  // Dynamic uniform updates without context re-creation
  useEffect(() => {
    targetColorRef.current = hexToRgb(raysColor);
    if (uniformsRef.current) {
      uniformsRef.current.raysSpeed.value = raysSpeed;
      uniformsRef.current.lightSpread.value = lightSpread;
      uniformsRef.current.rayLength.value = rayLength;
      uniformsRef.current.pulsating.value = pulsating ? 1.0 : 0.0;
      uniformsRef.current.fadeDistance.value = fadeDistance;
      uniformsRef.current.saturation.value = saturation;
      uniformsRef.current.mouseInfluence.value = mouseInfluence;
      uniformsRef.current.noiseAmount.value = noiseAmount;
      uniformsRef.current.distortion.value = distortion;
      uniformsRef.current.brightness.value = brightness;

      if (rendererRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const dpr = rendererRef.current.dpr;
        const { anchor, dir } = getAnchorAndDir(raysOrigin, clientWidth * dpr, clientHeight * dpr);
        targetRayPosRef.current = anchor;
        targetRayDirRef.current = dir;
      }
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
    distortion,
    brightness
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      if (typeof IntersectionObserver !== 'undefined') {
        observerRef.current = new IntersectionObserver(
          entries => {
            const entry = entries[0];
            setIsVisible(entry ? entry.isIntersecting : true);
          },
          { threshold: 0.05 }
        );
        observerRef.current.observe(containerRef.current);
      } else {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }

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
          dpr: Math.min(window.devicePixelRatio || 1, 2),
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
          uniform float brightness;

          varying vec2 vUv;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
              u.y
            );
          }

          void main() {
            vec2 coord = gl_FragCoord.xy;
            vec2 toFrag = coord - rayPos;
            float dist = length(toFrag);
            float maxDim = max(iResolution.x, iResolution.y);

            // Direction from ray source
            vec2 dir = dist > 0.001 ? normalize(toFrag) : vec2(0.0, -1.0);
            vec2 mainDir = normalize(rayDir);

            // Broad forward hemisphere dispersion (fans outward across the screen)
            float dotDir = dot(dir, mainDir);
            float forwardSpread = clamp((dotDir + 0.35) / 1.35, 0.0, 1.0);
            forwardSpread = pow(forwardSpread, 0.55);

            // Angle of rays
            float angle = atan(toFrag.y, toFrag.x);

            // Slow majestic billowing curtain displacement
            float time = iTime * raysSpeed * 0.40;
            float foldWave = sin(dist * 0.0035 - time * 1.8) * (0.08 + distortion * 0.12)
                           + sin(dist * 0.008 + time * 1.2) * 0.04;
            float modAngle = angle + foldWave;

            // Multi-frequency harmonic rays creating rich draped curtain folds
            float rayA = sin(modAngle * 7.0 + time * 0.70);
            float rayB = sin(modAngle * 13.0 - time * 0.50);
            float rayC = cos(modAngle * 23.0 + time * 1.10);
            float rayD = sin(modAngle * 4.0 + time * 0.30);
            float rayE = cos(modAngle * 37.0 - time * 0.85);

            float rayMix = 0.35 * rayA + 0.28 * rayB + 0.22 * rayC + 0.35 * rayD + 0.14 * rayE;
            float raysNormalized = clamp(0.5 + 0.5 * rayMix, 0.0, 1.0);

            // Spread factor shapes fold clarity and fullness
            float spreadExp = 1.0 / max(lightSpread * 0.85, 0.15);
            float curtainBeams = pow(raysNormalized, spreadExp * 1.4);

            // Distance falloff from origin
            float maxDistance = maxDim * max(rayLength, 0.85);
            float distNorm = clamp(dist / maxDistance, 0.0, 1.0);
            float falloff = pow(1.0 - distNorm, max(fadeDistance, 0.28));

            // Origin hotspot glow & broad atmospheric radiance
            float coreGlow = exp(-dist / (maxDim * 0.18)) * 1.45;
            float atmosphericHalo = exp(-dist / (maxDim * 0.55)) * 0.70;

            // Pulsating modulation
            float pulse = pulsating > 0.5 ? (0.88 + 0.12 * sin(iTime * raysSpeed * 2.2)) : 1.0;

            // Combined volumetric radiance
            float rayIntensity = curtainBeams * forwardSpread * falloff * 1.65;
            float totalIntensity = (rayIntensity + coreGlow * forwardSpread + atmosphericHalo * forwardSpread) * pulse;

            // Dynamic mouse influence: attracts rays toward cursor
            if (mouseInfluence > 0.0) {
              vec2 mouseScreen = mousePos * iResolution;
              float mouseDist = length(coord - mouseScreen);
              float mouseGlow = exp(-mouseDist / (maxDim * 0.32)) * mouseInfluence * 0.45;
              totalIntensity += mouseGlow;
            }

            // Atmospheric dust grain
            if (noiseAmount > 0.0) {
              float n = noise(coord * 0.012 + vec2(0.0, time * 0.04));
              totalIntensity *= (1.0 - noiseAmount * 0.5 + noiseAmount * n);
            }

            // Rich mid-tone boost for vibrant visual presence scaled by brightness setting
            totalIntensity = pow(totalIntensity, 0.85) * 1.25 * max(brightness, 0.0);

            // Color tinting
            vec3 col = raysColor * totalIntensity;
            if (saturation != 1.0) {
              float gray = dot(col, vec3(0.299, 0.587, 0.114));
              col = mix(vec3(gray), col, saturation);
            }

            // Soft atmospheric alpha blending
            float alpha = clamp(totalIntensity * 0.90, 0.0, 0.96);
            gl_FragColor = vec4(col, alpha);
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
          brightness: { value: brightness }
        };

        uniformsRef.current = uniforms;

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
          vertex: vert,
          fragment: frag,
          uniforms: uniforms as any,
          transparent: true
        });

        const mesh = new Mesh(gl, { geometry, program });

        const updatePlacement = () => {
          if (!containerRef.current || !renderer) return;
          const { clientWidth, clientHeight } = containerRef.current;
          renderer.setSize(clientWidth, clientHeight);
          const dpr = renderer.dpr;
          const w = clientWidth * dpr;
          const h = clientHeight * dpr;
          uniforms.iResolution.value = [w, h];

          const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);
          targetRayPosRef.current = anchor;
          targetRayDirRef.current = dir;

          if (currentRayPosRef.current[0] === 0 && currentRayPosRef.current[1] === 0) {
            currentRayPosRef.current = [anchor[0], anchor[1]];
            currentRayDirRef.current = [dir[0], dir[1]];
            posVelocityRef.current = [0, 0];
            dirVelocityRef.current = [0, 0];
            uniforms.rayPos.value = anchor;
            uniforms.rayDir.value = dir;
          }
        };

        const loop = (now: number) => {
          if (!containerRef.current || !uniformsRef.current || !rendererRef.current) return;
          uniforms.iTime.value = now * 0.001;

          if (followMouse && mouseInfluence > 0) {
            const ease = 0.05;
            smoothMouseRef.current.x += (mouseRef.current.x - smoothMouseRef.current.x) * ease;
            smoothMouseRef.current.y += (mouseRef.current.y - smoothMouseRef.current.y) * ease;
            uniforms.mousePos.value = [smoothMouseRef.current.x, 1.0 - smoothMouseRef.current.y];
          }

          // Smooth color transitions
          const curCol = currentColorRef.current;
          const tgtCol = targetColorRef.current;
          curCol[0] += (tgtCol[0] - curCol[0]) * 0.035;
          curCol[1] += (tgtCol[1] - curCol[1]) * 0.035;
          curCol[2] += (tgtCol[2] - curCol[2]) * 0.035;
          uniforms.raysColor.value = [curCol[0], curCol[1], curCol[2]];

          // Spring physics for position gliding
          const stiffness = 0.040;
          const damping = 0.86;
          const curPos = currentRayPosRef.current;
          const tgtPos = targetRayPosRef.current;
          const pVel = posVelocityRef.current;
          pVel[0] = (pVel[0] + (tgtPos[0] - curPos[0]) * stiffness) * damping;
          pVel[1] = (pVel[1] + (tgtPos[1] - curPos[1]) * stiffness) * damping;
          curPos[0] += pVel[0];
          curPos[1] += pVel[1];
          uniforms.rayPos.value = [curPos[0], curPos[1]];

          // Spring physics for direction steering
          const curDir = currentRayDirRef.current;
          const tgtDir = targetRayDirRef.current;
          const dVel = dirVelocityRef.current;
          dVel[0] = (dVel[0] + (tgtDir[0] - curDir[0]) * stiffness) * damping;
          dVel[1] = (dVel[1] + (tgtDir[1] - curDir[1]) * stiffness) * damping;
          curDir[0] += dVel[0];
          curDir[1] += dVel[1];
          const dLen = Math.hypot(curDir[0], curDir[1]) || 1;
          uniforms.rayDir.value = [curDir[0] / dLen, curDir[1] / dLen];

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
        x: (e.clientX - rect.left) / (rect.width || 1),
        y: (e.clientY - rect.top) / (rect.height || 1)
      };
    };

    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [followMouse]);

  const clampedBlur = Math.max(0, scrollBlur);
  const blurProgress = Math.min(1, clampedBlur / 28);

  return (
    <div
      className={`fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      <div
        ref={containerRef}
        className="w-full h-full will-change-[filter,transform]"
        style={{
          filter: `blur(${clampedBlur.toFixed(2)}px)`,
          transform: `scale(${(1 + blurProgress * 0.06).toFixed(4)})`,
          transition:
            'filter 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />
      <div
        className="absolute inset-0 bg-[#050505] pointer-events-none will-change-[opacity]"
        style={{
          opacity: Number((blurProgress * 0.44).toFixed(4)),
          transition: 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />
    </div>
  );
}

export default LightRays;
