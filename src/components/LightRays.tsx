import { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';

/**
 * LightRays Background Component
 * 
 * A high-performance WebGL-based light ray effect that simulates atmospheric lighting.
 * Supports various origins, mouse following, and organic movement using OGL.
 * Gracefully falls back to pure CSS radial gradients if WebGL is unavailable or fails.
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
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
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
  }, [
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

        // Check WebGL context support safely before instantiating OGL
        const testCanvas = document.createElement('canvas');
        const testGl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (!testGl) {
          console.warn('LightRays: WebGL is not supported on this device/browser. Falling back to CSS glow.');
          setWebglSupported(false);
          return;
        }

        const renderer = new Renderer({
          dpr: Math.min(window.devicePixelRatio || 1, 2),
          alpha: true
        });

        if (!renderer || !renderer.gl) {
          console.warn('LightRays: Renderer WebGL initialization returned null context.');
          setWebglSupported(false);
          return;
        }

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

          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            vec2 shift = vec2(100.0);
            for (int i = 0; i < 3; ++i) {
              v += a * noise(p);
              p = p * 2.0 + shift;
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec2 coord = vUv * iResolution;
            vec2 origin = rayPos * iResolution;
            vec2 toFrag = coord - origin;
            float dist = length(toFrag);

            vec2 dir = normalize(rayDir);
            vec2 fragDir = dist > 0.0001 ? normalize(toFrag) : dir;

            float dotVal = dot(fragDir, dir);
            float angle = acos(clamp(dotVal, -1.0, 1.0));

            float time = iTime * raysSpeed * 0.4 + flowPhase * 0.2;

            float distNorm = dist / max(iResolution.x, iResolution.y);
            float waveDisplacement = sin(angle * 7.0 - time * 1.8 + distNorm * 4.0) * (0.04 + flowMotion * 0.05);
            float angleMod = angle + waveDisplacement;

            float spread = max(lightSpread, 0.001);
            float beam = exp(-pow(angleMod / spread, 2.0));

            // Slower, majestic light rays
            float rayNoise = sin(angleMod * 16.0 + time * 1.1) * 0.35
                           + sin(angleMod * 32.0 - time * 0.7) * 0.25
                           + sin(angleMod * 64.0 + time * 1.5) * 0.15;
            beam += rayNoise * beam * 0.6;

            float maxDim = max(iResolution.x, iResolution.y);
            float maxDist = maxDim * max(rayLength, 0.1);
            float falloff = clamp(1.0 - dist / maxDist, 0.0, 1.0);
            falloff = pow(falloff, max(fadeDistance, 0.1));

            float pulse = 1.0;
            if (pulsating > 0.5) {
              pulse = 0.88 + 0.12 * sin(time * 1.6);
            }

            float intensity = beam * falloff * pulse;

            if (noiseAmount > 0.0) {
              float n = fbm(coord * 0.004 + vec2(0.0, time * 0.2));
              intensity += (n - 0.5) * noiseAmount * falloff;
            }

            intensity = clamp(intensity, 0.0, 1.0);

            vec3 col = raysColor * intensity;
            float luminance = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(vec3(luminance), col, saturation);

            float alpha = clamp(intensity * 1.35, 0.0, 0.95);
            gl_FragColor = vec4(col, alpha);
          }
        `;

        const uniforms: Uniforms = {
          iTime: { value: 0 },
          iResolution: { value: [gl.canvas.width || 800, gl.canvas.height || 600] },
          rayPos: { value: [0.5, 0.0] },
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
          uniforms: uniforms as any,
          transparent: true,
          depthTest: false,
          depthWrite: false
        });

        const mesh = new Mesh(gl, { geometry, program });

        const updatePlacement = () => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const w = rect.width || window.innerWidth || 800;
          const h = rect.height || window.innerHeight || 600;

          renderer.setSize(w, h);
          uniforms.iResolution.value = [w, h];

          let targetX = 0.5;
          let targetY = 0.0;
          let targetDirX = 0.0;
          let targetDirY = -1.0;

          switch (raysOrigin) {
            case 'top-left':
              targetX = 0.0;
              targetY = 0.0;
              targetDirX = 1.0;
              targetDirY = -1.0;
              break;
            case 'top-right':
              targetX = 1.0;
              targetY = 0.0;
              targetDirX = -1.0;
              targetDirY = -1.0;
              break;
            case 'top-center':
              targetX = 0.5;
              targetY = 0.0;
              targetDirX = 0.0;
              targetDirY = -1.0;
              break;
            case 'left':
              targetX = 0.0;
              targetY = 0.5;
              targetDirX = 1.0;
              targetDirY = 0.0;
              break;
            case 'right':
              targetX = 1.0;
              targetY = 0.5;
              targetDirX = -1.0;
              targetDirY = 0.0;
              break;
            case 'bottom-left':
              targetX = 0.0;
              targetY = 1.0;
              targetDirX = 1.0;
              targetDirY = 1.0;
              break;
            case 'bottom-right':
              targetX = 1.0;
              targetY = 1.0;
              targetDirX = -1.0;
              targetDirY = 1.0;
              break;
            case 'bottom-center':
              targetX = 0.5;
              targetY = 1.0;
              targetDirX = 0.0;
              targetDirY = 1.0;
              break;
            default:
              targetX = 0.5;
              targetY = 0.0;
              targetDirX = 0.0;
              targetDirY = -1.0;
          }

          const dirLen = Math.hypot(targetDirX, targetDirY) || 1;
          targetRayPosRef.current = [targetX, targetY];
          targetRayDirRef.current = [targetDirX / dirLen, targetDirY / dirLen];

          if (currentRayPosRef.current[0] === 0 && currentRayPosRef.current[1] === 0) {
            currentRayPosRef.current = [targetX, targetY];
            currentRayDirRef.current = [targetDirX / dirLen, targetDirY / dirLen];
            uniforms.rayPos.value = [targetX, targetY];
            uniforms.rayDir.value = [targetDirX / dirLen, targetDirY / dirLen];
          }
        };

        let lastTime = performance.now();

        const loop = (now: number) => {
          try {
            const dt = Math.min((now - lastTime) / 1000, 0.1);
            lastTime = now;

            uniforms.iTime.value = now * 0.001;

            // Smooth cursor interpolation
            const mouseEase = 0.04;
            smoothMouseRef.current.x += (mouseRef.current.x - smoothMouseRef.current.x) * mouseEase;
            smoothMouseRef.current.y += (mouseRef.current.y - smoothMouseRef.current.y) * mouseEase;
            uniforms.mousePos.value = [smoothMouseRef.current.x, smoothMouseRef.current.y];

            // Smooth color transition
            const colorEase = 0.04;
            const curCol = currentColorRef.current;
            const tgtCol = targetColorRef.current;
            curCol[0] += (tgtCol[0] - curCol[0]) * colorEase;
            curCol[1] += (tgtCol[1] - curCol[1]) * colorEase;
            curCol[2] += (tgtCol[2] - curCol[2]) * colorEase;
            uniforms.raysColor.value = [curCol[0], curCol[1], curCol[2]];

            // Fluid spring physics simulation
            const posStiffness = 0.045;
            const posDamping = 0.82;
            const curPos = currentRayPosRef.current;
            const tgtPos = targetRayPosRef.current;
            const pVel = posVelocityRef.current;

            pVel[0] = (pVel[0] + (tgtPos[0] - curPos[0]) * posStiffness) * posDamping;
            pVel[1] = (pVel[1] + (tgtPos[1] - curPos[1]) * posStiffness) * posDamping;
            curPos[0] += pVel[0];
            curPos[1] += pVel[1];
            uniforms.rayPos.value = [curPos[0], curPos[1]];

            const dirStiffness = 0.04;
            const dirDamping = 0.84;
            const curDir = currentRayDirRef.current;
            const tgtDir = targetRayDirRef.current;
            const dVel = dirVelocityRef.current;
            dVel[0] = (dVel[0] + (tgtDir[0] - curDir[0]) * dirStiffness) * dirDamping;
            dVel[1] = (dVel[1] + (tgtDir[1] - curDir[1]) * dirStiffness) * dirDamping;
            curDir[0] += dVel[0];
            curDir[1] += dVel[1];
            const dLen = Math.hypot(curDir[0], curDir[1]) || 1;
            uniforms.rayDir.value = [curDir[0] / dLen, curDir[1] / dLen];

            // Undulating wave flow
            const maxDim = Math.max(uniforms.iResolution.value[0], uniforms.iResolution.value[1]) || 1000;
            const motionVel = Math.hypot(pVel[0], pVel[1]) / (maxDim * 0.005);
            const targetMotion = Math.min(motionVel, 1.4);
            smoothFlowMotionRef.current += (targetMotion - smoothFlowMotionRef.current) * 0.05;
            uniforms.flowMotion.value = smoothFlowMotionRef.current;

            flowPhaseRef.current += 0.010 + smoothFlowMotionRef.current * 0.030;
            uniforms.flowPhase.value = flowPhaseRef.current;

            renderer.render({ scene: mesh });
            animationIdRef.current = requestAnimationFrame(loop);
          } catch {
            // Cancel animation on any context loss or runtime failure
            setWebglSupported(false);
          }
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
        setWebglSupported(false);
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

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
      style={
        !webglSupported
          ? {
              background: `radial-gradient(circle at 50% 0%, ${raysColor}22 0%, transparent 70%)`
            }
          : undefined
      }
    />
  );
}

export default LightRays;
