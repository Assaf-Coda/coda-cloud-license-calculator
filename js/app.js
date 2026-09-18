import {
  bitrateKbps, kbpsToMbps, storageGB, evaluateTiers, pickLicense,
  daysSupported, maxKbpsForTier, fixHints,
} from "./calc.js";

const $ = (id) => document.getElementById(id);

const [resolutions, codecs, licenses] = await Promise.all(
  ["data/resolutions.json", "data/codecs.json", "data/licenses.json"].map((u) => fetch(u).then((r) => r.json())),
);
const TOP_TIER = licenses.reduce((a, b) => (b.days > a.days ? b : a));

function fill(select, items, selected) {
  select.innerHTML = items.map(({ value, label }) =>
    `<option value="${value}"${String(value) === String(selected) ? " selected" : ""}>${label}</option>`).join("");
}

fill($("resolution"), resolutions.map((r) => ({ value: r.id, label: r.label })), "1920x1080");
fill($("fps"), Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: i + 1 })), 15);
fill($("retention"), licenses.map((l) => ({ value: l.days, label: `${l.days} days${l.available ? "" : " (coming soon)"}` })), 30);

const fmt = (n, d = 1) => n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtGB = (gb) => gb >= 1000 ? `${fmt(gb / 1024, 2)} TB` : `${fmt(gb)} GB`;

function read() {
  const res = resolutions.find((r) => r.id === $("resolution").value);
  return {
    resX: Number(res.resX), resY: Number(res.resY),
    fps: Number($("fps").value),
    codec: $("codec").value,
    quality: $("quality").value,
    customKbps: Number($("customKbps").value),
    hours: Math.min(24, Math.max(1, Number($("hours").value) || 24)),
    retention: Number($("retention").value),
  };
}

function render() {
  const s = read();
  $("customWrap").classList.toggle("hidden", s.quality !== "Custom");

  const kbps = bitrateKbps(codecs, s.codec, s.resX, s.resY, s.fps, s.quality, s.customKbps);
  const gb = storageGB(kbps, s.hours, s.retention);
  const tiers = evaluateTiers(licenses, kbps, s.hours, s.retention);
  const pick = pickLicense(licenses, kbps, s.hours, s.retention);

  $("bitrate").innerHTML = `${fmt(kbpsToMbps(kbps), 2)} Mbit/s <small>${kbps.toLocaleString()} kbit/s</small>`;
  $("storage").innerHTML = `${fmtGB(gb)} <small>${s.hours} h/day x ${s.retention} d</small>`;
  $("equivDays").innerHTML = `${fmt(kbps * s.hours * s.retention / (1024 * 24))} days`;

  const rec = $("recommend");
  rec.classList.toggle("none", !pick);
  $("sku").textContent = pick ? pick.sku : "None";
  $("skuNote").textContent = pick
    ? (pick.available ? `${pick.days}-day license, ${fmt(pick.utilisation * 100, 0)}% of quota used` : `${pick.days}-day license, not yet orderable. Next: ${tiers.find((t) => t.fits && t.available)?.sku ?? "none"}`)
    : `Exceeds the ${TOP_TIER.sku} quota by ${fmt((tiers.at(-1).utilisation - 1) * 100, 0)}%`;

  $("tierRows").innerHTML = tiers.map((t) => `
    <tr class="${pick && t.sku === pick.sku ? "pick" : ""} ${t.available ? "" : "na"}">
      <td>${t.sku}${t.available ? "" : " (coming soon)"}</td>
      <td class="num">${t.days} days</td>
      <td class="num">${fmtGB(t.quotaGB)}</td>
      <td class="num">${daysSupported(t.days, kbps, s.hours)}</td>
      <td class="num">${fmt(t.utilisation * 100, 0)}%</td>
      <td class="${t.fits ? "yes" : "no"}">${t.fits ? "Yes" : "No"}</td>
    </tr>`).join("");

  const over = $("over");
  over.classList.toggle("hidden", !!pick);
  if (!pick) {
    const days = daysSupported(TOP_TIER.days, kbps, s.hours);
    $("overDays").innerHTML = `At these settings a <strong>${TOP_TIER.sku}</strong> supports <strong>${days} days</strong> of retention.`;
    const limit = maxKbpsForTier(TOP_TIER.days, s.hours, s.retention);
    $("overLimit").innerHTML = `To keep ${s.retention} days at ${s.hours} h/day, average bitrate must stay under <strong>${fmt(kbpsToMbps(limit), 2)} Mbit/s</strong> (${limit.toLocaleString()} kbit/s).`;
    $("hints").innerHTML = fixHints(codecs, s.codec, s.resX, s.resY, TOP_TIER.days, s.hours, s.retention)
      .map((h) => `<li>${h.quality}: ${h.fps ? `${h.fps} fps (${fmt(kbpsToMbps(h.kbps), 2)} Mbit/s)` : "no frame rate fits, lower the resolution"}</li>`)
      .join("");
  }
}

$("calc").addEventListener("input", render);
render();
