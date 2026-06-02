// Shared prompt scaffolding for on-demand room generation.
// STYLE per context is set here; swap PALAZZO_STYLE to the chosen option once picked.
//   119 = M3 Photoreal · 122 = M3 Elegant Maximalism · 102 = M3 Cinematic Realism

export const STYLE = { palazzo: 102, fuori: 119 };

const NEG = 'plain, austere, empty, modern, minimal, fisheye distortion, warped lines, blurry, watermark, signage, text, people';

// fixed look anchor per context — locks palette/era so conjured rooms feel like one place
const PREFIX = {
  palazzo: 'interior of the grandest most opulent palace ever imagined, a sumptuous fusion of Roman palazzo and Arabian-Nights palace, soaring gilded arches, intricate Moorish geometric mosaics and tilework, polychrome marble, gold leaf, carved muqarnas ceilings, crystal light, lush silk and a marble fountain, lavish maximalist grandeur, warm golden light, photoreal, no people, no text — ',
  fuori:   'a sunlit Mediterranean exterior of a grand Roman palazzo on the Aventine Hill, warm travertine and honey stone, cypress and citrus, terracotta, open blue Roman sky, the rooftops and domes of Rome beyond, photoreal architectural photography, no people, no text — ',
};

// room "types" the explorer can wander into; one is chosen per conjure for variety
export const TYPES = {
  palazzo: [
    'a grand columned hall lined with arches',
    'a domed reception salon under a honeycomb vault',
    'a mirrored banqueting room hung with lamps',
    'a marble bath with a sunken pool and steam',
    'a gilded throne room with a canopy',
    'an inner courtyard around a tiered fountain',
    'a library of carved cedar and gold',
    'a chamber of silk divans and lattice screens',
  ],
  fuori: [
    'a formal Italian garden of clipped hedges and statues',
    'a sunlit piazza with a baroque fountain',
    'an arcaded loggia overlooking the city',
    'a cypress-lined avenue to the gates',
    'a rooftop terrace at golden dusk',
    'a citrus orchard courtyard with a well',
  ],
};

export function buildPrompt(context, roomType){
  const ctx = (context === 'fuori') ? 'fuori' : 'palazzo';
  const types = TYPES[ctx];
  const body = roomType && types.includes(roomType) ? roomType : null;
  return {
    skybox_style_id: STYLE[ctx],
    prompt: PREFIX[ctx] + (body || '__RANDOM__'),
    negative_text: NEG,
    context: ctx,
  };
}
export { NEG };
