# Ehlibyte — native QA checkpoint

Date: 2026-10-27. This is a checkpoint, not a completed design handoff.

## Evidence and normalization

- Source visual truth: `/Users/atalay/.codex/generated_images/01a174c2-5250-7860-8a73-b2515bb2018f/exec-db57b8fc-9f06-454b-9a1d-60ba4a762580.png` (853×1844).
- Latest implementation: `/Users/atalay/ehlibyte/docs/design/home-layout-fixed.png` (1206×2622, iPhone 17 simulator, 402×874 logical points at 3×).
- State: guest home, İstanbul, featured bağlama event, new bottom navigation.
- Combined full-view comparison: `/Users/atalay/ehlibyte/docs/design/home-comparison.png`.
- Source resized to 402px wide. Native status-bar safe area (186px) and bottom home-indicator inset (102px) excluded; native app content reduced to 402×778. Source is taller (402×869 normalized); this viewport difference is explicit and is not itself a fidelity defect.
- Browser not used: user explicitly requires iOS simulator.

## Comparison history

1. `home-initial.png`: native UI launched, Expo first-run developer-menu panel obscured it. Not a passing capture.
2. `home-pass1.png`: HMR/lazy-import module error while closing dev menu. Dynamic import replaced by static `closeMenu`, app relaunched; latest screenshot no longer shows this error.
3. `home-checkpoint.png`: P1 hero image layout overflow. Image intrinsic dimensions escaped the percentage/aspect-ratio layout and hid the event action. Fixed by setting explicit responsive numeric width/height. All new responsive image consumers now use the same measured width helper.
4. `home-layout-fixed.png`: hero crop and event action fit. Supplied logo’s white square was fixed by blending the existing asset container with the paper surface. Combined comparison inspected after both fixes.

## Required fidelity surfaces

- Typography: Playfair Display/Inter preserve serif display and sans-serif UI hierarchy. Headline wraps in two lines. Remaining dense/long-text states need native inspection.
- Spacing/layout: latest hero width, 5:3 crop, margins, metadata and primary button fit. Native safe areas reduce visible scroll content versus the source; no fake device chrome was added. Detail/form/sheet states remain unverified.
- Colors: paper, dark ink and burgundy match the selected direction. Selected navigation state uses burgundy; no decorative replacement artwork.
- Imagery: generated standalone baglama photograph follows the reference subject, light and crop. Existing source logo is reused. Six generated assets are in `assets/community/`; supplementary portraits are fictional adult demo profiles.
- Copy/content: current UI clearly identifies sample records. User subsequently requires production behavior and a full social feed; that new scope is not yet complete.

## Open findings

- [P1] Scope gap: new onboarding/login/register/OTP, legal/privacy/ATT screens and full social feed remain to be built. Existing source screens are preserved in `src/legacy-app`, not integrated into the new experience.
- [P1] Core production behavior is not connected: live auth, posts, moderation, matching/chat, communities/events and LiveKit audio are not exercised by the new UI. Local demo roles/fixtures cannot be treated as server authorization.
- [P2] Native interaction QA incomplete: tap/navigation, keyboard, long text, permission denial, smaller iPhone/iPad and admin/room states were not fully tested. No claim of end-to-end native test coverage.

Focused-region comparison has not yet been produced for forms, sheets or the admin panel because valid matching native captures are still missing. Main typography, hero crop and CTA are readable in the current full-view comparison; remaining surfaces must be captured before acceptance.

## Implementation checklist

1. Follow `task.md`: complete real onboarding/auth, feed, legal/privacy and server integrations.
2. Capture native primary/alternate/error states and focused comparison regions.
3. Test actual interactions and permission boundaries against the backend; rerun QA after changes.

final result: blocked
