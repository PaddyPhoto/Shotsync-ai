# Spec — In-Lightbox Image Editor (non-destructive)

**Status:** Draft for review · July 2026
**Owner:** Founder / Engineering
**Related code:** `src/app/dashboard/review/page.tsx` (lightbox), `src/store/session.ts` (state), `src/lib/export/image-processing.ts` (`processImageOnCanvas`), `src/app/api/remove-background/route.ts` (cutout), `src/components/export/ExportView.tsx` (export application).

---

## 1. Goal

Let an ecommerce coordinator do the small set of Photoshop tasks they actually use for listing prep — **without leaving ShotSync**. Today they export → round-trip through Photoshop → re-import. Closing that loop makes ShotSync the single tool from *images received* to *listing live*.

The editor lives **inside the existing review-page lightbox** (which already exists as a large-image viewer): open an image big, adjust it, move on. All adjustments are **non-destructive** — stored as a small recipe per image and applied to the full-resolution master only at export.

### In scope (v1)
- Real-time **exposure, contrast, temperature, saturation** sliders.
- **One-click background removal** (uses the existing `/api/remove-background` route).
- **Apply to all** — copy the slider recipe, and/or run background removal, across every image in the session.
- Non-destructive: recipes are editable/resettable at any time; originals are never mutated.

### Out of scope (v1) — see §9
- Spot/healing brush (content-aware inpainting — hard; AI-inpainting API later).
- Crop/straighten *inside* the editor (marketplace crop already happens at export; a manual crop tool is a fast-follow, §9).
- Layers, masks, local adjustments, curves-by-hand (global adjustments only in v1).

---

## 2. Why this fits ShotSync's architecture

Three seams already exist — this is an **extension, not a new subsystem**:

1. **Lightbox** — `review/page.tsx` already has `lightboxImageId` / `lightboxUrl` with on-demand medium-res generation. We add an editor panel to it.
2. **Client-side canvas pipeline** — `processImageOnCanvas()` already does Lanczos3 resize, crop, unsharp, and background compositing, and already accepts a `preRemovedBgBlob`. We add one adjustment pass and pass the recipe in.
3. **Background removal** — `/api/remove-background` already returns a transparent PNG (PhotoRoom, falling back to Replicate BRIA RMBG 2.0).

**It reinforces the #1 differentiator.** Adjustments render on-device in the browser; only the final exported listing leaves. "Your unreleased imagery never leaves your device" now covers *editing* too — something a Photoshop-based workflow cannot claim. (BG removal is the one server round-trip; see §6 privacy note.)

---

## 3. Data model

A per-image `edit` recipe on `SessionImage` (`src/store/session.ts`). Absent/default recipe = no-op (existing images are unaffected).

```ts
// New — the non-destructive recipe. All slider values are −100..100, 0 = no change.
export interface ImageEdit {
  exposure: number       // brightness/exposure
  contrast: number
  temperature: number    // white balance: − cooler/blue … + warmer/amber
  saturation: number
  bgRemove: boolean       // one-click cutout requested
  // v1.1 candidates: tint (green↔magenta), crop {x,y,w,h,rotation}
}

export const DEFAULT_EDIT: ImageEdit = {
  exposure: 0, contrast: 0, temperature: 0, saturation: 0, bgRemove: false,
}

export interface SessionImage {
  // …existing: id, file, previewUrl, filename, folder?, seqIndex, viewLabel, viewConfidence
  edit?: ImageEdit             // absent ⇒ DEFAULT_EDIT
  cutoutUrl?: string           // cached object URL of the transparent PNG (derived, not the recipe)
}
```

- The **recipe** (`edit`) is the source of truth and is copyable value data.
- The **cutout** (`cutoutUrl` + underlying Blob) is *derived* content, cached per image. It is NOT copied between images (each image's cutout is unique to its pixels — see §5 apply-to-all semantics).

---

## 4. Store actions (`src/store/session.ts`)

```ts
updateImageEdit(imageId, patch: Partial<ImageEdit>)   // live slider updates
resetImageEdit(imageId)                               // back to DEFAULT_EDIT (+ clears cutout)
setImageCutout(imageId, blob | null)                  // cache/clear the transparent PNG
applyEditToAll(sourceImageId)                         // copy slider recipe (NOT bgRemove/cutout) to every session image
applyBgRemovalToAll()                                 // run background removal on every image (batch, §5)
```

`applyEditToAll` copies only the four slider values (exposure/contrast/temperature/saturation). Background removal is applied separately via `applyBgRemovalToAll` because it is an operation, not a value (§5).

---

## 5. Apply-to-all semantics (important)

Two distinct "apply to all" actions, because a slider value and a cutout are different kinds of thing:

| Action | What it does | Why |
|---|---|---|
| **Copy edit settings to all** | Copies the exposure/contrast/temp/saturation **values** to every image's recipe | A whole shoot under one lighting setup → white-balance once, apply to all. Pure value copy, instant. |
| **Remove background on all** | **Runs** the removal operation on every image, caching each image's own cutout | You cannot copy one image's mask onto another — each image has different content. This is a batched job (progress UI, §7). |

Scope selector on both: **This image · This cluster · Whole session** (default whole session). Cluster scope is a trivial filter of the same actions.

---

## 6. Rendering

### Preview (real-time, in the lightbox)
- Render the **medium-res** lightbox image through a **single WebGL fragment shader** that applies exposure → temperature (white balance) → contrast → saturation in one pass. This gives 60fps slider dragging even on large previews (a Canvas2D `getImageData` per-pixel loop janks while dragging — use it only as a fallback).
- If `bgRemove` is on and a `cutoutUrl` exists, preview the cutout on a neutral checkerboard/white backdrop.

### Export (full-res master, non-real-time)
Apply the recipe to the master inside `processImageOnCanvas()` (`image-processing.ts`), which already handles resize/crop/sharpen/compose. **Processing order:**

1. Load master (`file`).
2. If `edit.bgRemove` → use the cached cutout as the source (already wired via the existing `preRemovedBgBlob` param).
3. **Apply adjustments** (exposure/temp/contrast/saturation) — new step, same shader math as preview, offscreen WebGL or a one-pass canvas LUT.
4. Resize/crop to the marketplace spec (existing pica Lanczos3).
5. Unsharp (existing).
6. Composite onto `bgColor` if the marketplace wants a solid background, else keep transparency (existing).

Keeping the *same adjustment math* in preview and export guarantees WYSIWYG. `processImageOnCanvas` gains one new argument: `edit?: ImageEdit`.

---

## 7. UX in the lightbox

- Open image → lightbox shows it large (as today) with a slim **Edit** panel (right side or bottom sheet).
- Sliders: Exposure · Contrast · Temperature · Saturation. Each with a numeric readout and double-click-to-reset.
- **Remove background** toggle button (shows a spinner while the route runs; result cached as `cutoutUrl`).
- **Reset** (this image) and an **edited** badge on thumbnails that have a non-default recipe.
- **Apply to all** menu → *Copy edit settings* / *Remove background on all*, with scope (image/cluster/session). Batch removal shows per-image progress and is cancellable.
- Keyboard: arrow keys already move between images in the lightbox — keep that; edits persist per image as you navigate.

---

## 8. Persistence, performance, privacy

- **Persistence** — the `edit` recipe rides along with session state to `sessionStorage` + IndexedDB and the cross-device restore path (`/api/jobs/[jobId]/session`), like other cluster metadata. Recipes are tiny. **Cutout blobs** are large — cache in IndexedDB (parked-job store), re-derivable on demand; don't sync them to the cloud.
- **Performance** — preview on medium-res only; full-res adjustment runs once at export (already the heavy step). WebGL shader keeps dragging smooth. Batched BG removal is throttled (respect the route's rate limit) with progress.
- **Privacy** — adjustments are 100% on-device. Background removal is the one server call (`/api/remove-background`); note in-product that the cutout step sends that single image to the removal provider. Everything else honours "imagery stays on your device."

---

## 9. Non-goals & fast-follows

- **Spot/healing brush** — deferred. It's content-aware inpainting (real engineering); when wanted, do it as an AI-inpainting API call, not a hand-rolled brush.
- **Manual crop/straighten in the editor** — fast-follow (v1.1). Marketplace crop already happens at export; a manual override crop stores `{x,y,w,h,rotation}` in the recipe and slots into step 4 above.
- **Tint (green↔magenta)** — v1.1 slider, same shader.
- **Presets** — save a recipe as a named look (e.g. "AW26 on-model") and apply to future sessions. Natural monetisation/stickiness follow-on.

---

## 10. Phasing

- **Phase 1 — Adjustments:** recipe schema + store actions + WebGL preview shader + lightbox sliders + `processImageOnCanvas` adjustment step + "copy edit settings to all". *(No new backend.)*
- **Phase 2 — Background removal:** wire the lightbox one-click toggle to `/api/remove-background`, cache cutouts, "remove background on all" batch. *(Finishes the existing inert plumbing.)*
- **Phase 3 — Crop/straighten + presets** (fast-follows).

---

## 11. Decisions (resolved July 2026)

1. **Pricing gate — RESOLVED.** Adjustments (exposure/contrast/temp/saturation) are **free on every plan** — the acquisition hook. **Background removal is Growth+ and metered at $0.16 AUD/image.** The metered-billing plumbing **already exists and is Stripe-wired** — `/api/billing/bg-removal` records usage after export, `bg_removal_usage` table, `AUD_CENTS_PER_IMAGE = 16`, billed at period end; the terms page and Settings comparison already state "+$0.16/img" for Growth/Scale/Enterprise. So there is **no new billing work** — just point the lightbox toggle at it. See §12.
2. **Editor placement — RESOLVED: right-hand panel.** Coordinators work on laptops/desktops; a persistent right rail keeps sliders visible while the image stays large and lets you scrub between images without the panel collapsing. (A bottom sheet is a mobile pattern; not the primary surface here.)
3. **Removal provider — the real blocker (see §12).** BG removal was built before and **abandoned because quality wasn't good enough**, NOT because of billing. Relaunch requires **best-in-market** cutout quality. Current route supports PhotoRoom (preferred) + Replicate BRIA RMBG 2.0 (fallback); both are good but must be re-validated against the hardest apparel cases before shipping.
4. **Preview rendering — RESOLVED: WebGL, Canvas2D fallback.** WebGL fragment shader for real-time sliders (GPU, 60fps on large previews); reuse the same shader math at export for pixel-identical output; degrade to a Canvas2D LUT only if a GPU context fails.

---

## 12. Background-removal quality (the thing that actually gates Phase 2)

The billing, plan gating, provider integration, and usage table are **already built** (§11.1) — the only reason this stayed dormant is that the cutouts weren't good enough. So Phase 2 is a **quality problem, not an engineering problem.**

**Before relaunch, run a bake-off** on ShotSync's hardest real apparel cases — the ones that break cheap removers:
- on-model with **loose/flyaway hair** over fabric,
- **sheer / lace / mesh** garments (semi-transparent edges),
- **ghost-mannequin** interiors (neckline holes),
- fine straps, fringe, jewellery.

Candidate providers to test (route is env-swappable, so A/B is cheap): **PhotoRoom** (apparel-tuned), **Bria RMBG 2.0**, **remove.bg**, plus current premium options. Pick on *quality on the hard set first*, cost second.

**Pricing implication:** best-in-market removal costs more per call than the cheap models. Confirm the provider's per-image cost still leaves margin at **$0.16 AUD charged** — if the best provider is dearer, raise the metered rate (e.g. $0.20–0.30 AUD/img) rather than ship a worse cutout. Predictable-quantity option: bundle a small monthly removal quota into Growth/Scale + per-image overage, instead of pure metering.
