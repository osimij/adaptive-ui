import { useAdaptiveBrightness } from "./components/useAdaptiveBrightness";
import { AdaptiveBackground } from "./components/AdaptiveBackground";
import { useState, useEffect, useCallback, useRef } from "react";

// ── iOS meta tags & PWA setup (run once) ─────────────────────────────────

function useIOSAndPWASetup() {
  useEffect(() => {
    const head = document.head;

    // Viewport with viewport-fit=cover for iOS safe areas
    let viewport = document.querySelector(
      'meta[name="viewport"]'
    ) as HTMLMetaElement | null;
    if (viewport) {
      viewport.setAttribute(
        "content",
        "width=device-width, initial-scale=1, viewport-fit=cover"
      );
    } else {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewport.content =
        "width=device-width, initial-scale=1, viewport-fit=cover";
      head.appendChild(viewport);
    }

    // Apple mobile web app capable
    const capable = document.createElement("meta");
    capable.name = "apple-mobile-web-app-capable";
    capable.content = "yes";
    head.appendChild(capable);

    // Black translucent status bar
    const statusBar = document.createElement("meta");
    statusBar.name = "apple-mobile-web-app-status-bar-style";
    statusBar.content = "black-translucent";
    head.appendChild(statusBar);

    // PWA manifest link
    let manifestLink = document.querySelector(
      'link[rel="manifest"]'
    ) as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = "/manifest.json";
      head.appendChild(manifestLink);
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed silently — fine for dev
      });
    }

    return () => {
      capable.remove();
      statusBar.remove();
    };
  }, []);
}

// ── Camera indicator (adapts to dark/bright backgrounds) ─────────────────

function CameraIndicator({ brightness }: { brightness: number }) {
  // Dark backgrounds: subtle white glow. Bright: neutral gray.
  const isDark = brightness < 130;
  const dotColor = isDark ? "rgba(255,255,255,0.3)" : "rgb(204,204,204)";
  const glowColor = isDark
    ? "0 0 6px rgba(255,255,255,0.15)"
    : "0 0 6px rgba(180,180,180,0.3)";

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: dotColor,
          boxShadow: glowColor,
          animation: "pulse-dot 2s ease-in-out infinite",
          transition: "background-color 1.5s ease, box-shadow 1.5s ease",
        }}
      />
    </div>
  );
}

// ── Content components ───────────────────────────────────────────────────

function Navigation() {
  return (
    <div className="w-full shrink-0">
      <p className="font-['Inter',sans-serif] text-[13px] text-white/55 tracking-[-0.18px]">
        Aether
      </p>
    </div>
  );
}

function Article() {
  return (
    <div className="w-full shrink-0 flex flex-col gap-8">
      {/* Title + Date */}
      <div className="flex flex-col gap-3 w-full">
        <p className="font-['Inter',sans-serif] text-[32px] leading-[41.6px] text-white/[0.93] tracking-[-0.18px]">
          Default Settings
        </p>
        <p className="font-['Inter',sans-serif] text-[14px] text-white/55 tracking-[-0.18px]">
          March 2026
        </p>
      </div>

      {/* Paragraphs */}
      <p className="font-['Inter',sans-serif] text-[17px] leading-[29.24px] text-white/[0.93] tracking-[-0.18px] max-w-[672px]">
        {`There was a moment, years ago now, when I realized I hadn't looked at a sunset without framing it first. My hand went to my pocket before my eyes had finished adjusting. The light was doing something remarkable over the rooftops — that particular amber that only happens in late October when the atmosphere is heavy with dust — and my first instinct was to capture it, to flatten it into a rectangle of pixels. I caught myself, but only barely, and what stayed with me wasn't the sunset. It was the reflex.`}
      </p>

      <p className="font-['Inter',sans-serif] text-[17px] leading-[29.24px] text-white/[0.93] tracking-[-0.18px] max-w-[672px]">
        {`We've spent two decades training ourselves to see the world at arm's length. Not through glass in the old sense — windows, spectacles, the polished surfaces that once separated inside from outside — but through glass that thinks, glass that decides what we look at and for how long. The screen has become our primary organ of perception. We wake to it. We eat beside it. We fall asleep bathed in its blue-shifted light, our circadian rhythms rewritten by engineers in Cupertino who probably sleep just fine. The color temperature of our evenings is no longer set by the sun.`}
      </p>

      <p className="font-['Inter',sans-serif] text-[17px] leading-[29.24px] text-white/[0.93] tracking-[-0.18px] max-w-[672px]">
        {`What strikes me most isn't the quantity of time we spend looking at screens — that argument has been made and made again until it means nothing. It's the qualitative shift in how we process space. I notice it in small ways. A room feels different before I photograph it and after. The photograph doesn't capture the room; it replaces it. Once I've taken the picture, the image becomes the memory, and the room as it actually was — the way the light fell unevenly across the floorboards, the slight smell of old wood and coffee — compresses into something thinner, something that fits in a timeline. We are building an enormous archive of surfaces and losing the volumes beneath them.`}
      </p>

      <p className="font-['Inter',sans-serif] text-[17px] leading-[29.24px] text-white/[0.93] tracking-[-0.18px] max-w-[672px]">
        {`I think about the color white more than I should. Not white as painters understood it — lead white, zinc white, titanium white, each with its own warmth and weight — but white as screens render it. #FFFFFF. Pure, impossible, the absence of all subtlety. No wall has ever been this white. No paper, no snow, no bone. It's a color that exists only in light, projected directly into the eye, and we've made it the default background of our lives. Every document, every message, every thought we type appears on this supernatural white. And then we wonder why the physical world looks dim when we glance up from our phones. We've recalibrated our expectations of brightness. The sun now competes with the display.`}
      </p>

      <p className="font-['Inter',sans-serif] text-[17px] leading-[29.24px] text-white/[0.93] tracking-[-0.18px] max-w-[672px]">
        {`Perhaps what we're really mourning — if mourning is the right word, and I'm not sure it is — is the loss of ambient experience. The world used to wash over us. Light changed slowly. A cloud would pass and the room would shift from warm to cool and back again, and you'd barely notice unless you were paying a particular kind of attention. Now our environments are fixed. LED panels at 5000K from morning to night. The same brightness in the kitchen at noon as at midnight. We've eliminated the information that light used to carry — time of day, season, weather, the slow planetary tilt that used to be written in the angle of shadows on a wall. We replaced it with constancy, with the factory settings, and called it an improvement. Maybe it was. But something was lost in the trade, and I think we feel its absence in ways we haven't yet learned to name.`}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <div className="w-full shrink-0">
      <p className="font-['Inter',sans-serif] text-[13px] text-white/55 tracking-[-0.18px]">
        Dushanbe, 2026
      </p>
    </div>
  );
}

// ── Main app ────────────────────────────────────────────────────────────

export default function App() {
  const { brightness, warmth, cameraActive, ready } = useAdaptiveBrightness();
  const [visible, setVisible] = useState(false);
  const fadeTriggeredRef = useRef(false);

  // iOS meta tags + PWA
  useIOSAndPWASetup();

  // Start body invisible
  useEffect(() => {
    document.body.style.opacity = "0";
    document.body.style.transition = "none";
  }, []);

  // Callback from AdaptiveBackground: gradient has been painted
  const handleGradientPainted = useCallback(() => {
    if (fadeTriggeredRef.current) return;
    fadeTriggeredRef.current = true;

    // Wait 2 rAF ticks to guarantee the browser has composited the gradient
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Now fade in body over 1.5s
        document.body.style.transition = "opacity 1.5s ease-in-out";
        document.body.style.opacity = "1";
        setVisible(true);
      });
    });
  }, []);

  // When the camera hook signals ready AND we haven't faded yet, trigger the sequence.
  // The AdaptiveBackground will fire onGradientPainted once it paints the first frame,
  // which then triggers the 2-rAF-tick fade. But we also need to handle the case where
  // AdaptiveBackground paints before ready fires (e.g., it initializes with default values).
  // So we only pass onGradientPainted after ready is true.
  const onPainted = ready ? handleGradientPainted : undefined;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Adaptive gradient background */}
      <AdaptiveBackground
        targetBrightness={brightness}
        targetWarmth={warmth}
        onGradientPainted={onPainted}
      />

      {/* Camera indicator — adapts to dark/bright */}
      {cameraActive && <CameraIndicator brightness={brightness} />}

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center w-full"
        style={{
          opacity: visible ? 1 : 0,
          transition: visible ? "opacity 1.5s ease-in-out" : "none",
        }}
      >
        <div
          className="flex flex-col gap-[120px] items-start px-6 py-10 w-full max-w-[720px]"
          style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))" }}
        >
          <Navigation />
          <Article />
          <Footer />
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}