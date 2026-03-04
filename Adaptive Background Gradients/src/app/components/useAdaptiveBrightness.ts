import { useEffect, useRef, useState, useCallback } from "react";

// BT.709 coefficients
const LUM_R = 0.2126;
const LUM_G = 0.7152;
const LUM_B = 0.0722;

// Spatial zones — aggressively ignore center where the person sits
// The frame is divided into: corners, edge strips, transition ring, and center
const CORNER_FRAC = 0.22; // outer 22% for corners
const EDGE_FRAC = 0.22; // edge strips (top/bottom/left/right bands)
const TRANSITION_FRAC = 0.32; // transition zone before center

// Weights per zone — center is nearly zeroed out
const CORNER_WEIGHT = 1.0; // corners are most trustworthy (no person, no screen)
const EDGE_WEIGHT = 0.85; // edge strips show walls, ceiling, windows
const TRANSITION_WEIGHT = 0.08; // transition barely contributes
const CENTER_WEIGHT = 0.02; // center is almost entirely ignored

// Histogram percentiles
const MID_PERCENTILE = 0.62;
const UPPER_PERCENTILE = 0.78;

// Signal fusion weights
const W_AVG = 0.20;
const W_MID = 0.35;
const W_UPPER = 0.25;
const W_HIGHLIGHT = 0.20;

// Normalization range (practical indoor webcam values)
const NORM_LO = 36;
const NORM_HI = 172;
const GAMMA = 0.82;

// Damping
const BRIGHTNESS_FAST_ALPHA = 0.36;
const BRIGHTNESS_SLOW_ALPHA = 0.22;
const BRIGHTNESS_FAST_THRESHOLD = 26;
const WARMTH_FAST_ALPHA = 0.32;
const WARMTH_SLOW_ALPHA = 0.2;
const WARMTH_FAST_THRESHOLD = 0.05;

// Dead zones
const BRIGHTNESS_DEAD_ZONE = 0.35;
const WARMTH_DEAD_ZONE = 0.01;

// Screen reflection compensation
// If center is much brighter than edges, it's screen glow — trust edges more
const REFLECTION_RATIO_THRESHOLD = 1.35; // center/edge ratio that triggers compensation
const REFLECTION_EDGE_BOOST = 1.0; // when compensating, edge signal is 100% of output
const REFLECTION_FULL_BLEND = 0.0; // full-frame signal drops to 0% when compensating

// Normal blend (no reflection detected)
const NORMAL_FULLFRAME_BLEND = 0.35; // reduced from 0.55
const NORMAL_EDGEONLY_BLEND = 0.65; // increased from 0.45

function getPixelZone(x: number, y: number, w: number, h: number): number {
  // Returns zone: 0=corner, 1=edge, 2=transition, 3=center
  const fracX = x / w;
  const fracY = y / h;

  // Distance from nearest edge as fraction
  const distX = Math.min(fracX, 1 - fracX);
  const distY = Math.min(fracY, 1 - fracY);

  const cornerThresh = CORNER_FRAC;
  const edgeThresh = EDGE_FRAC;
  const transThresh = TRANSITION_FRAC;

  // Corner: both x and y are in outer region
  if (distX < cornerThresh && distY < cornerThresh) return 0;

  // Edge strip: at least one axis is in outer region
  if (distX < edgeThresh || distY < edgeThresh) return 1;

  // Transition: between edge and center
  if (distX < transThresh || distY < transThresh) return 2;

  // Center
  return 3;
}

const ZONE_WEIGHTS = [CORNER_WEIGHT, EDGE_WEIGHT, TRANSITION_WEIGHT, CENTER_WEIGHT];

function percentileFromHistogram(histogram: Float64Array, totalWeight: number, p: number): number {
  const target = totalWeight * p;
  let cumulative = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= target) return i;
  }
  return 255;
}

function fuseAndNormalize(avg: number, mid: number, upper: number, highlight: number): number {
  const fused = W_AVG * avg + W_MID * mid + W_UPPER * upper + W_HIGHLIGHT * highlight;

  // Normalize from practical webcam range to 0-255
  const normalized = (fused - NORM_LO) / (NORM_HI - NORM_LO);
  const clamped = Math.max(0, Math.min(1, normalized));

  // Gamma correction — webcams underexpose bright rooms
  const gammaCorrected = Math.pow(clamped, GAMMA);

  return gammaCorrected * 255;
}

export function useAdaptiveBrightness() {
  const [brightness, setBrightness] = useState<number>(200);
  const [cameraActive, setCameraActive] = useState(false);
  const [warmth, setWarmth] = useState<number>(0);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dampedBrightnessRef = useRef<number>(200);
  const dampedWarmthRef = useRef<number>(0);
  const initializedRef = useRef(false);

  const sampleBrightness = useCallback(() => {
    const video = videoRef.current;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!video || !ctx || !canvas || video.readyState < 2) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Weighted histogram (256 bins) — edge-only (corners + edge strips)
    const histEdge = new Float64Array(256);

    let totalWeightEdge = 0;
    let weightedLumSumEdge = 0;
    let weightedHighlightSumEdge = 0;

    // Separate center tracking for reflection detection
    let centerLumSum = 0;
    let centerCount = 0;
    let edgeLumSum = 0;
    let edgeCount = 0;

    // Full-frame weighted (with zone weights applied)
    const histFull = new Float64Array(256);
    let totalWeightFull = 0;
    let weightedLumSumFull = 0;
    let weightedHighlightSumFull = 0;

    let warmthNumerator = 0;
    let warmthDenominator = 0;

    // 2x2 stride for speed
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // BT.709 luminance
        const lum = LUM_R * r + LUM_G * g + LUM_B * b;
        const lumBin = Math.min(255, Math.round(lum));

        // Max channel highlight
        const highlight = Math.max(r, g, b);

        // Determine spatial zone and weight
        const zone = getPixelZone(x, y, w, h);
        const pw = ZONE_WEIGHTS[zone];

        // Full-frame weighted accumulation
        histFull[lumBin] += pw;
        totalWeightFull += pw;
        weightedLumSumFull += lum * pw;
        weightedHighlightSumFull += highlight * pw;

        // Edge-only accumulation (corners + edge strips only)
        if (zone <= 1) {
          histEdge[lumBin] += pw;
          totalWeightEdge += pw;
          weightedLumSumEdge += lum * pw;
          weightedHighlightSumEdge += highlight * pw;
          edgeLumSum += lum;
          edgeCount++;
        }

        // Center tracking for reflection detection
        if (zone >= 2) {
          centerLumSum += lum;
          centerCount++;
        }

        // Warmth from edges only — (R - B) / 255 for color temperature
        if (zone <= 1) {
          warmthNumerator += (r - b) / 255;
          warmthDenominator++;
        }
      }
    }

    if (totalWeightEdge === 0) return;

    // Screen reflection detection
    const avgCenter = centerCount > 0 ? centerLumSum / centerCount : 0;
    const avgEdge = edgeCount > 0 ? edgeLumSum / edgeCount : 1;
    const reflectionRatio = avgEdge > 0.01 ? avgCenter / avgEdge : 1;

    // If center is significantly brighter than edges, screen is reflecting off the person
    // In that case, trust edges almost exclusively
    const isReflecting = reflectionRatio > REFLECTION_RATIO_THRESHOLD;

    const fullframeBlend = isReflecting ? REFLECTION_FULL_BLEND : NORMAL_FULLFRAME_BLEND;
    const edgeBlend = isReflecting ? REFLECTION_EDGE_BOOST : NORMAL_EDGEONLY_BLEND;

    // Edge signals
    const edgeAvg = weightedLumSumEdge / totalWeightEdge;
    const edgeMid = percentileFromHistogram(histEdge, totalWeightEdge, MID_PERCENTILE);
    const edgeUpper = percentileFromHistogram(histEdge, totalWeightEdge, UPPER_PERCENTILE);
    const edgeHighlight = weightedHighlightSumEdge / totalWeightEdge;
    const fusedEdge = fuseAndNormalize(edgeAvg, edgeMid, edgeUpper, edgeHighlight);

    // Full-frame signals (already zone-weighted so center barely contributes)
    let fusedFull = fusedEdge;
    if (totalWeightFull > 0) {
      const fullAvg = weightedLumSumFull / totalWeightFull;
      const fullMid = percentileFromHistogram(histFull, totalWeightFull, MID_PERCENTILE);
      const fullUpper = percentileFromHistogram(histFull, totalWeightFull, UPPER_PERCENTILE);
      const fullHighlight = weightedHighlightSumFull / totalWeightFull;
      fusedFull = fuseAndNormalize(fullAvg, fullMid, fullUpper, fullHighlight);
    }

    // Final blend with reflection compensation
    const rawBrightness = fullframeBlend * fusedFull + edgeBlend * fusedEdge;

    // Warmth signal: (R-B)/255 averaged over edge pixels, range -1 to 1
    const rawWarmth = warmthDenominator > 0 ? warmthNumerator / warmthDenominator : 0;

    // First frame: skip damping, initialize directly
    if (!initializedRef.current) {
      initializedRef.current = true;
      dampedBrightnessRef.current = rawBrightness;
      dampedWarmthRef.current = rawWarmth;
      setBrightness(rawBrightness);
      setWarmth(rawWarmth);
      setReady(true);
      return;
    }

    // Adaptive damping for brightness
    const brightnessDelta = Math.abs(rawBrightness - dampedBrightnessRef.current);
    if (brightnessDelta > BRIGHTNESS_DEAD_ZONE) {
      const alpha =
        brightnessDelta > BRIGHTNESS_FAST_THRESHOLD
          ? BRIGHTNESS_FAST_ALPHA
          : BRIGHTNESS_SLOW_ALPHA;
      dampedBrightnessRef.current =
        dampedBrightnessRef.current + alpha * (rawBrightness - dampedBrightnessRef.current);
      setBrightness(dampedBrightnessRef.current);
    }

    // Adaptive damping for warmth
    const warmthDelta = Math.abs(rawWarmth - dampedWarmthRef.current);
    if (warmthDelta > WARMTH_DEAD_ZONE) {
      const alpha =
        warmthDelta > WARMTH_FAST_THRESHOLD ? WARMTH_FAST_ALPHA : WARMTH_SLOW_ALPHA;
      dampedWarmthRef.current =
        dampedWarmthRef.current + alpha * (rawWarmth - dampedWarmthRef.current);
      setWarmth(dampedWarmthRef.current);
    }
  }, []);

  useEffect(() => {
    const video = document.createElement("video");
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.muted = true;
    video.style.display = "none";
    document.body.appendChild(video);
    videoRef.current = video;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    canvas.style.display = "none";
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctxRef.current = ctx;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 160 },
          height: { ideal: 120 },
        },
        audio: false,
      })
      .then((stream) => {
        streamRef.current = stream;
        video.srcObject = stream;
        video.play();
        setCameraActive(true);

        video.addEventListener(
          "loadeddata",
          () => {
            sampleBrightness();
            intervalRef.current = setInterval(sampleBrightness, 900);
          },
          { once: true }
        );
      })
      .catch(() => {
        setBrightness(200);
        setWarmth(0);
        setCameraActive(false);
        setReady(true);
      });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      video.remove();
      canvas.remove();
    };
  }, [sampleBrightness]);

  return { brightness, warmth, cameraActive, ready };
}