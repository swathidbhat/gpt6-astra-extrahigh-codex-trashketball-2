# Trashketball

A first-person Three.js paper-toss game with two environments:

- **The office:** a Severance-inspired macrodata refinement room with retro terminals, fluorescent lights, green carpet, and a wire wastebasket.
- **The escape:** a tall beachfront Airbnb with designer sofas, limestone floors, full-height glazing, animated ocean, palms, and a wood-and-brass wastebasket.

Every basket earns 10 points. At 100 points, enter the beach house and continue increasing the same score.

## Controls

Drag in the room or use arrow keys to aim. Adjust power with the slider or + / −. Click the room, press Space, or tap **Throw paper**. The trajectory can be toggled. Sound is optional. The restart control begins a fresh session.

## Development

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`
- `npx tsc --noEmit`

The simulation integrates gravity with linear aerodynamic drag at a fixed 180 Hz. The preview uses the identical simulation. Collision checks include the circular rim, tapered bin wall, floor, room boundaries, and furniture. Scoring requires a downward crossing with the whole ball inside the rim, and each throw can score once. Scene assets are procedural Three.js geometry with canvas-generated surface textures.

## Verification

11 automated checks cover the analytic flight solution, frame-step invariance, real successful throws in both levels, near misses, upward crossings, rim and furniture rebounds, preview agreement, and a full game-loop run of ten baskets, unlocking level two, continued scoring, a miss, and restarting. The game-loop test uses the actual scene builders and physics with a headless renderer; it does not verify rendered pixels. The development route returned HTTP 200. Production compilation and TypeScript checks were run.

Browser screenshots and interaction QA were not performed. Optional WebMCP actions are feature-detected; no supported WebMCP browser validation context was available, so live registration has not been verified. WebMCP is not required for normal play.
