# Offshoots

Interactive map of North American music styles: trace what any style grew out of
and what grew out of it. Built for the School of Listening class.

Live: https://offshoots.netlify.app/

459 styles across 16 families, 1,127 parent-to-child connections, 276 written
descriptions, and playlists on Apple Music and Spotify for the styles that have them.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The whole app, built and ready to serve |
| `art/` | Playlist cover art, one square JPEG per style |

Netlify serves this directory as-is. No build command, no publish subdirectory.

## How the connections work

Each style stores only its parents, as a space-separated list of style ids:

```
["rocknroll","Rock and Roll",1954,"rock","rnb jump boogie nola_rnb honkytonk gospel", ...]
                                       |- parents: 6 ids
```

Children are derived at load time by inverting that list, so every edge is written
once, in one direction. A style with no parents is a root; roots are drawn with a
ring instead of a filled dot.

The map draws two generations in each direction from the selected style, not the
whole ancestry. The ancestor and descendant counts in the panel come from a full
breadth-first walk, so they run deeper than the lines you see.

Ids are lowercase, stable and arbitrary (`nola_rnb`, `twotone`, `scrap`). Renaming a
style is safe. Changing an id means updating every parent list that references it.

## Color

Families take their color from the School of Listening cover palette. Each shelf's
cover field supplies the hue, lifted to a lightness that reads on the dark map; for
the shelves whose covers are near-black, the cover accent supplies it instead. The
same palette tints the detail panel, so a style's panel, its lane, its dot and its
lines are all the same family color.

## Source

Built from three files that concatenate into `index.html`:

```
head.html   CSS and markup
data.js     families, styles, parents, artists, playlists, descriptions, covers
app.js      layout, rendering, interaction
```

Source and data exports live alongside the class materials in
`/Users/slim/Code/Music`, not in this repository.
