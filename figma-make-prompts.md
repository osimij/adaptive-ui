# Figma Make — Prompt Sequence for Aether

> Feed these one at a time, in order. Wait for each response before giving the next. You're a designer with a clear vision, building iteratively.

---

## Prompt 1 — The Vision

```
I'm building a reading page that adapts to the physical light around you. Not a dark mode toggle — something that actually senses the room and shifts like your eyes do.

The aesthetic is total restraint. One typeface, mostly whitespace, no decoration. Think Dieter Rams meets Japanese editorial design — every element earns its place through function, nothing else. The kind of page where 90% emptiness is the point, not a gap to fill.

The content is a short essay about how screens have changed our relationship with light. Reflective, slightly melancholic. The whole thing should feel like a physical object — a printed page that somehow knows what room it's in.

Let's start with the reading experience itself, then layer in the adaptive behavior.
```

---

## Prompt 2 — The Editorial Page

```
Let's build the page. One typeface — Inter from Google Fonts, weight 400 for everything. I don't want bold anywhere. Hierarchy comes through color intensity, not weight.

For sizes: 32px headline, 17px body with generous 1.72 line-height, 14px for navigation and secondary text. Letter-spacing at -0.18px to tighten things up slightly. Everything antialiased.

Content column maxes out at 720px, centered, with 40px top padding and 24px on the sides. At the top left, a small "Aether" wordmark at 13px — quiet, not a logo. Flex column layout, full viewport height.

The headline is "Default Settings" with a "March 2026" subline underneath in a muted tone. Then 4-5 paragraphs — write them as a genuine essay about how screens have shaped the way we perceive light. How the color temperature of our evenings is no longer set by the sun. How #FFFFFF white doesn't exist in nature. How we've eliminated the ambient information that light used to carry. Make it thoughtful, like something from a real essayist.

Footer at the bottom: "Dushanbe, 2026" in 13px. Leave an empty paragraph below it with id="footerSignature" — we'll use that later.

Make it feel like something designed by someone who actually cares, not assembled from a template.
```

---

## Prompt 3 — The Background Architecture

```
Before we add any color — I need the background set up for what's coming.

Add two stacked divs behind the content as fixed background layers (id="backgroundLayerA" and id="backgroundLayerB"). Position them fixed, slightly past the viewport edges — top/left/right at -2px, bottom at calc(-2px - env(safe-area-inset-bottom)) to avoid hairline seams on mobile. Layer A starts at opacity 1, layer B at opacity 0. Both should have will-change on opacity and background-image, and translateZ(0) for GPU compositing. Content sits above at z-index 1.

Also add a subtle film grain over everything using a body::after pseudo-element — an SVG noise texture with feTurbulence (baseFrequency 0.75, 4 octaves), mix-blend-mode overlay, opacity 0.028, repeating at 250px. It gives gradients a tactile, almost photographic quality.

All text should be white with varying opacities: 0.93 for primary content, 0.55 for secondary elements like the date, 0.32 for navigation. All color transitions at 1.4s with a cubic-bezier(0.4, 0, 0.2, 1) ease.

Also add a small camera indicator dot — fixed, top-right corner (24px from edges), 8px circle, pulsing animation that fades between opacity 1 and 0.4 over 2 seconds. Start it hidden with a "hidden" class. We'll reveal it when the camera activates.
```

---

## Prompt 4 — My Gradient Palettes

```
I've been designing gradient palettes for different lighting conditions. Here are the five I want to use:

**Haze Day** — bright daylight, soft and airy:
Linear 180deg. #87B3E1 at 20%, #C0B9D0 at 43%, #CBB9CD at 51%, #CFAEC7 at 61%, #CAA5C5 at 69%, #C39EC4 at 77%, #7B9ED4 at 100%.

**Sunset Band** — warm evening light:
Linear 180deg. #4D70AA at 9%, #7A86B1 at 28%, #B793A7 at 45%, #E4A593 at 52%, #F48A76 at 65%, #FF694E at 77%, #FF7E42 at 88%, #FB9E34 at 100%.

**Mid Neutral** — balanced midday:
Linear 180deg. #356B98 at 23%, #6F7D9B at 37%, #B8918C at 50%, #D6AB90 at 60%, #FFCF7D at 72%, #FDB45A at 83%, #FB8C29 at 97%.

**Dim Radial** — candlelit, low light:
Radial gradient shaped "328.13% 100% at 50% 100%". #FC550E at 9%, #F0A14A at 24%, #C08A73 at 39%, #7D6A72 at 53%, #3F455B at 67%, #1A2030 at 80%, #030406 at 89%. Warm ember glow radiating from the bottom.

**Deep Night Blue** — near darkness:
Linear 180deg. #040941 at 11%, #052664 at 55%, #003C9F at 91%.

Map them to brightness anchors: haze-day at 178 for bright rooms, sunset-band at 142 for evening, mid-neutral at 108 for balanced indoor light, dim-radial at 76 for low light, deep-night-blue at 40 for near darkness. Store these as a JavaScript data structure called gradientPresets with id, type, angle/shape, and color stops with positions. Above the highest anchor minus 6, hold on haze-day. Below 32, lock to deep-night-blue. In between, blend using a smootherstep function — the 6th degree Hermite: t cubed times (t times (6t minus 15) plus 10).

Use the two background layers for crossfading: layer A shows one gradient at full opacity, layer B shows the next with opacity driven by the blend factor. Cache the built CSS gradient strings in a Map and clear it at 1200 entries to prevent memory bloat on long sessions.
```

---

## Prompt 5 — The Webcam Idea

```
Here's the interesting part — what if we used the webcam to detect how bright the room actually is, and shifted the gradient in real-time?

Request getUserMedia with facingMode 'user', low resolution (160x120 — we're sampling light, not taking photos). Hidden video element, hidden canvas, 2D context with willReadFrequently. Sample every 900ms.

No face detection, no ML. Just read the pixel brightness from the video frame and map it to which gradient to show. On success, show the camera indicator dot and run the first analysis immediately.

If the user denies camera access — no error message, no prompt, nothing. Just default to brightness 200 (the haze-day gradient), hide the indicator dot, and fade in gracefully. The page works fine without the camera, it just doesn't adapt.
```

---

## Prompt 6 — Smarter Detection

```
The detection is picking up too much from the face and body in the center of the frame. Let's only sample pixels from the outer edges — top 15%, bottom 15%, left 15%, right 15% of the frame. The center 70% where the person sits should only contribute at 0.24 weight for brightness. Edge regions get full 1.0 weight. Iterate at a 2x2 stride for speed.

For luminance, use proper BT.709 coefficients: 0.2126*R + 0.7152*G + 0.0722*B — not a simple RGB average. Also track the max(R, G, B) highlight per pixel.

Build a 256-bin weighted brightness histogram so we can pull percentiles. The 62nd percentile gives us a stable mid-brightness reading and the 78th gives us the upper range. These are much more stable than raw averages for ambient light because they're resistant to outliers like a bright lamp in frame.

Fuse the signals: 25% average brightness, 35% mid-percentile, 25% upper-percentile, 15% highlight. Normalize from the 36-172 range (practical indoor webcam values) and apply a 0.82 gamma correction — webcams tend to underexpose bright rooms, so this makes the system more responsive in daylight. Final brightness is 55% weighted full-frame average plus 45% edge-only average.

Apply first-stage damping before setting targets: for brightness changes bigger than 26, use an alpha of 0.36 to respond faster. For smaller noise, alpha 0.22. Same idea for warmth — alpha 0.32 for big changes, 0.2 for noise. Add a dead zone: don't update at all unless brightness shifts by more than 0.35 or warmth by more than 0.01.
```

---

## Prompt 7 — Transitions Feel Too Sudden

```
The gradient switching works but it feels digital — too sudden, like a theme toggle. I want it to feel like your eyes adjusting to a dark room.

Build a requestAnimationFrame loop that lerps toward the target brightness each frame. The key is an adaptive settle factor: small changes should settle fast (factor around 0.032), but big dramatic shifts should settle slowly (factor around 0.012, taking 3-4 seconds). Calculate the magnitude of change as a ratio of max delta (95), then lerp between those factors.

Here's the biological part — brightening should be slightly faster than darkening (multiply by 1.04 for brightness increases, 0.96 for decreases). That's how human pupils actually work: they constrict quickly in bright light but dilate slowly in darkness.

Same approach for warmth interpolation but with different ranges — magnitude scaled against 0.45, factors between 0.02 and 0.05.

Add snap thresholds so we don't chase values forever: if brightness is within 0.03 of target, snap. Warmth within 0.003, snap. Only repaint when values actually change — cache the last painted gradient state and skip frames where nothing moved.
```

---

## Prompt 8 — The Colors Look Muddy

```
The transition between the blue gradient and the amber one looks grey and muddy in the middle. That's because RGB interpolation takes a straight line through color space and passes through desaturated values.

Can we convert to OKLCh and interpolate there instead? I need the full conversion chain: sRGB to linear RGB, to LMS cone response, to OKLab, to OKLCh. The hue interpolation should take the shortest arc around the color wheel using modular angle math.

That'll keep the colors vibrant through transitions. Also, analyze each segment between gradient stops for perceptual stress — calculate it from hue jump, chroma, and lightness differences. Where stress is high (above 0.55), add 3 micro-stops between the originals. Medium stress (above 0.3) gets 2 micro-stops. Low stress gets a single midpoint hint. Shift the midpoint placement based on which direction the lightness and chroma are drifting. This prevents visible banding in the difficult segments — especially those blue-to-amber transitions.
```

---

## Prompt 9 — Warmth Detection

```
One more thing for the sensing — can we also detect whether the ambient light is warm or cool?

For each edge pixel (never the center), calculate (R - B) / 255. Average all the edge warmth values to get a range from -1 to 1. Negative means cool light — overcast, fluorescent, screens. Positive means warm — sunset, candles, tungsten bulbs.

If warmth is above 0.3, shift all gradient stops slightly warmer: bump red up by 12, green by 5, blue down by 8, scaled by intensity. Below -0.3, go cooler: red down 8, green down 2, blue up 11. Between -0.3 and 0.3 is a dead zone — don't shift at all. Small adjustments, just enough that the page feels responsive to the actual color temperature of the room, not just brightness.
```

---

## Prompt 10 — Polish & Load Sequence

```
For the page load: start the body at opacity 0, take the first camera reading, THEN fade in over 1.5 seconds with the gradient already matching the room. Use two requestAnimationFrame ticks before triggering the opacity transition — this ensures the browser has actually painted the gradient first. The user should never see a theme switch on load.

For iOS: add viewport meta with viewport-fit=cover, apple-mobile-web-app-capable, and black-translucent status bar. The backgrounds already extend past the viewport edges for overscroll. Extract the first and last stop colors from the active gradient (interpolating with OKLCh when blending between two gradients) and set them as the document element and body background colors. Update the meta theme-color tag in real-time so the browser chrome matches the gradient.

Add a small PWA manifest — name "Aether", standalone display, theme color #87B3E1, with SVG and PNG icons. Register a service worker that does network-first for navigation and cache-first for assets.

Expose --ambient-brightness and --ambient-warmth as CSS custom properties on :root every frame. The camera indicator should be subtle on both light and dark backgrounds — rgba(255,255,255,0.3) when dark, rgb(204,204,204) when bright.

One last thing — at the bottom of the page, below the footer, in that footerSignature element: when the camera is active, show "this page sees your light" in 13px uppercase text with 2px letter-spacing. It should feel like a quiet signature, not a feature announcement. If camera is denied, leave it empty — just show the page with the bright default and move on.
```

---

## Notes

**Pacing**: Wait for each response before giving the next. Each one builds on what came before.

**If something comes out slightly off**: Course-correct naturally. "The smootherstep should be the 6th degree version, not cubic." "The sensor gamma should be 0.82 — webcams compress highlights." "The hue interpolation needs to take the shortest arc."

**The story**: You've been thinking about this project for a while. You know OKLCh is better than RGB for interpolation. You know webcams underexpose bright rooms. You know the 62nd percentile is more stable than averages for light sensing. You're not guessing — you're a designer who's done the research, and Figma Make is helping you bring a well-considered vision to life.
