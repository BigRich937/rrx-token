// Final RRoyal logo set: Cinzel, Я x R, ruby pin at the center of the scepter X.
const opentype = require("opentype.js");
const fs = require("fs");
const path = require("path");
const { logo } = require("./logoMirror.js");
const font = opentype.loadSync(path.join(__dirname, "fontsL/Cinzel.ttf"));
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const SETTINGS = { gap: -0.26, pinMiddle: true };

// Wrap a variant's body in a transform that re-centers it on the 512 canvas and
// scales it so every corner of its content box stays within SAFE_R of the
// center — i.e. inside the circle most platforms crop square icons to
// (Discord, X/Twitter, wallets, exchange listings). cx/cy/halfW/halfH below
// are the variant's own content bounding box, measured by rendering it raw
// (no transform) and reading the painted pixel bbox; recompute them the same
// way if the glyph geometry changes.
const SAFE_R = 212;
const recenter = (svg, cx, cy, halfW, halfH) => {
  const diag = Math.hypot(halfW, halfH);
  const scale = +(SAFE_R / diag).toFixed(4);
  return svg.replace(/(<\/defs>)([\s\S]*)(<\/svg>)/, (_, d, body, end) =>
    `${d}<g transform="translate(256 256) scale(${scale}) translate(${-cx} ${-cy})">${body}</g>${end}`);
};

// 1. Main logo (token logo): monogram + delivery trail + sparkles.
//    Raw content box (own center 261,221.25, half-size 195.5x129.75) clips the
//    top-right corner by ~1% in a circle crop (the trail tip); recentered here.
const mainLogo = recenter(logo(font, "left", 0.065, SETTINGS), 261, 221.25, 195.5, 129.75);
fs.writeFileSync(`${out}/rroyal-logo.svg`, mainLogo);

// 2. Icon for small sizes: monogram only, scaled up to fill the square.
//    Raw content box (own center 256,233.75, half-size 175.5x83.75) used to be
//    recentered with a hand-eyeballed transform that left it ~9% off-center
//    vertically, wasting the bottom of the canvas and clipping both top
//    corners by ~9% in a circle crop. Recomputed from the measured box.
const icon = recenter(logo(font, "left", 0.075, { ...SETTINGS, trail: false, sparkles: false }), 256, 233.75, 175.5, 83.75);
fs.writeFileSync(`${out}/rroyal-icon.svg`, icon);

// 3. Wide wordmark for headers: monogram on the left, "RROYAL" in Cinzel on the right.
const mono = logo(font, "left", 0.065, { ...SETTINGS, sparkles: false });
const defs = mono.match(/<defs>[\s\S]*<\/defs>/)[0];
const body = mono.replace(/^[\s\S]*<\/defs>/, "").replace(/<\/svg>\s*$/, "");
let d = "", x = 0;
const size = 108, track = 16;
for (const ch of "RROYAL") { d += font.getPath(ch, x, 0, size).toPathData(2); x += font.getAdvanceWidth(ch, size) + track; }
const wordW = x - track;
const wide = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 360" width="1200" height="360">${defs}
  <g transform="translate(20 -76) scale(0.98)">${body}</g>
  <path d="${d}" transform="translate(${560 + (600 - wordW) / 2} 222)" fill="url(#gold)" filter="url(#lift)"/>
  <rect x="${560 + (600 - wordW) / 2}" y="250" width="${wordW}" height="2" fill="url(#gold)" opacity="0.6"/>
</svg>`;
fs.writeFileSync(`${out}/rroyal-wordmark.svg`, wide);
console.log("ok");
