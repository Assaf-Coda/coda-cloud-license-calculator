# Coda Video Cloud License Calculator

Web tool for sales engineers and partners. Enter one camera's recording settings and get the
Coda Video Cloud camera license (DC3VC-1C-30C, -60C, -90C, and the upcoming -7C) that covers
its storage.

## How it works

Each license is sized for one camera at 1 Mbit/s average bitrate, recording 24/7, for the
license retention (30, 60 or 90 days). The calculator:

1. Estimates average bitrate from resolution, frame rate, video format and quality using the
   same polynomial as the Coda Video Server Calculator
   (`portal.octavesecurity.com/apps/hxgn-dc3-video-calculator/`). Custom quality lets the user
   type a bitrate instead.
2. Computes storage as bitrate x activity hours per day x retention days.
3. Recommends the smallest license whose quota covers that storage and whose retention is at
   least the requested retention.
4. If nothing fits, states how many days a DC3VC-1C-90C supports at these settings, the maximum
   bitrate that would fit, and the highest frame rate per quality that fits.

Units follow the server calculator: 1 Mbit/s = 1024 kbit/s, GB = 1024^3 bytes.

## Run

The page loads its data files with `fetch()`, so it needs an HTTP server. Any static host works.
Locally:

    python3 -m http.server 8090

then open http://localhost:8090/.

## Test

    node tests/calc.test.mjs

## Files

- `index.html`, `css/style.css`, `js/app.js` - UI.
- `js/calc.js` - pure calculation functions, no DOM.
- `data/resolutions.json` - verbatim copy of the server calculator API
  (`server/index.php?action=resolutions`).
- `data/codecs.json` - H.264 bitrate polynomial coefficients from the server calculator;
  H.265 = H.264 x 0.75, as in the source.
- `data/licenses.json` - license tiers. Edit here to add or rename SKUs or mark the 7-day tier
  as orderable (`"available": true`).

## Not included

Camera counts and totals, server sizing, MPEG4 and MJPEG, export or save. Add on request.
