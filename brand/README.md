# RRoyal brand

## Official logo

**Gold Я x R monogram with crossed jeweled scepters and a black diamond at the center**, on black.
The files at the top of this folder are the official set (see `TOKEN_INFO.md` for which size to
use where). The 256px PNG is the token logo for the explorer, CoinGecko, CoinMarketCap and
DexScreener.

The earlier generated Cinzel version (ruby pin, delivery trail, wide wordmark) is kept in
`previous-generated/`.

## Exploration history (newest last)

| Folder | What it shows |
|--------|---------------|
| `concepts/` | First three directions: Royal Seal coin, Crown Jewel, Royal Crest |
| `font-options/` | Wordmark in 8 bold fonts |
| `font-options-light/` | Wordmark in 8 lighter fonts |
| `monogram-options/` | Mirrored-R monogram, Я x R and R x Я, in Cinzel and Cormorant |
| `monogram-tight/` | Я x R with the letters touching the scepters |
| `monogram-closer/` | Я x R with the scepters overlapping the R's |
| `monogram-gem-center/` | Even tighter, with the ruby pin moved to the center of the X (chosen, in Cinzel) |

Each folder has an `rrx-font-options.png` comparison sheet plus each option as SVG and PNG.

## Regenerating the logos

The scripts in `tools/` build every option from code (fonts are converted to vector paths).
They need Node.js plus two packages: `npm install --no-save opentype.js@1.3.4 playwright@1.56.1`.

```bash
cd brand/tools
# Mirrored monogram: <out dir> <gap> <variants> [pin-middle]
node logoMirror.js out -0.26 1-cinzel-out,3-cormorant-out pin-middle
node sheet2.js out          # comparison sheet + PNGs
```

The fonts in `tools/fonts*` are from Google Fonts and licensed under the SIL Open Font License.
