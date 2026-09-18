import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bitrateKbps, storageGB, pickLicense, daysSupported, evaluateTiers, fixHints, maxKbpsForTier } from "../js/calc.js";

const codecs = JSON.parse(readFileSync(new URL("../data/codecs.json", import.meta.url)));
const licenses = JSON.parse(readFileSync(new URL("../data/licenses.json", import.meta.url)));

// bitrate matches the server calculator polynomial
assert.equal(bitrateKbps(codecs, "H.264", 1920, 1080, 15, "Medium"), 2587);
assert.equal(bitrateKbps(codecs, "H.264", 1280, 720, 10, "Low"), 562);
assert.equal(bitrateKbps(codecs, "H.264", 1920, 1080, 25, "High"), 9301);
assert.equal(bitrateKbps(codecs, "H.265", 1920, 1080, 15, "Medium"), Math.round(2587 * 0.75));
assert.equal(bitrateKbps(codecs, "H.264", 1920, 1080, 15, "Custom", 777), 777);

// storage: 1 Mbps 24/7 for 30 days = 316.4 GB
assert.ok(Math.abs(storageGB(1024, 24, 30) - 316.406) < 0.01);

// license picks
assert.equal(pickLicense(licenses, 562, 24, 30).sku, "DC3VC-1C-30C");
assert.equal(pickLicense(licenses, 300, 24, 60).sku, "DC3VC-1C-60C");   // retention drives tier
assert.equal(pickLicense(licenses, 2587, 24, 30).sku, "DC3VC-1C-90C");   // 1080p/15/Medium 30 d rides on 90C quota
assert.equal(pickLicense(licenses, 4000, 24, 30), null);                  // 3.9 Mbps exceeds all
assert.equal(pickLicense(licenses, 2587, 8, 30).sku, "DC3VC-1C-30C");    // 8 h/day fits 30C
assert.equal(pickLicense(licenses, 1024, 24, 90).sku, "DC3VC-1C-90C");   // exactly on quota

// over 90C: how many days does 90C hold at 2587 kbps 24/7 -> floor(1024*24*90/(2587*24)) = 35
assert.equal(daysSupported(90, 2587, 24), 35);

// tier table
const tiers = evaluateTiers(licenses, 1024, 24, 30);
assert.deepEqual(tiers.map((t) => t.fits), [false, true, true, true]);
assert.ok(Math.abs(tiers[1].utilisation - 1) < 1e-9);

// hints: max kbps for 90C at 24h/30d = 3072; 1080p H.264 Medium fps that fits
assert.equal(maxKbpsForTier(90, 24, 30), 3072);
const hints = fixHints(codecs, "H.264", 1920, 1080, 90, 24, 30);
assert.equal(hints[1].quality, "Medium");
assert.ok(hints[1].fps >= 15 && hints[1].kbps <= 3072);
assert.ok(bitrateKbps(codecs, "H.264", 1920, 1080, hints[1].fps + 1, "Medium") > 3072);

console.log("all calc tests passed");
