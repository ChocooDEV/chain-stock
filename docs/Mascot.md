# Mascot — "Rally"

Companion to [Design.md](Design.md) (design system) and [App.md](App.md) (product spec). This doc is the standalone source of truth for the mascot character — description, usage rules, and image-generation prompts — so it can be handed to anyone (or any tool) generating assets without needing the rest of the design system as context.

## Concept

**Name (proposed): Rally** — a stock-market term for a sustained price increase (good news, optimism, momentum), and it also carries the "pep rally" sense of celebration, which fits the gifting/confetti framing. Easy to swap if it doesn't land — nothing else here depends on the specific name.

**Form: a small, round, chubby bull.** The bull is the one piece of stock-market iconography that's already about optimism and gain rather than intimidation — softened into a toy-like character (the way Claynosaurz turned dinosaurs into something giftable, or Sanctum's Albus turned a savings app into something warm) it becomes something you'd want to send a friend, not corporate clip art.

**Personality:** warm, encouraging, a little mischievous, genuinely excited for the person receiving a gift — closer to a good friend celebrating with you than a brand ambassador. Confident but never smug; this is a character for a product that hands people real money, so its warmth has to read as sincere, not silly.

## Physical design

- **Material/texture:** stop-motion claymation style — soft matte clay with visible fingerprint and tool-mark imperfections, like a handmade puppet (Aardman-style), not a smooth 3D render or flat vector. This is the single most important visual trait — it's what ties the mascot to the Claynosaurz reference and to the "tactile, dimensional" direction in Design.md.
- **Proportions:** chibi — big rounded head, small stubby body, short legs, stands upright on two legs. Approachable and toy-like, not anatomically realistic.
- **Color (drawn directly from Design.md's core palette, so the mascot never introduces off-system colors):**
  - Body: warm terracotta clay, a softened/matte version of Confetti Coral (`#E8735F`)
  - Belly & muzzle: soft cream (`#FBF4EC`, the Cloud tone)
  - Horns: short and stubby, tipped in Confetti Gold (`#F4B740`)
  - Eyes: large, round, warm — Ink (`#211B1D`)
  - Cheeks: a few small freckles in Confetti Teal (`#00A896`)
- **Signature accessory:** a torn strip of paper ticker-tape worn as a scarf around the neck, printed with tiny stock ticker symbols in Ink — the one detail that ties the character specifically to *this* product rather than being a generic mascot bull. Should appear in every pose.

## Where Rally appears (and doesn't)

Reserved for emotional beats, not constant chrome — same discipline as Phantom's ghost or Sanctum's Albus, which show up at specific moments rather than decorating every screen:
- The claim/unwrap success moment (the app's one big animation, per Design.md)
- Onboarding / first-time welcome
- Empty states (e.g. "no gifts yet")
- Claim confirmation ("you've received...")

Not on data-dense screens (gift history table, portfolio numbers) — those stay clean and legible per Design.md's "numbers are sacred" principle.

## Pose library needed for v1

1. **Reference sheet / turnaround** — neutral standing pose, front/3-4/side views. Generate this first; it's the canonical look everything else must match.
2. **Celebrating** — arms up, mid-jump, confetti burst of tiny ticker-tape pieces. Used for the unwrap moment.
3. **Waving** — friendly greeting pose. Used for onboarding/welcome.
4. **Resting** — curled up, sleepy, calm. Used for empty states.
5. **Thumbs up** — confident, proud. Used for claim confirmation.
6. **Lost/confused** — puzzled, looking around. Used for the 404 page.

## Image-generation prompts (ChatGPT)

Written as plain conversational prompts for ChatGPT's image generation (GPT-image), not Midjourney-style keyword strings — that's what GPT-image responds best to.

**Consistency workflow:** GPT-image will drift in character design across separate, unrelated generations. To keep Rally consistent:
1. Generate prompt #1 (the reference sheet) first, in a fresh chat.
2. Stay in that **same chat thread** for every other pose — don't start a new conversation per pose. Reply with the next prompt, explicitly saying "using the same character from the image above" (already built into the prompts below).
3. If you ever need to pick this up in a new chat later, upload the saved reference-sheet image as an attachment first, then ask for the new pose referencing it, e.g.: "Here's Rally, our mascot [attach image]. Generate this same character in a waving pose: ..."
4. If a generated pose drifts (wrong color, texture goes smooth/3D instead of claymation, etc.), regenerate in-thread and explicitly call out what to fix rather than starting over from text alone.

**1. Reference sheet (generate first, new chat):**
> A stop-motion claymation character: a small, round, chubby bull mascot named Rally, about the size of a plush toy. Soft matte clay texture with visible fingerprint and tool-mark imperfections, like a handmade Aardman-style puppet — not a smooth 3D render. Warm terracotta-orange clay body, soft cream belly and muzzle, short stubby horns tipped in gold, large warm dark round eyes with a gentle optimistic expression, a few small teal freckles on the cheeks. Wearing a torn strip of paper ticker-tape as a scarf around its neck, printed with tiny stock ticker symbols in dark ink. Chibi proportions: big rounded head, small stubby body, short legs, standing upright on two legs, arms at sides, neutral friendly expression. Character turnaround sheet showing front view, 3/4 view, and side view. Soft studio lighting with a warm rim light, plain light cream background, shallow depth of field, high detail on the clay texture, centered composition.

**2. Celebrating (unwrap moment) — reply in the same thread:**
> Using the same character from the image above, generate Rally in a joyful celebration pose: arms thrown up, mouth open in a happy cheer, one leg kicked up mid-jump, surrounded by a burst of confetti made of tiny torn ticker-tape paper strips in coral, gold, and teal. Slight motion blur on the confetti suggesting a joyful explosion. Keep the exact same claymation texture, colors, proportions, and plain light cream background as the reference image.

**3. Waving (onboarding) — reply in the same thread:**
> Using the same character from the image above, generate Rally in a friendly waving pose: one arm raised in a warm greeting wave, leaning slightly forward, welcoming smile. Keep the exact same claymation texture, colors, proportions, and plain light cream background as the reference image.

**4. Resting (empty state) — reply in the same thread:**
> Using the same character from the image above, generate Rally lying down curled up sleepily, eyes half-closed, resting against a small pile of folded ticker-tape paper like a blanket, calm and content expression. Keep the exact same claymation texture, colors, proportions, and plain light cream background as the reference image.

**5. Thumbs up (claim confirmation) — reply in the same thread:**
> Using the same character from the image above, generate Rally standing confidently with both thumbs up, a proud closed-eye happy smile, a couple of small sparkle details near the horns. Keep the exact same claymation texture, colors, proportions, and plain light cream background as the reference image.

**6. Lost/confused (404 page) — reply in the same thread:**
> Using the same character from the image above, generate Rally in a puzzled, lost pose: head tilted, one eyebrow-equivalent furrow of confusion, scratching the top of its head with one hand, the other hand holding up a small torn strip of ticker-tape like a map — turned sideways as if trying to read it the wrong way. A tiny question-mark shape optionally visible nearby, folded from a scrap of ticker-tape rather than drawn as a graphic symbol. Still warm and a little mischievous, not sad or distressed — this is "cheerfully lost," like a friend who took a wrong turn, not a character in distress. Keep the exact same claymation texture, colors, proportions, and plain light cream background as the reference image.

## Logo lockup

Two separate assets, not one — a fully-integrated logotype is the most distinctive option but the least flexible (can't reuse "ChainStock" as plain text without redrawing it), so pair it with a plain, safe fallback for tight spaces.

**Concept (decided):** the "S" that starts "Stock" in "ChainStock" is redesigned as a dollar sign, in the wordmark's own color and weight — a wordmark trick that works even without Rally — and Rally leans against its crossbar. Chosen over "Rally perched on the S like a hill" and "Rally peeking from behind the S" for being the most legible at small sizes, since the letterform trick alone carries the recognition even before Rally's pose registers.

**7. Header logotype (generate in the same thread as the reference sheet):**
> Using the same character from the image above, create a logo lockup for "ChainStock". The wordmark "ChainStock" is set in a bold, rounded, friendly sans-serif display typeface. The "S" at the start of "Stock" is redesigned as a dollar sign ($), in the same coral color and bold rounded weight as the rest of the wordmark. Rally leans casually against the vertical crossbar of the dollar sign, one arm resting on it, front-facing, warm confident smile. Keep the exact same claymation texture, terracotta body, cream belly, gold horn tips, teal cheek freckles, and ticker-tape scarf as the reference image. Plain light cream background. Horizontal lockup: Rally on the left, wordmark to the right, vertically balanced. Clean, readable composition suitable for a website header.

**8. Compact icon + wordmark (safe fallback for small sizes) — reply in the same thread:**
> Using the same character from the image above, create a simpler, compact logo lockup for "ChainStock": a small rounded badge containing just Rally's face and head, cropped at the shoulders, front-facing, friendly smile, same claymation texture and colors as the reference image. Position it to the left of the plain wordmark "ChainStock" set in a bold rounded sans-serif display typeface — no letterform modifications this time. Plain light cream background. Compact horizontal lockup, designed to stay legible at small sizes (browser tab, nav bar).

The icon crop from #7 can likely double as a favicon later without a separate generation pass.

**9. Ticker-tape texture strip (for the reusable `TickerStrip` UI component) — reply in the same thread:**
> Using the same ticker-tape paper material as Rally's scarf in the reference image above, generate a close-up flat-lay photograph of a single blank strip of that paper: aged cream/kraft tone, visible paper grain and fiber texture, unprinted (no text or symbols on it — leave it blank, we'll add our own text separately), with organic, ragged torn edges on both the left and right short ends (genuinely torn, not cut straight or perforated, with small fiber wisps at the tears). Lying flat and mostly straight with just a slight natural curl. Wide, short rectangular strip, roughly a 6:1 width-to-height ratio. Soft studio lighting, a subtle drop shadow beneath it, plain light cream background, straight-on composition, high detail on the paper texture.

Unlike the pose/logo assets, this one stays deliberately blank — `TickerStrip` renders live, variable-length stock symbols in the app's own ticker font on top of it, so the texture can't have baked-in text. Process it through the same background-removal + bbox-crop pipeline below, then use it as a stretched CSS `background-image` (`background-size: 100% 100%`) behind the component's text instead of the current flat `bg-cloud` + symmetric `clip-path` polygon — the image's own alpha-channel edges become the torn silhouette, no clip-path needed. Stretching a width this organic is unlikely to read as distorted; if a component instance ever ends up much wider or narrower than the source strip's aspect ratio and the stretch looks wrong, revisit with a 9-slice (separate left/right torn-edge caps + a tileable middle texture) instead of a single stretched image.

## Background removal

All generated poses/logos come back from ChatGPT with an opaque cream background (matching the reference-sheet prompt's "plain light cream background" instruction) — fine for reviewing in isolation, but it shows as a visible mismatched rectangle when placed on the app's actual Cloud-colored background. Every file in `public/mascot/` has had its background stripped to real alpha transparency.

**Method:** AI-based segmentation (`rembg`, Python), not a color-key/chroma-key removal. This matters specifically because Rally's own belly/muzzle color is close to the old cream background — a naive "remove pixels near this background color" approach would have punched holes in him. `rembg` separates subject from background semantically instead of by color, so it correctly preserves both the belly/muzzle and non-body props (e.g. the ticker-tape "blanket" in the resting pose) while still fully removing the background.

**Also crop to content bounds after removing the background.** ChatGPT's canvas leaves substantial transparent padding around the actual character (10–25% per side was typical across these assets) — harmless for background removal itself, but it silently breaks two things downstream: CSS size classes render the character smaller than intended (the padding counts toward the box), and percentage-based positioning of decorative elements (e.g. a spark cluster placed "near Rally's hand") is computed against the padded canvas instead of the visible content, landing in the wrong place. Crop to the bounding box with a small buffer so both problems disappear at the source.

**If regenerating a pose later**, re-run it through the same process before adding it to `public/mascot/`:
```bash
pip install rembg onnxruntime pillow
python -c "
from rembg import remove
from PIL import Image
import io
data = remove(open('in.png','rb').read())
img = Image.open(io.BytesIO(data))
pad = 16
l,t,r,b = img.getbbox()
w,h = img.size
img.crop((max(0,l-pad), max(0,t-pad), min(w,r+pad), min(h,b+pad))).save('out.png')
"
```

## Assets

Located under `public/mascot/` so they're served directly at `/mascot/...` at runtime, same convention as the fonts (see Fonts.md). File naming: `rally-<pose>.png`, matching the pose names above.

| File | Pose | Status |
|---|---|---|
| `public/mascot/rally-reference-sheet.png` | Reference sheet (front/3-4/side turnaround) | ✅ Generated |
| `public/mascot/rally-celebrating.png` | Celebrating (unwrap moment) | ✅ Generated |
| `public/mascot/rally-waving.png` | Waving (onboarding) | ✅ Generated |
| `public/mascot/rally-resting.png` | Resting (empty state) | ✅ Generated |
| `public/mascot/rally-thumbs-up.png` | Thumbs up (claim confirmation) | ✅ Generated |
| `public/mascot/rally-404.png` | Lost/confused (404 page) | ✅ Generated |
| `public/mascot/logo-header.png` | Header logotype ($-as-S, Rally leaning) | ✅ Generated |
| `public/mascot/logo-compact.png` | Compact icon + wordmark (small sizes / favicon) | ✅ Generated |
| `public/textures/ticker-tape.png` | Blank torn ticker-tape strip (`TickerStrip` UI texture) | ✅ Generated |

All five poses from the v1 pose library are generated. Next: review each against the reference sheet for consistency (texture, color, proportions) before treating them as final production assets.

## Open questions

- Name ("Rally") and species (bull) are both proposals — easy to change without touching anything else in this doc's structure.
- Whether to commission/hand-illustrate instead of using generative image tools for the final production asset, once a direction is validated here.
