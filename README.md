# Stones

A small gallery of stones. Each tile shows a stone on a blurred background;
click one to open a swipeable carousel of different backgrounds for that
stone, with a prompt input at the bottom to "generate" new ones.

## Running locally

It's a fully static page — no build step.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Status

- Gallery + lightbox + slider + prompt input: working.
- Stones and seed backgrounds: SVG / CSS-gradient placeholders.
- `Generate`: currently a stub that builds a gradient deterministically from
  the prompt text (see `mockGenerate` in `app.js`). Swap it out for a real
  image-generation API call when one is wired up.
