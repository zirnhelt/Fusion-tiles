# Fusion Tiles — Screenshot Guide for itch.io

itch.io displays up to **8 screenshots** in a horizontal carousel.
Minimum size: 640×480. Recommended: **1280×720** or **1920×1080**, 16:9 ratio.

Take screenshots at 1280×720 for a clean, crisp look.

---

## Shot 1 — "Clean Opening Board"

**What to capture:** A fresh game board right after the first few moves.
Board should show a healthy mix of element colors. Moves counter at 40.

**Why:** First impression. Shows the core game grid, color variety, and UI.

**Tips:**
- Make sure no tiles are highlighted/selected
- Ensure the score and high score are visible in the header
- Capture the full game area including the toolbar buttons

---

## Shot 2 — "The Match Moment"

**What to capture:** Immediately after matching 4 or 5 tiles in a row —
the "cascade in progress" state if possible, or mid-match with tiles lit up.

**Why:** Communicates the core mechanic instantly. This is the money shot.

**Tips:**
- Go for a 4-match or 5-match with vibrant colors (Fe orange, Kr teal, Ne pink)
- If the game shows any visual feedback on match, capture that frame
- The score should reflect a meaningful number (not 0)

---

## Shot 3 — "High Element Board"

**What to capture:** A later-game board showing heavy elements (element numbers 40+).
Tiles should be more varied in color and the score in the thousands.

**Why:** Shows depth and progression. Players see there's something to work toward.

**Tips:**
- Play for a few minutes until heavier elements like Mo, Ru, Pd appear
- Aim for a visually colorful board — lots of different tiles visible
- Moves counter can be lower (10–20) to show tension

---

## Shot 4 — "High Score Screen"

**What to capture:** The game-over state or the high score displayed in the header.

**Why:** Shows replayability and competitive angle.

**Tips:**
- Get your high score as high as possible before capturing
- A "New High Score!" moment if the game shows one is ideal

---

## Shot 5 — "Hint in Action"

**What to capture:** The Hint button active, with the suggested tile(s) highlighted.

**Why:** Shows the game is approachable. Good for casual audience.

**Tips:**
- Click the Hint button and immediately screenshot
- Make sure the highlighted tile is clearly visible

---

## Shot 6 — "Mobile / Narrow Layout" (optional but recommended)

**What to capture:** The game running at a narrower width (~390px wide, portrait),
to demonstrate the responsive layout.

**Why:** itch.io flags mobile-friendly games and it's a selling point.

**Tips:**
- Use browser DevTools to emulate a mobile viewport
- Capture at 390×844 (iPhone 14 dimensions)

---

## Post-Processing Checklist

- [ ] All screenshots at 1280×720 or larger
- [ ] No browser chrome visible (use fullscreen or crop it out)
- [ ] No placeholder/debug text visible in-game
- [ ] Score is non-zero in gameplay screenshots
- [ ] File format: PNG preferred, JPG acceptable
- [ ] File names: `screenshot-01-board.png`, `screenshot-02-match.png`, etc.

---

## Cover Image Note

`cover.svg` in this folder is the **630×500 itch.io cover art**.

Export it as PNG before uploading:
```bash
# Using Inkscape (CLI):
inkscape cover.svg --export-type=png --export-filename=cover.png -w 630 -h 500

# Using rsvg-convert:
rsvg-convert -w 630 -h 500 cover.svg -o cover.png

# Using Chrome headless:
google-chrome --headless --screenshot=cover.png --window-size=630,500 cover.svg
```

itch.io accepts the PNG directly as the cover/thumbnail image.
