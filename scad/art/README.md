# Pictures for `top_image`

SVG drawings the generator can engrave (or raise) on the mouthpiece, the ligature or the cap. Pick one in the
app (Personalize → Picture on top), or upload your own there.

Examples (original drawings, same license as the project):

| File | Suggested `top_image_width` |
|---|---|
| `saxophone.svg` | 16 mm or more |
| `happy_face.svg` | 10 mm or more |
| `sample_note.svg` | 10 mm or more |
| `treble_clef.svg` | 8 mm or more |
| `beamed_notes.svg` | 10 mm or more |
| `star.svg` | 8 mm or more |
| `heart.svg` | 8 mm or more |
| `flame.svg` | 10 mm or more |
| `skull.svg` | 10 mm or more |
| `cat.svg` | 10 mm or more |
| `bird.svg` | 12 mm or more |
| `wave.svg` | 12 mm or more |
| `lightning.svg` | 8 mm or more |

## Making your own

- **Use filled shapes.** OpenSCAD reads fills; outlines (strokes) come out filled in or broken.
  In Inkscape: select all, Path → Stroke to Path.
- **Holes go inside the shape's own path** (a subpath with `fill-rule="evenodd"`, or drawn the
  opposite way round). A white shape drawn on top does nothing: colours are ignored.
- **Keep lines printable:** about 0.5 mm or wider at the width you engrave it (a line that is 3% of
  the drawing's width is 0.5 mm at 16 mm).
- Photos and PNGs need tracing to an outline first (Inkscape: Path → Trace Bitmap).
- Only use logos and artwork you have the right to use.
