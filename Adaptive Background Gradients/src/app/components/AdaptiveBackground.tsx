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

// ── Warmth color shift ──────────────────────────────────────────────────

const WARMTH_DEAD_ZONE = 0.3;
const WARM_SHIFT = { r: 12, g: 5, b: -8 };
const COOL_SHIFT = { r: -8, g: -2, b: 11 };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function applyWarmthShift(
  color: { r: number; g: number; b: number },
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
    r: clamp(Math.round(color.r + sr), 0, 255),
    g: clamp(Math.round(color.g + sg), 0, 255),
    b: clamp(Math.round(color.b + sb), 0, 255),
  };
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
//   0–140  Deep Night Blue  — dark / dim room, lamplight, evening
//  60–240  Sunset Band      — mixed light, well-lit warm room
// 150–255  Haze Day         — bright daylight, open windows

const CENTERS = [50, 150, 240];
const SPREAD = 90;

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
  if (total === 0) return [0, 0, 1];
  return raw.map((w) => w / total);
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")
  );
}

// ── Composite gradient builder (perceptual cross-blend) ──────────────────
//
// Previous: N overlapping layers with alpha compositing in sRGB. At mid-
// crossfade (e.g. Deep Night Blue → Sunset Band) the result was muddy —
// sRGB alpha blending darkens & desaturates the perceptual midpoint.
//
// Now: resample every source gradient at a shared grid of vertical
// positions, blend those samples in OKLCh using the smoothstep weights,
// and emit ONE composite linear-gradient. Result: perceptually uniform
// transitions, no alpha-compositing energy loss, single paint per frame.

const SAMPLE_COUNT = 21; // every 5% of the gradient height
const SAMPLE_POSITIONS: number[] = Array.from(
  { length: SAMPLE_COUNT },
  (_, i) => i / (SAMPLE_COUNT - 1)
);

function parsePosition(s: string): number {
  return parseFloat(s) / 100;
}

// Linear-in-sRGB sample between authored stops — matches how CSS itself
// interpolates within a single gradient, preserving each source's look.
function sampleStopRGB(
  stops: Array<{ r: number; g: number; b: number; pos: number }>,
  p: number
): { r: number; g: number; b: number } {
  if (p <= stops[0].pos) {
    return { r: stops[0].r, g: stops[0].g, b: stops[0].b };
  }
  const last = stops[stops.length - 1];
  if (p >= last.pos) {
    return { r: last.r, g: last.g, b: last.b };
  }
  for (let i = 1; i < stops.length; i++) {
    const hi = stops[i];
    if (p <= hi.pos) {
      const lo = stops[i - 1];
      const t = (p - lo.pos) / (hi.pos - lo.pos);
      return {
        r: lo.r + (hi.r - lo.r) * t,
        g: lo.g + (hi.g - lo.g) * t,
        b: lo.b + (hi.b - lo.b) * t,
      };
    }
  }
  return { r: last.r, g: last.g, b: last.b };
}

// Precompute OKLCh samples once per gradient — warmth & weights vary per
// frame, but these are fixed. ~63 cbrt/atan2 calls at module load.
const GRADIENT_OKLCH_SAMPLES: Array<Array<[number, number, number]>> =
  GRADIENT_DEFS.map((def) => {
    const parsed = def.stops.map((s) => ({
      r: s.r,
      g: s.g,
      b: s.b,
      pos: parsePosition(s.position),
    }));
    return SAMPLE_POSITIONS.map((p) => {
      const { r, g, b } = sampleStopRGB(parsed, p);
      return rgbToOklch(r, g, b);
    });
  });

function buildCompositeGradient(
  weights: number[],
  warmth: number
): {
  css: string;
  top: { r: number; g: number; b: number };
  bottom: { r: number; g: number; b: number };
} {
  const activeIdx: number[] = [];
  const activeWeights: number[] = [];
  for (let i = 0; i < GRADIENT_COUNT; i++) {
    if (weights[i] > 0.001) {
      activeIdx.push(i);
      activeWeights.push(weights[i]);
    }
  }
  if (activeIdx.length === 0) {
    activeIdx.push(GRADIENT_COUNT - 1);
    activeWeights.push(1);
  }

  const stopStrs: string[] = new Array(SAMPLE_COUNT);
  let topRGB = { r: 0, g: 0, b: 0 };
  let bottomRGB = { r: 0, g: 0, b: 0 };

  for (let posIdx = 0; posIdx < SAMPLE_COUNT; posIdx++) {
    let totalW = 0;
    let L = 0,
      C = 0,
      hSin = 0,
      hCos = 0;

    for (let k = 0; k < activeIdx.length; k++) {
      const w = activeWeights[k];
      const [li, ci, hi] = GRADIENT_OKLCH_SAMPLES[activeIdx[k]][posIdx];
      L += li * w;
      C += ci * w;
      const hRad = hi * (Math.PI / 180);
      hSin += Math.sin(hRad) * w;
      hCos += Math.cos(hRad) * w;
      totalW += w;
    }

    L /= totalW;
    C /= totalW;
    let h = Math.atan2(hSin / totalW, hCos / totalW) * (180 / Math.PI);
    if (h < 0) h += 360;

    const [r, g, b] = oklchToRgb(L, C, h);
    const warmed = applyWarmthShift({ r, g, b }, warmth);
    stopStrs[posIdx] = `rgb(${warmed.r}, ${warmed.g}, ${warmed.b}) ${(
      SAMPLE_POSITIONS[posIdx] * 100
    ).toFixed(1)}%`;

    if (posIdx === 0) topRGB = warmed;
    if (posIdx === SAMPLE_COUNT - 1) bottomRGB = warmed;
  }

  return {
    css: `linear-gradient(180deg, ${stopStrs.join(", ")})`,
    top: topRGB,
    bottom: bottomRGB,
  };
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
  const layerRef = useRef<HTMLDivElement | null>(null);
  const lastPaintedWeightsRef = useRef<number[]>(
    new Array(GRADIENT_COUNT).fill(-1)
  );
  const lastPaintedWarmthRef = useRef<number>(NaN);
  const lastThemeColorRef = useRef("");
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const brightSpring = useRef<Spring>({ value: targetBrightness, velocity: 0 });
  const warmthSpring = useRef<Spring>({ value: targetWarmth, velocity: 0 });

  const targetBrightnessRef = useRef(targetBrightness);
  const targetWarmthRef = useRef(targetWarmth);

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

  const applyEdgeColors = useCallback(
    (top: { r: number; g: number; b: number }, bottom: { r: number; g: number; b: number }) => {
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

  const paintComposite = useCallback(
    (weights: number[], warmth: number) => {
      const el = layerRef.current;
      if (!el) return;
      const { css, top, bottom } = buildCompositeGradient(weights, warmth);
      el.style.backgroundImage = css;
      applyEdgeColors(top, bottom);
      for (let i = 0; i < GRADIENT_COUNT; i++) {
        lastPaintedWeightsRef.current[i] = weights[i];
      }
      lastPaintedWarmthRef.current = warmth;
    },
    [applyEdgeColors]
  );

  const tick = useCallback(
    (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const dt = clamp(rawDt, DT_MIN, DT_MAX);

      const tB = targetBrightnessRef.current;
      const tW = targetWarmthRef.current;
      const bs = brightSpring.current;
      const ws = warmthSpring.current;

      const bSettled = isSettled(
        bs,
        tB,
        BRIGHTNESS_SETTLE_DISP,
        BRIGHTNESS_SETTLE_VEL
      );
      if (!bSettled) {
        const omega = tB > bs.value ? BRIGHT_OMEGA : DARK_OMEGA;
        stepSpring(bs, tB, omega, dt);
      } else {
        settleSpring(bs, tB);
      }

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

      const root = document.documentElement;
      root.style.setProperty(
        "--ambient-brightness",
        String(Math.round(bs.value))
      );
      root.style.setProperty("--ambient-warmth", ws.value.toFixed(3));

      if (!bSettled || !wSettled) {
        const weights = getGradientWeights(bs.value);
        const lastWeights = lastPaintedWeightsRef.current;

        let weightsDirty = false;
        for (let i = 0; i < GRADIENT_COUNT; i++) {
          if (Math.abs(weights[i] - lastWeights[i]) > 0.0005) {
            weightsDirty = true;
            break;
          }
        }
        const warmthDirty =
          Number.isNaN(lastPaintedWarmthRef.current) ||
          Math.abs(ws.value - lastPaintedWarmthRef.current) > 0.003;

        if (weightsDirty || warmthDirty) {
          paintComposite(weights, ws.value);

          if (
            !paintedCallbackFired.current &&
            onGradientPaintedRef.current
          ) {
            paintedCallbackFired.current = true;
            onGradientPaintedRef.current();
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [paintComposite]
  );

  useEffect(() => {
    const weights = getGradientWeights(brightSpring.current.value);
    paintComposite(weights, warmthSpring.current.value);
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

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, paintComposite]);

  return (
    <div
      ref={layerRef}
      style={{
        position: "fixed",
        // Extend 2px past viewport on all sides to prevent iOS sub-pixel
        // hairline gaps at safe-area boundaries and home indicator edge
        top: "-2px",
        right: "-2px",
        bottom: "-2px",
        left: "-2px",
        willChange: "background-image",
      }}
    />
  );
}