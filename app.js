// ---- Stone data ----------------------------------------------------------
// Each stone has a hand-tuned SVG shape + a palette of seed backgrounds.
// Backgrounds are described as CSS gradient strings so the UI is fully
// self-contained until a real image-generation backend is wired in.

const STONES = [
  {
    id: "obsidian",
    name: "Obsidian",
    shape: { fill: "#1c1a1f", highlight: "#5b5763", w: 220, h: 150, d: "M30 80 C 40 30, 90 10, 130 20 S 210 60, 200 110 S 130 150, 80 140 S 20 120, 30 80 Z" },
    backgrounds: [
      { caption: "drifting in volcanic mist", css: "radial-gradient(circle at 30% 20%, #3a2f2b, #0e0a09 70%)" },
      { caption: "on a black sand shore", css: "linear-gradient(180deg, #1a1d22 0%, #2a2622 60%, #0a0808 100%)" },
      { caption: "in moonlit ruins", css: "linear-gradient(160deg, #0d1117 0%, #1f2731 50%, #08090b 100%)" },
    ],
  },
  {
    id: "rosequartz",
    name: "Rose Quartz",
    shape: { fill: "#e7b5b8", highlight: "#fff0ef", w: 200, h: 200, d: "M40 100 C 40 50, 100 30, 140 50 S 180 110, 160 150 S 80 180, 50 150 S 40 130, 40 100 Z" },
    backgrounds: [
      { caption: "in a cherry orchard", css: "radial-gradient(circle at 50% 40%, #f7d2d4, #be7c80 60%, #6a3a3e 100%)" },
      { caption: "at sunset over still water", css: "linear-gradient(180deg, #f7c2a8 0%, #c97b86 55%, #4a2b3a 100%)" },
      { caption: "buried in soft snow", css: "linear-gradient(180deg, #fbe5e7 0%, #d3b8bf 60%, #6e6066 100%)" },
    ],
  },
  {
    id: "jade",
    name: "Jade",
    shape: { fill: "#3f7d63", highlight: "#a5d3b6", w: 200, h: 150, d: "M30 90 C 25 45, 80 20, 130 30 S 195 70, 180 110 S 100 140, 60 130 S 35 115, 30 90 Z" },
    backgrounds: [
      { caption: "in a bamboo grove after rain", css: "radial-gradient(circle at 40% 30%, #5a8a5a, #1f3a2a 70%, #0a1410 100%)" },
      { caption: "on temple steps at dusk", css: "linear-gradient(180deg, #3c4a3a 0%, #6e6444 50%, #1f1a14 100%)" },
      { caption: "beneath jungle canopy", css: "radial-gradient(ellipse at 30% 70%, #244a30, #0e1a14 75%)" },
    ],
  },
  {
    id: "amber",
    name: "Amber",
    shape: { fill: "#c97a1a", highlight: "#ffd58a", w: 200, h: 200, d: "M50 100 C 50 50, 110 40, 140 60 S 170 130, 140 160 S 60 160, 50 100 Z" },
    backgrounds: [
      { caption: "frozen in honey", css: "radial-gradient(circle at 50% 40%, #ffcb6b, #a85a14 60%, #3a1d05 100%)" },
      { caption: "by firelight in a cave", css: "radial-gradient(circle at 30% 70%, #d97824, #401a05 70%, #0a0604 100%)" },
      { caption: "in a sun-baked desert", css: "linear-gradient(180deg, #f0c674 0%, #c2843c 50%, #5a3014 100%)" },
    ],
  },
  {
    id: "lapis",
    name: "Lapis",
    shape: { fill: "#2a4d8f", highlight: "#aac4ec", w: 220, h: 160, d: "M30 80 C 30 30, 100 20, 140 30 S 210 70, 195 120 S 100 150, 60 140 S 30 110, 30 80 Z" },
    backgrounds: [
      { caption: "drifting in deep ocean", css: "radial-gradient(circle at 50% 30%, #2c5aa0, #0a1a3a 70%, #02060f 100%)" },
      { caption: "below a starry night", css: "linear-gradient(180deg, #0a1230 0%, #1c2a55 40%, #050818 100%)" },
      { caption: "on a desert cliff at twilight", css: "linear-gradient(180deg, #2a3a6a 0%, #6a4a5a 50%, #1a1018 100%)" },
    ],
  },
  {
    id: "granite",
    name: "Granite",
    shape: { fill: "#6e6e6e", highlight: "#c4c4c4", w: 220, h: 160, d: "M30 90 C 30 40, 90 20, 140 30 S 200 60, 200 110 S 120 150, 70 140 S 30 120, 30 90 Z" },
    backgrounds: [
      { caption: "on a foggy mountain pass", css: "linear-gradient(180deg, #8a8a8a 0%, #4a4a4a 60%, #1a1a1a 100%)" },
      { caption: "in an abandoned quarry", css: "radial-gradient(ellipse at 40% 60%, #6e6258, #2a2520 80%)" },
      { caption: "by a cold grey sea", css: "linear-gradient(180deg, #7a8a90 0%, #3a4a52 50%, #0e1418 100%)" },
    ],
  },
  {
    id: "moonstone",
    name: "Moonstone",
    shape: { fill: "#e3eaf2", highlight: "#ffffff", w: 200, h: 200, d: "M50 100 C 50 50, 110 40, 140 60 S 175 130, 145 160 S 60 165, 50 100 Z" },
    backgrounds: [
      { caption: "on a glacier under aurora", css: "linear-gradient(180deg, #1a3a4a 0%, #3a6a7a 30%, #6a3a7a 60%, #0a0a1a 100%)" },
      { caption: "in a pale silver dawn", css: "linear-gradient(180deg, #d8dfe5 0%, #93a0aa 60%, #2a3038 100%)" },
      { caption: "afloat on still moonlit water", css: "radial-gradient(circle at 50% 30%, #b9c8d6, #2a3a52 70%, #0a1018 100%)" },
    ],
  },
  {
    id: "pyrite",
    name: "Pyrite",
    shape: { fill: "#c4a23a", highlight: "#fff0a8", w: 200, h: 180, d: "M40 30 L 160 35 L 180 110 L 130 165 L 60 160 L 25 100 Z" },
    backgrounds: [
      { caption: "lost in a copper mine", css: "radial-gradient(circle at 50% 40%, #8a6a2a, #2a1a08 75%)" },
      { caption: "on yellowing autumn leaves", css: "linear-gradient(180deg, #c98a3a 0%, #6a4318 60%, #1a1008 100%)" },
      { caption: "buried by golden wheat", css: "linear-gradient(180deg, #e8c870 0%, #a8842a 50%, #3a2a0e 100%)" },
    ],
  },
  {
    id: "obsidianblue",
    name: "Larimar",
    shape: { fill: "#6fbed1", highlight: "#dff3f7", w: 220, h: 160, d: "M30 80 C 30 30, 100 20, 140 30 S 210 60, 195 110 S 100 150, 60 140 S 30 110, 30 80 Z" },
    backgrounds: [
      { caption: "in shallow caribbean water", css: "linear-gradient(180deg, #a8e0e8 0%, #4a9aae 50%, #0a3a4a 100%)" },
      { caption: "under a hurricane sky", css: "linear-gradient(180deg, #5a6e7a 0%, #2a3a44 50%, #0a1218 100%)" },
      { caption: "on white coral sand", css: "linear-gradient(180deg, #d8e8ea 0%, #8aa8b0 60%, #2a3a3e 100%)" },
    ],
  },
  {
    id: "garnet",
    name: "Garnet",
    shape: { fill: "#7a1a25", highlight: "#d04a5a", w: 200, h: 200, d: "M50 100 C 50 50, 110 40, 140 60 S 175 130, 145 160 S 60 165, 50 100 Z" },
    backgrounds: [
      { caption: "near glowing embers", css: "radial-gradient(circle at 50% 70%, #c9381e, #3a0a08 70%, #0a0202 100%)" },
      { caption: "in a deep red cathedral", css: "linear-gradient(180deg, #4a0a18 0%, #7a1a28 40%, #1a0408 100%)" },
      { caption: "under a blood-orange dusk", css: "linear-gradient(180deg, #d96a3a 0%, #6a1a24 50%, #1a040a 100%)" },
    ],
  },
  {
    id: "opal",
    name: "Opal",
    shape: { fill: "#e9e1d2", highlight: "#fff", w: 200, h: 180, d: "M40 90 C 40 40, 100 30, 130 50 S 175 110, 150 150 S 70 160, 45 130 S 40 110, 40 90 Z" },
    backgrounds: [
      { caption: "swirling in an iridescent dream", css: "linear-gradient(120deg, #4a6ec9 0%, #c93a8a 40%, #c9a83a 70%, #3ac98a 100%)" },
      { caption: "above the clouds at sunrise", css: "linear-gradient(180deg, #f0d9c0 0%, #c97a8a 50%, #4a3a6a 100%)" },
      { caption: "in a frosted greenhouse", css: "radial-gradient(circle at 40% 30%, #e0e8d8, #8a9a8a 60%, #2a3a3a 100%)" },
    ],
  },
  {
    id: "onyx",
    name: "Onyx",
    shape: { fill: "#161313", highlight: "#4a4444", w: 220, h: 150, d: "M30 80 C 40 30, 90 10, 130 20 S 210 60, 200 110 S 130 150, 80 140 S 20 120, 30 80 Z" },
    backgrounds: [
      { caption: "in a starless midnight forest", css: "radial-gradient(ellipse at 50% 100%, #1a1418, #050405 80%)" },
      { caption: "on polished black marble", css: "linear-gradient(180deg, #2a2226 0%, #0e0a0c 100%)" },
      { caption: "drowned in ink", css: "radial-gradient(circle at 30% 30%, #1a1c24, #02030a 70%)" },
    ],
  },
];

// ---- Rendering helpers ---------------------------------------------------

function stoneSVG(shape) {
  const { w, h, d, fill, highlight } = shape;
  const id = "g" + Math.random().toString(36).slice(2, 8);
  return `
    <svg viewBox="0 0 ${w + 20} ${h + 30}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${id}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${highlight}" stop-opacity="0.85"/>
          <stop offset="55%" stop-color="${fill}" stop-opacity="1"/>
          <stop offset="100%" stop-color="#000" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <path d="${d}" fill="url(#${id})" />
    </svg>
  `;
}

function makeStoneCard(stone) {
  const first = stone.backgrounds[0];
  const card = document.createElement("button");
  card.className = "stone-card";
  card.type = "button";
  card.setAttribute("aria-label", `Open ${stone.name}`);
  card.dataset.stoneId = stone.id;
  card.innerHTML = `
    <div class="bg" style="background:${first.css}"></div>
    <div class="stone">${stoneSVG(stone.shape)}</div>
    <div class="label">${stone.name}</div>
  `;
  card.addEventListener("click", () => openLightbox(stone));
  return card;
}

function renderGallery() {
  const gallery = document.getElementById("gallery");
  for (const stone of STONES) gallery.appendChild(makeStoneCard(stone));
}

// ---- Lightbox / slider ---------------------------------------------------

const lightbox = document.getElementById("lightbox");
const track = document.getElementById("sliderTrack");
const dotsEl = document.getElementById("sliderDots");
const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("promptInput");
const promptSubmit = promptForm.querySelector(".prompt-submit");

let activeStone = null;
let currentIndex = 0;

function renderSlides() {
  track.innerHTML = activeStone.backgrounds
    .map(
      (bg, i) => `
        <div class="slide" data-i="${i}">
          <div class="bg" style="background:${bg.css}"></div>
          <div class="stone">${stoneSVG(activeStone.shape)}</div>
          <div class="caption">${activeStone.name} — ${bg.caption}</div>
        </div>
      `,
    )
    .join("");

  dotsEl.innerHTML = activeStone.backgrounds
    .map((_, i) => `<button class="dot" data-i="${i}" aria-label="Background ${i + 1}"></button>`)
    .join("");

  dotsEl.querySelectorAll(".dot").forEach((d) => {
    d.addEventListener("click", () => goTo(Number(d.dataset.i)));
  });

  goTo(currentIndex, false);
}

function goTo(i, animate = true) {
  const max = activeStone.backgrounds.length;
  currentIndex = (i + max) % max;
  track.style.transition = animate ? "" : "none";
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  if (!animate) {
    // force reflow then restore transition
    void track.offsetWidth;
    track.style.transition = "";
  }
  dotsEl.querySelectorAll(".dot").forEach((d, idx) => {
    d.classList.toggle("active", idx === currentIndex);
  });
}

function openLightbox(stone) {
  activeStone = stone;
  currentIndex = 0;
  renderSlides();
  lightbox.hidden = false;
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  promptInput.focus({ preventScroll: true });
}

function closeLightbox() {
  lightbox.hidden = true;
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  activeStone = null;
}

document.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
document.querySelector(".slider-nav.prev").addEventListener("click", () => goTo(currentIndex - 1));
document.querySelector(".slider-nav.next").addEventListener("click", () => goTo(currentIndex + 1));

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") goTo(currentIndex - 1);
  else if (e.key === "ArrowRight") goTo(currentIndex + 1);
});

// Touch swipe
let touchStartX = null;
track.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
track.addEventListener("touchend", (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) goTo(currentIndex + (dx < 0 ? 1 : -1));
  touchStartX = null;
});

// ---- Prompt → generate stub ---------------------------------------------
// Stub: builds a deterministic-ish gradient from the prompt text, appends it
// as a new background, and slides to it. Replace `mockGenerate` with a real
// image-gen call later.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function paletteFromPrompt(prompt) {
  const h = hash(prompt.toLowerCase());
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + ((h >> 8) % 80)) % 360;
  const hue3 = (hue1 + 180 + ((h >> 16) % 60)) % 360;
  return [
    `hsl(${hue1} 55% 60%)`,
    `hsl(${hue2} 45% 35%)`,
    `hsl(${hue3} 35% 12%)`,
  ];
}

async function mockGenerate(prompt) {
  // Pretend we are calling a model.
  await new Promise((r) => setTimeout(r, 900));
  const [a, b, c] = paletteFromPrompt(prompt);
  const css = `linear-gradient(180deg, ${a} 0%, ${b} 50%, ${c} 100%)`;
  return { caption: prompt, css };
}

promptForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt || !activeStone) return;

  // Append a placeholder slide that shows the shimmer while we "generate".
  const placeholder = { caption: `generating: ${prompt}`, css: "linear-gradient(180deg, #2a2622 0%, #0a0808 100%)" };
  activeStone.backgrounds.push(placeholder);
  renderSlides();
  goTo(activeStone.backgrounds.length - 1);
  const lastSlide = track.querySelector(`.slide[data-i="${activeStone.backgrounds.length - 1}"]`);
  if (lastSlide) lastSlide.classList.add("generating");

  promptSubmit.disabled = true;
  promptInput.disabled = true;
  try {
    const result = await mockGenerate(prompt);
    activeStone.backgrounds[activeStone.backgrounds.length - 1] = result;
    renderSlides();
    goTo(activeStone.backgrounds.length - 1, false);
  } finally {
    promptSubmit.disabled = false;
    promptInput.disabled = false;
    promptInput.value = "";
    promptInput.focus({ preventScroll: true });
  }
});

// ---- Boot ----------------------------------------------------------------
renderGallery();
