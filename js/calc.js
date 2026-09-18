// Pure calculation functions. No DOM. Mirrors the Coda Video Server Calculator math.

const KBPS_PER_MBPS = 1024;          // source calculator uses binary units
const LICENSE_KBPS = 1024;           // license sized for 1 Mbps average
const LICENSE_HOURS = 24;            // 24/7

// Average bitrate in kbit/s for a resolution, fps, quality and codec.
export function bitrateKbps(codecs, codec, resX, resY, fps, quality, customKbps) {
  if (quality === "Custom") return Math.max(0, Math.round(Number(customKbps) || 0));
  const def = codecs[codec];
  const base = def.base ? codecs[def.base] : def;
  const factor = def.factor ?? 1;
  const v = base[quality];
  const mpx = (resX * resY) / 1e6;
  let kbps;
  if (quality === "Low") {
    kbps = mpx * (v.v1 * fps ** 3 + v.v2 * fps ** 2 + v.v3 * fps + v.v4);
  } else if (quality === "High") {
    kbps = mpx * (v.v1 * fps ** 4 + v.v2 * fps ** 3 + v.v3 * fps ** 2 + v.v4 * fps + v.v5);
  } else {
    // Medium: source formula subtracts the v3 term
    kbps = mpx * (v.v1 * fps ** 4 + v.v2 * fps ** 3 - v.v3 * fps ** 2 + v.v4 * fps + v.v5);
  }
  kbps = Math.round(kbps);
  return factor === 1 ? kbps : Math.round(kbps * factor);
}

export function kbpsToMbps(kbps) {
  return kbps / KBPS_PER_MBPS;
}

// Storage in GB (binary), same formula as the server calculator.
export function storageGB(kbps, hoursPerDay, days) {
  return (kbps / 1024 / 8) * 3600 * hoursPerDay * days / 1024;
}

// "Load" in kbps-hours: linear proxy for storage, avoids unit noise.
function load(kbps, hoursPerDay, days) {
  return kbps * hoursPerDay * days;
}

export function licenseQuotaGB(days) {
  return storageGB(LICENSE_KBPS, LICENSE_HOURS, days);
}

// Per-tier evaluation. A tier fits when its 1 Mbps x 24/7 quota covers the storage
// and the tier retention covers the requested retention.
export function evaluateTiers(licenses, kbps, hoursPerDay, retentionDays) {
  const need = load(kbps, hoursPerDay, retentionDays);
  return licenses.map((lic) => {
    const quota = load(LICENSE_KBPS, LICENSE_HOURS, lic.days);
    return {
      ...lic,
      quotaGB: licenseQuotaGB(lic.days),
      utilisation: quota ? need / quota : 0,
      fits: need <= quota && lic.days >= retentionDays,
    };
  });
}

// Smallest tier that fits, or null.
export function pickLicense(licenses, kbps, hoursPerDay, retentionDays) {
  return evaluateTiers(licenses, kbps, hoursPerDay, retentionDays)
    .filter((t) => t.fits)
    .sort((a, b) => a.days - b.days)[0] ?? null;
}

// How many days of retention a tier supports at this bitrate and activity.
export function daysSupported(tierDays, kbps, hoursPerDay) {
  if (!kbps || !hoursPerDay) return Infinity;
  return Math.floor(load(LICENSE_KBPS, LICENSE_HOURS, tierDays) / (kbps * hoursPerDay));
}

// Max average bitrate (kbps) that still fits a tier for given activity and retention.
export function maxKbpsForTier(tierDays, hoursPerDay, retentionDays) {
  return Math.floor(load(LICENSE_KBPS, LICENSE_HOURS, tierDays) / (hoursPerDay * retentionDays));
}

// For each quality, the highest fps (1..maxFps) that fits the tier at this resolution/codec.
export function fixHints(codecs, codec, resX, resY, tierDays, hoursPerDay, retentionDays, maxFps = 30) {
  const limit = maxKbpsForTier(tierDays, hoursPerDay, retentionDays);
  return ["Low", "Medium", "High"].map((quality) => {
    let best = null;
    for (let fps = 1; fps <= maxFps; fps++) {
      const k = bitrateKbps(codecs, codec, resX, resY, fps, quality);
      if (k <= limit) best = { fps, kbps: k };
    }
    return { quality, ...(best ?? { fps: 0, kbps: 0 }) };
  });
}
