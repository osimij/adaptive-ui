import { useRef, useEffect, useCallback } from "react";

// ── Gradient definitions ─────────────────────────────────────────────────

interface ColorStop {
  r: number;
  g: number;
  b: number;
  position: string;
}

interface GradientDef {
  prefix: string;
  stops: ColorStop[];
}

const GRADIENT_DEFS: GradientDef[] = [
  {
    // Deep Night Blue
    prefix: "linear-gradient(180deg, ",
    stops: [
      { r: 4, g: 9, b: 65, position: "11%" },
      { r: 5, g: 38, b: 100, position: "55%" },
      { r: 0, g: 60, b: 159, position: "91%" },
    ],
  },
  {
    // Dim Radial
    prefix: "radial-gradient(328.13% 100% at 50% 100%, ",
    stops: [
      { r: 252, g: 85, b: 14, position: "9%" },
      { r: 240, g: 161, b: 74, position: "24%" },
      { r: 192, g: 138, b: 115, position: "39%" },
      { r: 125, g: 106, b: 114, position: "53%" },
      { r: 63, g: 69, b: 91, position: "67%" },
      { r: 26, g: 32, b: 48, position: "80%" },
      { r: 3, g: 4, b: 6, position: "89%" },
    ],
  },
  {
    // Mid Neutral
    prefix: "linear-gradient(180deg, ",
    stops: [
      { r: 53, g: 107, b: 152, position: "23%" },
      { r: 111, g: 125, b: 155, position: "37%" },
      { r: 184, g: 145, b: 140, position: "50%" },
      { r: 214, g: 171, b: 144, position: "60%" },
      { r: 255, g: 207, b: 125, position: "72%" },
      { r: 253, g: 180, b: 90, position: "83%" },
      { r: 251, g: 140, b: 41, position: "97%" },
    ],
  },
  {
    // Sunset Band
    prefix: "linear-gradient(180deg, ",
    stops: [
      { r: 77, g: 112, b: 170, position: "9%" },
      { r: 122, g: 134, b: 177, position: "28%" },
      { r: 183, g: 147, b: 167, position: "45%" },
      { r: 228, g: 165, b: 147, position: "52%" },
      { r: 244, g: 138, b: 118, position: "65%" },
      { r: 255, g: 105, b: 78, position: "77%" },
      { r: 255, g: 126, b: 66, position: "88%" },
      { r: 251, g: 158, b: 52, position: "100%" },
    ],
  },
  {
    // Haze Day
    prefix: "linear-gradient(180deg, ",
    stops: [
      { r: 135, g: 179, b: 225, position: "20%" },
      { r: 192, g: 185, b: 208, position: "43%" },
      { r: 203, g: 185, b: 205, position: "51%" },
      { r: 207, g: 174, b: 199, position: "61%" },
      { r: 202, g: 165, b: 197, position: "69%" },
      { r: 195, g: 158, b: 196, position: "77%" },
      { r: 123, g: 158, b: 212, position: "100%" },
    ],
  },
];

const GRADIENT_COUNT = GRADIENT_DEFS.length;

// ── Critically-damped spring ─────────────────────────────────────────────
//
// Analytical solution for a critically-damped harmonic oscillator.
// Unlike EMA/lerp, this has:
//   • Continuous second derivative (no "gear shifts")
//   • Natural acceleration from rest → peak velocity → deceleration
//   • Velocity preservation when target changes mid-flight
//   • Exact mathematical convergence (no snap thresholds)
//   • Unconditional stability regardless of timestep
//
// Per-step closed form for critical damping (ζ = 1):
//   x(dt) = target + e^(-ω·dt) · [A·(1 + ω·dt) + v₀·dt]
//   v(dt) = e^(-ω·dt) · [v₀·(1 - ω·dt) - ω²·A·dt]
// where A = displacement, v₀ = current velocity, ω = natural frequency

interface Spring {
  value: number;
  velocity: number;
}

// Brightness spring frequencies — asymmetric for biological pupil response
// Pupil constriction (brightening): ~200ms protective reflex → ω = 8.5
// Pupil dilation (darkening): ~500ms slow adaptation → ω = 4.8
const BRIGHT_OMEGA = 8.5;
const DARK_OMEGA = 4.8;

// Warmth spring — color temperature adaptation is gradual, ~1s settle
const WARMTH_OMEGA = 3.8;

// Settled thresholds — spring naturally decelerates so these are tight
const BRIGHTNESS_SETTLE_DISP = 0.04; // ~0.016% of range
const BRIGHTNESS_SETTLE_VEL = 0.08;
const WARMTH_SETTLE_DISP = 0.0004;
const WARMTH_SETTLE_VEL = 0.0008;

// Timestep bounds (clamped to prevent instability from tab-switch / frame drops)
const DT_MIN = 1 / 120; // 120 fps ceiling
const DT_MAX = 1 / 20; // 20 fps floor

function stepSpring(
  spring: Spring,
  target: number,
  omega: number,
  dt: number
): boolean {
  const A = spring.value - target;
  const v0 = spring.velocity;

  const exp = Math.exp(-omega * dt);
  const omegaDt = omega * dt;

  spring.value = target + exp * (A * (1 + omegaDt) + v0 * dt);
  spring.velocity = exp * (v0 * (1 - omegaDt) - omega * omega * A * dt);

  return true; // always returns "moved" — caller checks settle
}

function isSettled(
  spring: Spring,
  target: number,
  dispThresh: number,
  velThresh: number
): boolean {
  return (
    Math.abs(spring.value - target) < dispThresh &&
    Math.abs(spring.velocity) < velThresh
  );
}

function settleSpring(spring: Spring, target: number): void {
  spring.value = target;
  spring.velocity = 0;
}

// ── OKLCh color space ────────────────────────────────────────────────────

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const s =
    c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
}

function rgbToOklab(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  );

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToRgb(
  L: number,
  a: number,
  b: number
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function rgbToOklch(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const [L, a, ob] = rgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + ob * ob);
  let h = Math.atan2(ob, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return [L, C, h];
}

function oklchToRgb(
  L: number,
  C: number,
  h: number
): [number, number, number] {
  const hRad = h * (Math.PI / 180);
  return oklabToRgb(L, C * Math.cos(hRad), C * Math.sin(hRad));
}

function blendColorsOklch(
  colors: Array<{ r: number; g: number; b: number }>,
  weights: number[]
): { r: number; g: number; b: number } {
  let totalW = 0;
  let L = 0,
    C = 0,
    hSin = 0,
    hCos = 0;

  for (let i = 0; i < colors.length; i++) {
    const w = weights[i];
    if (w < 0.001) continue;
    totalW += w;
    const [li, ci, hi] = rgbToOklch(colors[i].r, colors[i].g, colors[i].b);
    L += li * w;
    C += ci * w;
    const hRad = hi * (Math.PI / 180);
    hSin += Math.sin(hRad) * w;
    hCos += Math.cos(hRad) * w;
  }

  if (totalW < 0.001) return { r: 0, g: 0, b: 0 };

  L /= totalW;
  C /= totalW;
  let h = Math.atan2(hSin / totalW, hCos / totalW) * (180 / Math.PI);
  if (h < 0) h += 360;

  const [r, g, b] = oklchToRgb(L, C, h);
  return { r, g, b };
}

// ── Warmth color shift ──────────────────────────────────────────────────

const WARMTH_DEAD_ZONE = 0.3;
const WARM_SHIFT = { r: 12, g: 5, b: -8 };
const COOL_SHIFT = { r: -8, g: -2, b: 11 };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function applyWarmthShift(
  stop: ColorStop,
  warmth: number
): { r: number; g: number; b: number } {
  let sr = 0,
    sg = 0,
    sb = 0;
  if (warmth > WARMTH_DEAD_ZONE) {
    const t = Math.min(1, (warmth - WARMTH_DEAD_ZONE) / (1 - WARMTH_DEAD_ZONE));
    sr = WARM_SHIFT.r * t;
    sg = WARM_SHIFT.g * t;
    sb = WARM_SHIFT.b * t;
  } else if (warmth < -WARMTH_DEAD_ZONE) {
    const t = Math.min(1, (-warmth - WARMTH_DEAD_ZONE) / (1 - WARMTH_DEAD_ZONE));
    sr = COOL_SHIFT.r * t;
    sg = COOL_SHIFT.g * t;
    sb = COOL_SHIFT.b * t;
  }
  return {
    r: clamp(Math.round(stop.r + sr), 0, 255),
    g: clamp(Math.round(stop.g + sg), 0, 255),
    b: clamp(Math.round(stop.b + sb), 0, 255),
  };
}

function buildGradientCSS(def: GradientDef, warmth: number): string {
  const stopStrs = def.stops.map((stop) => {
    const { r, g, b } = applyWarmthShift(stop, warmth);
    return `rgb(${r}, ${g}, ${b}) ${stop.position}`;
  });
  return def.prefix + stopStrs.join(", ") + ")";
}

// ── Brightness → gradient weights (smoothstep) ─────────────────────────
//
// Previous: triangle/tent function with first-derivative discontinuity
// at boundaries — causes perceptible "pop" when a gradient starts/stops
// contributing.
//
// Now: Hermite smoothstep t²(3-2t) gives zero derivative at both
// endpoints. Gradients fade in and out with perfect ease.
//
// Center placement rationale (brightness → gradient):
//   0–80   Deep Night Blue  — dark room with slight ambient light
//  55–135  Dim Radial       — mid-dim, lamplight, evening
// 110–190  Mid Neutral      — mixed light, overcast daylight
// 160–240  Sunset Band      — well-lit warm room
// 200–255  Haze Day         — bright daylight, open windows

const CENTERS = [50, 105, 155, 200, 240];
const SPREAD = 55;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function getGradientWeights(brightness: number): number[] {
  const b = clamp(brightness, 0, 255);
  const raw = CENTERS.map((center) => {
    const linear = Math.max(0, 1 - Math.abs(b - center) / SPREAD);
    return smoothstep(linear);
  });
  const total = raw.reduce((a, c) => a + c, 0);
  if (total === 0) return [0, 0, 0, 0, 1];
  return raw.map((w) => w / total);
}

// ── Edge color extraction (OKLCh blended) ────────────────────────────────

function getBlendedEdgeColors(
  weights: number[],
  warmth: number
): {
  top: { r: number; g: number; b: number };
  bottom: { r: number; g: number; b: number };
} {
  const topColors: Array<{ r: number; g: number; b: number }> = [];
  const bottomColors: Array<{ r: number; g: number; b: number }> = [];
  const activeWeights: number[] = [];

  for (let i = 0; i < GRADIENT_COUNT; i++) {
    if (weights[i] < 0.001) continue;
    const def = GRADIENT_DEFS[i];
    topColors.push(applyWarmthShift(def.stops[0], warmth));
    bottomColors.push(
      applyWarmthShift(def.stops[def.stops.length - 1], warmth)
    );
    activeWeights.push(weights[i]);
  }

  return {
    top: blendColorsOklch(topColors, activeWeights),
    bottom: blendColorsOklch(bottomColors, activeWeights),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")
  );
}

// ── Meta tag helpers ─────────────────────────────────────────────────────

function getOrCreateMeta(
  name: string,
  attr: string = "name"
): HTMLMetaElement {
  let el = document.querySelector(
    `meta[${attr}="${name}"]`
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  return el;
}

// ── Correct opacity compositing ──────────────────────────────────────────
//
// Previous: each layer at its own weight (e.g. two layers at 0.5 + 0.5).
// This produces 25% bottom + 50% top + 25% transparent due to alpha-over
// compositing — a visible darkening/desaturation dip at every midpoint.
//
// Fix: the lower active layer renders at opacity 1 (fully opaque base),
// the upper active layer at its blend ratio. This gives exact linear
// interpolation: ratio·overlay + (1-ratio)·base with zero energy loss.
//
// At most 2 gradients are ever active (adjacent CENTERS are SPREAD apart),
// and their normalized weights always sum to 1.0.

function computeLayerOpacities(weights: number[]): number[] {
  const opacities = new Array(GRADIENT_COUNT).fill(0);

  // Find active layers (weight > 0.001)
  let baseIdx = -1;
  let overlayIdx = -1;

  for (let i = 0; i < GRADIENT_COUNT; i++) {
    if (weights[i] > 0.001) {
      if (baseIdx === -1) {
        baseIdx = i;
      } else {
        overlayIdx = i;
      }
    }
  }

  if (baseIdx === -1) return opacities;

  if (overlayIdx === -1) {
    // Single active gradient — full opacity
    opacities[baseIdx] = 1;
  } else {
    // Two active gradients — base at 1.0, overlay at its normalized weight
    opacities[baseIdx] = 1;
    opacities[overlayIdx] = weights[overlayIdx];
  }

  return opacities;
}

// ── Component ────────────────────────────────────────────────────────────

interface AdaptiveBackgroundProps {
  targetBrightness: number;
  targetWarmth: number;
  onGradientPainted?: () => void;
}

export function AdaptiveBackground({
  targetBrightness,
  targetWarmth,
  onGradientPainted,
}: AdaptiveBackgroundProps) {
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastPaintedOpacitiesRef = useRef<number[]>(
    new Array(GRADIENT_COUNT).fill(-1)
  );
  const lastPaintedWarmthRef = useRef<number>(NaN);
  const lastThemeColorRef = useRef("");
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Spring state
  const brightSpring = useRef<Spring>({ value: targetBrightness, velocity: 0 });
  const warmthSpring = useRef<Spring>({ value: targetWarmth, velocity: 0 });

  // Targets (updated via useEffect to avoid stale closures)
  const targetBrightnessRef = useRef(targetBrightness);
  const targetWarmthRef = useRef(targetWarmth);

  // Callback management
  const paintedCallbackFired = useRef(false);
  const hasInitialPaintRef = useRef(false);
  const onGradientPaintedRef = useRef(onGradientPainted);

  useEffect(() => {
    onGradientPaintedRef.current = onGradientPainted;
    if (
      onGradientPainted &&
      hasInitialPaintRef.current &&
      !paintedCallbackFired.current
    ) {
      paintedCallbackFired.current = true;
      onGradientPainted();
    }
  }, [onGradientPainted]);

  useEffect(() => {
    targetBrightnessRef.current = targetBrightness;
  }, [targetBrightness]);

  useEffect(() => {
    targetWarmthRef.current = targetWarmth;
  }, [targetWarmth]);

  const updateEdgeColors = useCallback(
    (weights: number[], warmth: number) => {
      const { top, bottom } = getBlendedEdgeColors(weights, warmth);
      const topHex = rgbToHex(top.r, top.g, top.b);
      const bottomHex = rgbToHex(bottom.r, bottom.g, bottom.b);
      document.documentElement.style.backgroundColor = topHex;
      document.body.style.backgroundColor = bottomHex;

      if (topHex !== lastThemeColorRef.current) {
        lastThemeColorRef.current = topHex;
        getOrCreateMeta("theme-color").setAttribute("content", topHex);
      }
    },
    []
  );

  const tick = useCallback(
    (now: number) => {
      // ── Timestep ──
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const dt = clamp(rawDt, DT_MIN, DT_MAX);

      const tB = targetBrightnessRef.current;
      const tW = targetWarmthRef.current;
      const bs = brightSpring.current;
      const ws = warmthSpring.current;

      // ── Step brightness spring (asymmetric pupil response) ──
      const bSettled = isSettled(
        bs,
        tB,
        BRIGHTNESS_SETTLE_DISP,
        BRIGHTNESS_SETTLE_VEL
      );
      if (!bSettled) {
        // Brightening: fast constriction. Darkening: slow dilation.
        const omega = tB > bs.value ? BRIGHT_OMEGA : DARK_OMEGA;
        stepSpring(bs, tB, omega, dt);
      } else {
        settleSpring(bs, tB);
      }

      // ── Step warmth spring ──
      const wSettled = isSettled(
        ws,
        tW,
        WARMTH_SETTLE_DISP,
        WARMTH_SETTLE_VEL
      );
      if (!wSettled) {
        stepSpring(ws, tW, WARMTH_OMEGA, dt);
      } else {
        settleSpring(ws, tW);
      }

      // ── CSS custom properties (every frame when active) ──
      const root = document.documentElement;
      root.style.setProperty(
        "--ambient-brightness",
        String(Math.round(bs.value))
      );
      root.style.setProperty("--ambient-warmth", ws.value.toFixed(3));

      // ── Paint if either spring is still moving ──
      if (!bSettled || !wSettled) {
        const weights = getGradientWeights(bs.value);
        const opacities = computeLayerOpacities(weights);
        const lastOpacities = lastPaintedOpacitiesRef.current;

        const warmthDirty =
          Number.isNaN(lastPaintedWarmthRef.current) ||
          Math.abs(ws.value - lastPaintedWarmthRef.current) > 0.003;

        let anyPaint = false;

        for (let i = 0; i < GRADIENT_COUNT; i++) {
          const el = layerRefs.current[i];
          if (!el) continue;

          const opDiff = Math.abs(opacities[i] - lastOpacities[i]) > 0.0005;
          const needsGradientUpdate =
            warmthDirty && opacities[i] > 0.001;

          if (opDiff || needsGradientUpdate) {
            anyPaint = true;
            if (opDiff) {
              el.style.opacity = String(opacities[i]);
              lastOpacities[i] = opacities[i];
            }
            if (needsGradientUpdate) {
              el.style.backgroundImage = buildGradientCSS(
                GRADIENT_DEFS[i],
                ws.value
              );
            }
          }
        }

        if (anyPaint) {
          if (warmthDirty) lastPaintedWarmthRef.current = ws.value;
          updateEdgeColors(weights, ws.value);
        }

        if (
          !paintedCallbackFired.current &&
          anyPaint &&
          onGradientPaintedRef.current
        ) {
          paintedCallbackFired.current = true;
          onGradientPaintedRef.current();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [updateEdgeColors]
  );

  // ── Initialize and start rAF loop ──
  useEffect(() => {
    const weights = getGradientWeights(brightSpring.current.value);
    const opacities = computeLayerOpacities(weights);
    const w = warmthSpring.current.value;

    for (let i = 0; i < GRADIENT_COUNT; i++) {
      const el = layerRefs.current[i];
      if (el) {
        el.style.opacity = String(opacities[i]);
        el.style.backgroundImage = buildGradientCSS(GRADIENT_DEFS[i], w);
      }
      lastPaintedOpacitiesRef.current[i] = opacities[i];
    }
    lastPaintedWarmthRef.current = w;
    updateEdgeColors(weights, w);
    hasInitialPaintRef.current = true;

    if (onGradientPaintedRef.current && !paintedCallbackFired.current) {
      paintedCallbackFired.current = true;
      onGradientPaintedRef.current();
    }

    const root = document.documentElement;
    root.style.setProperty(
      "--ambient-brightness",
      String(Math.round(brightSpring.current.value))
    );
    root.style.setProperty(
      "--ambient-warmth",
      warmthSpring.current.value.toFixed(3)
    );

    lastTimeRef.current = 0; // reset so first tick computes correct dt
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, updateEdgeColors]);

  return (
    <>
      {GRADIENT_DEFS.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            layerRefs.current[i] = el;
          }}
          style={{
            position: "fixed",
            // Extend 2px past viewport on all sides to prevent iOS sub-pixel
            // hairline gaps at safe-area boundaries and home indicator edge
            top: "-2px",
            right: "-2px",
            bottom: "-2px",
            left: "-2px",
            opacity: 0,
            zIndex: i,
            willChange: "opacity",
          }}
        />
      ))}
    </>
  );
}