Build a single-page editorial reading experience. 
The design philosophy is absolute restraint — nothing 
decorative, nothing superfluous. Every element earns 
its place through function.

LAYOUT:
- Full viewport height, flex column, centered on both axes
- Max-width: 720px for the content column
- Generous padding: 40px top, 24px horizontal
- Left-aligned minimal navigation at the top: a small 
  wordmark "Aether" in 13px sans-serif, muted gray, 
  followed by 3-4 article titles listed horizontally 
  with generous spacing between them
- The page should be 85%+ whitespace. Let the content 
  breathe. Trust the emptiness.

TYPOGRAPHY:
- Use ONE typeface only: "Inter" for everything. 
  No second font. Hierarchy comes from color intensity 
  and spatial positioning, NOT from size variation.
- Body text: 17px, weight 400, line-height 1.72, 
  letter-spacing -0.18px
- Headline: 32px, weight 400 (NOT bold — same weight 
  as body, just larger), same letter-spacing
- Navigation/secondary text: 14px, weight 400, 
  significantly muted color
- All text antialiased

CONTENT:
- Headline: "Default Settings"
- Subline: "March 2026" in muted secondary color, 14px
- Write 4-5 paragraphs of reflective essay about how 
  screens have shaped the way we perceive the world. 
  Write it thoughtfully — it should feel like something 
  a real person wrote, not AI. Introspective, slightly 
  melancholic, observational. Think about how we now 
  experience light, color, and space through glass.
- Between paragraphs 3 and 4, place a single image: 
  a 100% width rectangle with 16px border-radius, 
  aspect-ratio 16:9, filled with a subtle warm gradient 
  placeholder
- At the very bottom: small footer with just 
  "Dushanbe, 2026" in 13px, very muted

COLOR — start with a LIGHT daytime theme:
- Background: warm off-white #FAF7F2
- Primary text: #666666 (NOT black — a confident 
  mid-gray that says "I don't need to shout")
- Secondary text: #999999
- Navigation text: #CCCCCC
- No accent colors. No links styled differently. 
  Purely achromatic.
- If any interactive element needs a hover state, 
  shift background from #FAFAFA to #F0F0F0 with 
  0.2s cubic-bezier(0.4, 0, 0.2, 1) transition

COMPONENTS:
- Only two border-radius values in the entire page: 
  16px for larger containers and images, 
  9999px for any pill-shaped elements
- No borders anywhere. Differentiate elements through 
  subtle background color shifts only.
- No shadows. No gradients on UI elements. 
  No decorative elements.

FEEL:
- This should look like a page designed by someone who 
  studied Dieter Rams and Japanese minimalism. 
  It should feel like a physical object — quiet, 
  confident, and crafted. Not a template. Not generic.
  90% whitespace is intentional, not empty.

Add webcam-based ambient light detection. Do NOT change 
any of the current design. Just add the sensing layer.

CAMERA SETUP:
- On page load, request camera access
- Show a single small indicator: an 8px circle in the 
  top-right corner, 24px from edges. Color it #CCCCCC 
  when active. Make it pulse gently every 2 seconds 
  with an opacity animation (0.4 to 1.0). 
  Use border-radius: 9999px.
- Do NOT display the camera feed anywhere

LIGHT ANALYSIS (run every 2 seconds):
- Create a hidden video element connected to the webcam 
  and a hidden canvas
- Every 2 seconds, draw the current frame to canvas
- Sample pixels from the OUTER regions only 
  (top 15% rows, bottom 15% rows, left 15% columns, 
  right 15% columns) — skip the center 70% where the 
  face typically is
- For each sampled pixel, calculate:
  brightness = (R + G + B) / 3
  warmth_signal = (R - B) / 255
- Average all sampled brightness values into one number 
  (0-255)
- Average all warmth_signal values into one number 
  (-1.0 to 1.0, where negative = cool/blue light, 
  positive = warm/amber light)
- Store as CSS custom properties on document root:
  --ambient-brightness: [0-255]
  --ambient-warmth: [-1 to 1]

SMOOTHING:
- Don't set values directly. Lerp (linear interpolate) 
  from current value to new value. 
  Use: current = current + (target - current) * 0.15
- Update the CSS properties on every animation frame 
  during the lerp, not just every 2 seconds. 
  This makes transitions feel like real light changing — 
  gradual, never sudden.

FALLBACK:
- If camera is denied, set brightness to 200 and 
  warmth to 0 (neutral bright default)
- No error messages, no alerts, just graceful default

DEBUG (temporary):
- Bottom-left corner, position fixed, 10px monospace, 
  opacity 0.2, show:
  "brightness: [value] | warmth: [value]"
  We'll remove this later.

  Now connect --ambient-brightness and --ambient-warmth 
to transform the page design. This is the core feature.

CRITICAL: This is NOT three theme switches. It's a 
continuous spectrum. Interpolate all values smoothly 
based on the actual brightness number. Use CSS 
calc() with the custom properties to create fluid 
transitions.

All color transitions: 2.5s ease. The page should 
drift between states like the sky changes — never jump.

DARK ENVIRONMENT (brightness 0-80):
- Background: deep atmospheric navy. 
  Not black — think night sky. 
  Blend from #0B1120 to #141B2E as a subtle gradient
- Primary text: warm soft white rgba(255,245,230,0.85)
- Secondary text: rgba(255,245,230,0.45)
- Navigation text: rgba(255,245,230,0.25)
- Image placeholder: darken, add very subtle warm glow 
  at edges
- Increase body line-height to 1.8 and letter-spacing 
  to -0.1px — more spacious, relaxed, nighttime reading
- The overall mood: intimate, quiet, like reading by 
  a single lamp

MEDIUM ENVIRONMENT (brightness 80-170):
- Background: muted blue-gray, like dusk or a cloudy 
  afternoon. #2A2D3E blending to #383B4A
- Primary text: cream rgba(255,250,240,0.9)
- Secondary text: rgba(255,250,240,0.5)
- Navigation text: rgba(255,250,240,0.3)
- Body line-height: 1.75
- Mood: evening focus, concentrated, calm

BRIGHT ENVIRONMENT (brightness 170-255):
- Background: warm off-white #FAF7F2 
  (the original design)
- Primary text: #666666
- Secondary text: #999999
- Navigation text: #CCCCCC
- Body line-height: 1.72, letter-spacing: -0.18px 
  (original values — tighter, crisper, daytime energy)
- Image placeholder: clean and bright
- Mood: clear daylight, sharp, editorial

WARMTH OVERLAY (applies on top of brightness):
- When warmth > 0.3 (warm/amber light like sunset, 
  candles, tungsten bulbs): shift all background colors 
  slightly toward warm — add a subtle amber tint. 
  Text gets slightly warmer. The page feels golden hour.
- When warmth < -0.3 (cool light like overcast sky, 
  fluorescent, blue screens): shift backgrounds 
  slightly cooler/bluer. Text stays neutral or slightly 
  cool. The page feels crisp, sterile, focused.
- Between -0.3 and 0.3: no warmth adjustment, 
  neutral palette.

CAMERA INDICATOR:
- In dark mode: the indicator dot should be 
  rgba(255,255,255,0.3) with its pulse
- In light mode: keep it #CCCCCC
- It should always be subtle and never draw attention

IMPORTANT DESIGN RULE:
- Maintain the S.page-inspired restraint at ALL 
  brightness levels. The dark theme is NOT generic 
  dark mode. It should feel just as refined and 
  intentional as the light version. Same typography 
  system, same spacing philosophy, same confidence. 
  Just a different atmosphere, like the same room 
  at different times of day.

  Final refinements:

1. Remove the debug readout from bottom-left

2. PAGE LOAD SEQUENCE:
   - Page starts with opacity 0
   - Camera activates and takes first reading
   - Page fades in over 1.5s with the atmosphere 
     ALREADY adapted to the environment
   - The user should never see the page "switch" 
     themes on load. Their first impression is 
     already correct for their space.

3. Add a subtle indicator that this page is adaptive. 
   At the very bottom, below the footer, add in 13px 
   muted text (same color as navigation): 
   "this page sees your light"
   Style it with letter-spacing: 2px, uppercase, 
   to differentiate it from the editorial content. 
   It should feel like a quiet signature, 
   not a feature label.

4. GRACEFUL CAMERA DENIAL:
   - If user denies camera, fade in with the light 
     theme as default
   - Hide the camera indicator dot entirely
   - Don't show "this page sees your light" text 
     if camera is denied — replace with nothing

5. Ensure all transitions are using the same easing: 
   cubic-bezier(0.4, 0, 0.2, 1) — consistent motion 
   language throughout

6. One final touch: when the environment changes 
   significantly (like someone turns off a lamp), 
   the transition should take about 3-4 seconds to 
   fully settle. Not instant. Like your eyes adjusting 
   to a new light level. This is the detail that will 
   make it feel alive rather than mechanical.