# Checkpoint landing — illustrations

Image briefs for [checkpoint-landing.md](checkpoint-landing.md). Copy a prompt block
whole into ChatGPT. Attach `src/assets/images/landing/gdhub-hero-image.png` as a style
reference and add *"match the style of the attached image"* — the existing set is one
visual family and a new picture only works if it joins it.

## The family

The landing images already in the repo (`gdhub-hero-image`, `gdhub-talent-pool`,
`gdhub-specialist-image`) share one look: 3D claymation, soft matte plastic, rounded
characters with simple faces, key light from the upper left, and a palette of exactly
three colours — red-orange `#F15541`, off-white `#FFFDFC`, charcoal `#272624`.

Three rules for the new set, and the last one is the one that breaks pictures:

- **Transparent background.** The old ones are baked onto black; these sit on whatever
  section they land in.
- **Reserved space.** The hero and the social card leave an empty area for the overlay
  that goes on top of them.
- **Few large shapes, and no charcoal on the outer edge.** These sit on a near-black
  page. Detail turns into noise at the size they are shown, and a charcoal silhouette
  disappears against `#0A0A0A` entirely — so the outline has to be carried by the
  red-orange and the off-white, with charcoal used only for detail inside a shape. Every
  prompt below says this; do not drop it when editing one.

If ChatGPT returns an image with a background anyway, send it as it is — the background
comes off in GIMP.

## Where each one goes

| File | Placement | Canvas size | Notes |
|---|---|---|---|
| `gdhub-checkpoint-hero.png` | Hero, replacing the card chain in `gtTBo` | 1024 × 1024 | A scrim and the stats block go over the bottom third, the way the platform landing does it. The goal-card → verdict → workflow chain moves out of the hero into its own section underneath. |
| `gdhub-checkpoint-problem.png` | `Section — Problem`, right of the heading | 1024 × 1024, ~480 in layout | |
| `gdhub-checkpoint-start.png` | `Section — How to start`, right of the heading | 1024 × 1024, ~420 in layout | The page's closing note. |
| `gdhub-checkpoint-og.png` | Social card for `/checkpoint` | 1200 × 630 | Not on the page. |
| `gdhub-checkpoint-signals.png` | `Section — Signals` — **optional** | 1024 × 1024 | Only if the pulse board reads dry. It probably does not. |

All of them live in `src/assets/images/landing/`.

---

## 1 · Hero

The team is running, the destination is in sight, and the ground behind them is on fire.

Two earlier versions failed and the reasons are worth keeping. The first sat them at a
desk — no movement, no date. The second added a fourth character as the one pushing them
and dressed everybody, the lava and the flag in the same saturated red: the curator read
as a fourth teammate lagging at the back, and the whole frame merged into one red mass.
So: **three runners, no fourth person, and the saturated red belongs to the lava and the
destination only.** What pushes them is the lava wall behind — a shape, not a person, and
the curator is already all over the rest of the page.

```
Create a 3D claymation-style illustration.

Size: square 1:1, 1024 × 1024 pixels. PNG with a transparent background (alpha channel).

Count: exactly three characters and one destination. Add nothing else.

Scene: three rounded clay characters run from left to right across a broken path of
floating rock platforms, caught mid-stride with bodies leaning forward. They are
staggered in depth rather than lined up: the nearest runner is large and low in the
frame, the second smaller and higher, the third smallest and furthest back. One carries
a laptop, one a drawing tablet, one a small game controller.

Ahead of them on the right stands the destination: a tall glowing gate of light, about
twice the height of a runner, a standing ring or pillar on its own platform with a small
flag at the top. It is the largest and brightest object in the picture and it is
unmistakably what they are running toward.

Behind the last runner a wall of glowing lava rises and chases them, and lava fills the
gaps between the platforms below. The lava enters from the bottom edge of the frame and
is cropped by it.

Colour separation — this matters more than anything else in the brief: the runners wear
off-white and charcoal clothing with only small warm accents, so they read as clean solid
silhouettes. The saturated red-orange #F15541 is reserved for the lava and for the
destination gate, the two things the eye must find first. The characters must not be the
same colour as the lava.

Style: soft matte plastic materials, rounded stylized characters with simple friendly
faces and no fine detail, side view with a slight three-quarter turn, gentle studio key
light from the upper left, a clear sense of forward motion.

Palette: red-orange #F15541, off-white #FFFDFC, charcoal #272624. No other hues.

Background: fully transparent. No background colour, no black fill, no gradient, no sky,
no horizon, no wall, no floor plane and no cast shadow on a ground plane — only the
objects themselves on transparency, with soft self-shadowing.

Legibility: this is shown small on a near-black page. Large simple shapes only. No
floating rock debris, no small chips, no pebbles, no sparks, no embers, no smoke, no
dust, no speed lines, no fine texture. Never run charcoal along an outer edge — it
disappears against the dark page.

Composition: the runners cross the middle band of the frame, the gate stands at the
right, the lava occupies the bottom and fades off the bottom edge. Keep the bottom
quarter simple — an overlay goes there.

Do not include: text, letters, numbers, logos, watermarks, readable user interface, or
realistic photographic detail.
```

## 2 · Problem

```
Create a 3D claymation-style illustration.

Size: square 1:1, 1024 × 1024 pixels. PNG with a transparent background (alpha channel).

Scene: one rounded clay character in a red hoodie sits alone on a small chunk of broken
ground, shoulders low, chin resting on one hand, a switched-off laptop closed beside
them. Three empty office chairs drift away around them, tilted at different angles. A
small red toy rocket lies on its side, unlit. The mood is quiet and still — not comic,
not grim.

Style: soft matte plastic materials, rounded stylized character with a simple face and no
fine detail, three-quarter view, gentle studio key light from the upper left.

Palette: strictly limited — warm red-orange #F15541 as the only saturated colour, plus
off-white #FFFDFC and charcoal #272624. No other hues.

Background: fully transparent. Render no background colour, no black fill, no gradient,
no floor plane, no wall and no cast shadow on a ground plane — only the objects
themselves on transparency, with soft self-shadowing on the objects.

Legibility: this sits on a near-black page. Use a small number of large, simple shapes.
No particle spray, no sparks, no smoke, no dust, no thin lines, no fine texture. Carry
the outer silhouette of every object in red-orange and off-white; use charcoal only for
detail inside a shape and never along an outer edge, because charcoal vanishes against a
dark page.

Composition: the seated character is centred; the drifting chairs recede toward the edges
with generous empty space around everything.

Do not include: any text, letters, numbers, logos, watermarks, readable user interface,
or realistic photographic detail.
```

## 3 · How to start

```
Create a 3D claymation-style illustration.

Size: square 1:1, 1024 × 1024 pixels. PNG with a transparent background (alpha channel).

Scene: one rounded clay character in a red hoodie stands on top of a short stack of three
glossy discs and plants a red flag on a pole into the top disc. The discs are off-white
with a thick glowing red rim, stacked like save points. A small rocket floats beside the
stack, nose pointing up and slightly away.

Style: soft matte plastic materials, rounded stylized character with a simple friendly
face and no fine detail, three-quarter view, gentle studio key light from the upper left.

Palette: strictly limited — warm red-orange #F15541 as the only saturated colour, plus
off-white #FFFDFC and charcoal #272624. No other hues.

Background: fully transparent. Render no background colour, no black fill, no gradient,
no floor plane, no wall and no cast shadow on a ground plane — only the objects
themselves on transparency, with soft self-shadowing on the objects.

Legibility: this sits on a near-black page. Use a small number of large, simple shapes.
No particle spray, no sparks, no smoke, no dust, no thin lines, no fine texture. Carry
the outer silhouette of every object in red-orange and off-white; use charcoal only for
detail inside a shape and never along an outer edge, because charcoal vanishes against a
dark page.

Composition: the stack and the figure are centred and vertical, with even empty margins
on all four sides.

Do not include: any text, letters, numbers, logos, watermarks, readable user interface,
or realistic photographic detail.
```

## 4 · Social card

The hero scene recomposed wide — running left to right suits a landscape frame, and it is
seen small, so the hazard count drops again.

```
Create a 3D claymation-style illustration in a wide landscape format.

Size: landscape, 1200 × 630 pixels. PNG with a transparent background (alpha channel).

Count: exactly three characters and one destination. Add nothing else.

Scene: three rounded clay characters run from left to right across a broken path of
floating rock platforms, caught mid-stride with bodies leaning forward, staggered in
depth rather than lined up. One carries a laptop, one a drawing tablet, one a small game
controller. On the right stands the destination: a tall glowing gate of light, about
twice the height of a runner, with a small flag at the top — the largest and brightest
object in the frame. Lava fills the gaps between the platforms below and rises behind the
last runner, entering from the bottom edge and cropped by it.

Colour separation — the most important instruction here: the runners wear off-white and
charcoal with only small warm accents and read as clean solid silhouettes. The saturated
red-orange #F15541 belongs to the lava and the gate only. The characters must not be the
same colour as the lava.

Style: soft matte plastic materials, rounded stylized characters with simple friendly
faces and no fine detail, side view with a slight three-quarter turn, gentle studio key
light from the upper left, a clear sense of forward motion.

Palette: red-orange #F15541, off-white #FFFDFC, charcoal #272624. No other hues.

Background: fully transparent. No background colour, no black fill, no gradient, no sky,
no horizon, no floor plane and no cast shadow on a ground plane — only the objects
themselves on transparency.

Legibility: seen small on a near-black card. Large simple shapes only. No floating rock
debris, no chips, no pebbles, no sparks, no embers, no smoke, no dust, no speed lines, no
fine texture. Never run charcoal along an outer edge.

Composition: wide landscape, the runners sitting low in the frame with a generous empty
transparent margin along the top edge for a headline.

Do not include: text, letters, numbers, logos, watermarks, readable user interface, or
realistic photographic detail.
```

## 5 · Signals (optional)

```
Create a 3D claymation-style illustration.

Size: square 1:1, 1024 × 1024 pixels. PNG with a transparent background (alpha channel).

Scene: four rounded clay portrait tiles float in a horizontal row, each showing a simple
character bust inside a thick rounded red frame. The first three tiles are lit warmly and
each carries a small round red badge in the corner. The fourth tile is dimmed and carries
a small pale badge. One soft glowing red heartbeat line runs horizontally behind all four
tiles as a single thick stroke.

Style: soft matte plastic materials, rounded stylized characters with simple faces and no
fine detail, straight-on view with slight perspective, gentle studio key light from the
upper left.

Palette: strictly limited — warm red-orange #F15541 as the only saturated colour, plus
off-white #FFFDFC and charcoal #272624. No other hues.

Background: fully transparent. Render no background colour, no black fill, no gradient,
no floor plane, no wall and no cast shadow on a ground plane — only the objects
themselves on transparency, with soft self-shadowing on the objects.

Legibility: this sits on a near-black page. Use a small number of large, simple shapes.
No particle spray, no sparks, no smoke, no thin lines, no fine texture. Carry the outer
silhouette of every object in red-orange and off-white; use charcoal only for detail
inside a shape and never along an outer edge, because charcoal vanishes against a dark
page.

Composition: the four tiles are evenly spaced and centred, with empty transparent margins
above and below.

Do not include: any text, letters, numbers, logos, watermarks, readable user interface,
or realistic photographic detail.
```
