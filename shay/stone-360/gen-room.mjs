// CLI: node gen-room.mjs "a serene minimalist room ..."
import { generateRoom } from './room.mjs';

const userPrompt = process.argv.slice(2).join(' ') ||
  'a calm modern gallery room with pale concrete floor, soft north light from tall windows, warm minimal furniture, a low marble plinth in the center';

console.log('Prompt:', userPrompt);
await generateRoom(userPrompt, new URL('./out/room.jpg', import.meta.url).pathname);
