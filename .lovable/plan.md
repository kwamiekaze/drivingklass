# Homepage 3D Hero — Award-Winning Rebuild

Presentation-only overhaul of `/` (Index.tsx). Every price, package, Square link, contact form, nav item, footer, SEO meta, and light/dark logic is preserved verbatim. No changes to `/simulator`, portal routes, or `src/data/packages.ts`.

## What survives, exactly

Pulled from the current `src/pages/Index.tsx` chain:

- **11 packages** from `src/data/packages.ts` (1 HR $69 → 40 HR $2,199, plus 1 HR + RD TEST $160 and 2 HR + RD TEST $200) — same titles, prices, descriptions, `squareUrl`s, and `positionIndex` order.
- **`PackageModal`** — same "Book Now" Square flow, same analytics `trackClick("open_info", …)` and `("package_select", …)`.
- **Car center → auth/dashboard link** with the existing role-based routing (auth → student/instructor/admin/staff) as the click target on the 3D car.
- **`HeaderBrand`** (DRIVINGKLASS + 5 gold stars), `ThemeToggle` top-left, portal car icon top-right → `/auth`.
- **`NavigationButtons`** (opens `ReviewsModal` + `AboutModal`), **`ContactSection`** (contact form + Supabase submit), both `ReviewsModal` and `AboutModal` — mounted below the hero, untouched.
- **Backgrounds**: `GalaxyStars` (dark) and `LightModeBackground` (light) continue to render outside the 3D canvas.
- **Splash screen** flow (`SplashScreen`, `splashComplete` state, desktop-skip rule) preserved.
- **SEO / head metadata** in `index.html` — untouched.
- **Reduced motion**: existing `prefers-reduced-motion` behavior extended to the 3D scene (serves static poster).

Anything not called out above is untouched.

## New structure

```text
src/components/home3d/
  Hero3DScene.tsx      Canvas host, lights, environment, camera rig, intro tween
  DkCar.tsx            GLB attempt (/assets/dk-car-gold.glb) with image-plane fallback
  PriceRing.tsx        Orbiting cards anchored to car, drei <Html> DOM cards
  PriceCard.tsx        Single glassy dark card (gold border, gold price)
  SoundManager.tsx     WebAudio synth: engine start, ambient pad, tick, whoosh
  MuteToggle.tsx       Floating gold mute/unmute button
  PosterFallback.tsx   Static hero + normal DOM grid of price cards
  useCapabilityTier.ts prefers-reduced-motion + GPU/mobile heuristic → 'full' | 'lite' | 'poster'
  useGlbAvailable.ts   HEAD /assets/dk-car-gold.glb, cache result
```

`Hero3DScene` is lazy-loaded (`React.lazy` + `Suspense`) so the initial bundle stays small and the poster paints instantly for LCP.

## Behavior

**Hero layout**
- Full-viewport `<section>` replacing the current `HeroSection` body.
- Overlaid DOM: `ThemeToggle`, portal link, `HeaderBrand`, tagline **"Where 5-Star Drivers Are Made"** in Bebas Neue display type, staggered letter-in on load, `MuteToggle` bottom-right.
- Under the hero: existing `NavigationButtons` → `ContactSection` chain, unchanged.

**3D scene**
- Dark reflective asphalt plane, single gold lane line receding to horizon, warm golden-hour key + rim lights, `Environment` preset for reflections, thin floating dust particles (instanced points, capped).
- Camera: idle drift + mouse parallax on desktop, touch-drag orbit on mobile via `OrbitControls` (pan/zoom disabled, polar-locked so ring stays visible), optional device-tilt parallax when `DeviceOrientationEvent.requestPermission` is granted.
- Intro: 2.5s camera glide from low-front to hero framing; ring blooms outward from behind the car; title letters stagger in. Any pointer/keydown skips the tween.

**Car (`DkCar`)**
- `useGlbAvailable` HEADs `/assets/dk-car-gold.glb` once and caches. If present → `useGLTF` inside `<Suspense>` with error boundary. If missing or failed → tilted image plane using the existing gold car asset with layered parallax shadow, gentle float, same auto-rotate and drag-to-rotate.
- Component swaps to the GLB automatically on next mount once file lands — no other code change.
- Whole car is a click target reusing `CarCenterLink`'s role-based destination logic.

**Price ring (`PriceRing`)**
- 11 cards arranged on a circle in the car's local space (anchored group) so they always orbit the car regardless of camera.
- Cards rendered via drei `<Html transform occlude>` so they are real DOM: keyboard-focusable, screen-reader visible, crawlable, and clicking calls the same `handlePackageClick` → opens `PackageModal` (identical Square flow).
- Slow constant Y-rotation (~6° per second). Hover (desktop) / tap (mobile) pauses rotation, scales the target ~1.08 with a gold-glow ring, reveals its "Book Now" CTA inline.
- Cards on the far side dim (`opacity` driven by dot(cameraForward, cardNormal)).

**Sound**
- Off by default. Toggle persists in `localStorage`.
- All sounds synthesized via WebAudio (small oscillator + noise buffer) so zero binary assets: engine-start note on first unmute, low pad loop, hover tick, drag whoosh. Volume ≤ 0.25, respects autoplay policy (only starts after user gesture).

**Performance tiers (`useCapabilityTier`)**
- `full`: postprocessing bloom on gold trim + subtle vignette, dust particles, GLB when available.
- `lite`: no postprocessing, fewer particles, capped DPR 1.25 (mid mobile).
- `poster`: `prefers-reduced-motion` OR `deviceMemory <= 2` OR failed WebGL context. Renders `PosterFallback`: static hero image + full DOM grid of the 11 price cards, all wired to `PackageModal`. Fully functional, zero motion.

**Theme integration**
- Dark = primary showroom look.
- Light = same scene but with a lighter fog color and reduced bloom so it blends into `LightModeBackground` below.

## Files touched vs new

New:
- `src/components/home3d/*` (8 files above)
- `.env`-free — no new keys or endpoints.

Edited:
- `src/components/HeroSection.tsx` — body swapped for `<Hero3DScene />` (still receives `splashComplete`); header row and `HeaderBrand` kept.
- `src/pages/Index.tsx` — unchanged wiring; only import unchanged.

Untouched:
- `src/data/packages.ts`, `PackageModal`, `NavigationButtons`, `ContactSection`, `ReviewsModal`, `AboutModal`, `SplashScreen`, `ThemeToggle`, `HeaderBrand`, `GalaxyStars`, `LightModeBackground`, `index.html`, all portal routes, `/simulator`, `src/games/**`.

## Dependencies

Install pinned per project's React 18 constraints:

```bash
bun add @react-three/fiber@^8.18 @react-three/drei@^9.122.0 @react-three/postprocessing@^2.16.0 three@^0.160.0
```

## Accessibility & SEO

- Every price card is a native `<button>` with `aria-label="{label} — {price} — Book"`, focus ring, keyboard-activatable.
- Tagline is a real `<h1>` inside the canvas overlay so crawlers see it.
- Price list is fully present in DOM via drei `<Html>` (not baked into textures).

## Out of scope

- No GLB is created or uploaded here — the fallback image ships; the GLB slots in automatically when the user drops it at `/public/assets/dk-car-gold.glb`.
- No changes to pricing, wording, links, Square URLs, contact form fields, or portal.
- No modifications to `/simulator` or any portal page.

## Verification

- `tsgo --noEmit` clean.
- Playwright at 390px viewport: no horizontal scroll, all 11 cards keyboard-reachable, `PackageModal` opens with correct Square URL for a sampled card, `ContactSection` still renders below.
- Manual toggle of `prefers-reduced-motion` renders `PosterFallback` with all 11 prices.
