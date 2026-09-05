import type { GameAPI } from './engine';
type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute: (input: unknown) => unknown };
type Context = { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> };
export function registerGameTools(game: GameAPI) {
  const context = (document as Document & { modelContext?: Context }).modelContext;
  if (!context?.registerTool) return () => {};
  const life = new AbortController();
  const tools: Tool[] = [
    { name: 'read_trashketball_state', description: 'Read the current level, score, aim, power and shot status.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ ...game.state }) },
    { name: 'configure_trashketball_throw', description: 'Set the visible throw trajectory using horizontal aim, elevation and power. Does not throw.', inputSchema: { type: 'object', properties: { yaw: { type: 'number', minimum: -34, maximum: 34 }, elevation: { type: 'number', minimum: 23, maximum: 67 }, power: { type: 'number', minimum: 10, maximum: 100 } }, required: ['yaw', 'elevation', 'power'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => {
      const v = input as Record<string, unknown>;
      if (!v || typeof v !== 'object' || Object.keys(v).some(k => !['yaw', 'elevation', 'power'].includes(k)) || !['yaw', 'elevation', 'power'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]))) throw new Error('Supply finite yaw, elevation, and power values.');
      const { yaw, elevation, power } = v as { yaw: number; elevation: number; power: number };
      if (yaw < -34 || yaw > 34 || elevation < 23 || elevation > 67 || power < 10 || power > 100) throw new Error('The aim or power is outside its allowed range.');
      if (!game.state.ready || game.state.flying || game.state.transition) throw new Error('Wait until the game is ready for another shot.');
      game.setAim(yaw, elevation); game.setPower(power); return { yaw: game.state.yaw, elevation: game.state.elevation, power: game.state.power };
    } },
    { name: 'throw_trashketball', description: 'Launch one paper ball with the current aim and power. The score updates when the ball lands.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: () => { if (!game.shoot()) throw new Error('Cannot throw while the game is paused, loading, or a shot is in flight.'); return { launched: true, shots: game.state.shots }; } },
    { name: 'enter_trashketball_beach_house', description: 'Enter level two after earning 100 points in the office.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: () => { if (!game.state.transition) throw new Error('First finish level one with 100 points.'); game.nextLevel(); return { level: game.state.level, score: game.state.score }; } },
  ];
  for (const tool of tools) { try { Promise.resolve(context.registerTool(tool, { signal: life.signal })).catch(() => {}); } catch { /* Unsupported experimental API must not interrupt play. */ } }
  return () => life.abort();
}
