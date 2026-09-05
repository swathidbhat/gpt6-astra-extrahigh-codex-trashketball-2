'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, RotateCcw, Volume2, VolumeX, HelpCircle, LockKeyhole, Check, MousePointer2, Sparkles, Move, Sun, BriefcaseBusiness, CircleDot, Eye, EyeOff } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { registerGameTools } from '@/lib/game/webmcp';
import type { GameAPI, GameState } from '@/lib/game/engine';
const initial: GameState = { level: 1, score: 0, shots: 0, made: 0, streak: 0, yaw: 0, elevation: 51, power: 57, flying: false, ready: false, transition: false, message: '' };
export default function Home() {
  const container = useRef<HTMLDivElement>(null), game = useRef<GameAPI | null>(null);
  const [s, setS] = useState(initial), [help, setHelp] = useState(false), [sound, setSound] = useState(false), [arc, setArc] = useState(true), [error, setError] = useState('');
  const dragging = useRef<{ x: number; y: number; yaw: number; elevation: number; moved: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false; let unregister = () => {};
    import('@/lib/game/engine').then(({ createGame }) => { if (!cancelled && container.current) { try { game.current = createGame(container.current, setS); unregister = registerGameTools(game.current); } catch (e) { console.error(e); setError('The 3D room couldn’t start. Please enable hardware acceleration in your browser and reload.'); } } }).catch(() => setError('The game couldn’t load. Please reload to try again.'));
    return () => { cancelled = true; unregister(); game.current?.dispose(); game.current = null; };
  }, []);
  useEffect(() => { game.current?.setPaused(help); }, [help]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (help || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement)?.closest('button,input,[role="slider"],[role="dialog"]')) return;
      const g = game.current; if (!g) return;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Equal', 'Minus'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && !e.repeat) g.shoot();
      if (e.code === 'ArrowLeft') g.setAim(g.state.yaw - .7, g.state.elevation);
      if (e.code === 'ArrowRight') g.setAim(g.state.yaw + .7, g.state.elevation);
      if (e.code === 'ArrowUp') g.setAim(g.state.yaw, g.state.elevation + .7);
      if (e.code === 'ArrowDown') g.setAim(g.state.yaw, g.state.elevation - .7);
      if (e.code === 'Equal') g.setPower(g.state.power + 1);
      if (e.code === 'Minus') g.setPower(g.state.power - 1);
    }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [help]);
  return <main className={`game-shell ${s.level === 2 ? 'beach' : ''}`}>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Trashketball home"><span className="brand-symbol">✳</span> trashketball<span className="brand-period">.</span></a>
      <nav className="level-track" aria-label="Game levels">
        <span className={s.level === 1 ? 'level-item active' : 'level-item done'}><span className="level-number">{s.level === 2 ? <Check size={13}/> : '01'}</span><span>The office</span></span>
        <span className="track-line"/>
        <span className={s.level === 2 ? 'level-item active' : 'level-item locked'}><span className="level-number">{s.level === 1 ? <LockKeyhole size={12}/> : '02'}</span><span>The escape</span></span>
      </nav>
      <div className="top-actions"><button className="icon-button" title={sound ? 'Mute sound' : 'Enable sound'} aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound} onClick={() => { setSound(!sound); game.current?.setSound(!sound); }}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button><button className="icon-button" title="How to play" aria-label="How to play" onClick={() => setHelp(true)}><HelpCircle size={19}/></button></div>
    </header>
    <section className="play-area" aria-label="Trashketball game">
      <div className="room-canvas" ref={container}
        onPointerDown={e => { if (e.button !== 0) return; const g = game.current; if (!g) return; e.currentTarget.setPointerCapture(e.pointerId); dragging.current = { x: e.clientX, y: e.clientY, yaw: g.state.yaw, elevation: g.state.elevation, moved: false }; }}
        onPointerMove={e => { const d = dragging.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 4) d.moved = true; game.current?.setAim(d.yaw + dx * .055, d.elevation - dy * .07); }}
        onPointerUp={e => { const d = dragging.current; if (d && !d.moved && e.pointerType === 'mouse') game.current?.shoot(); dragging.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
        onPointerCancel={() => { dragging.current = null; }} />
      <div className="scene-shade"/>
      <div className="room-label"><span className="tiny-kicker"><span className="live-dot"/> LEVEL {String(s.level).padStart(2, '0')} <span className="slash">/</span> {s.level === 1 ? 'SEVERED FLOOR' : 'OUT OF OFFICE'}</span><h1>{s.level === 1 ? 'The office.' : 'The escape.'}</h1><p>{s.level === 1 ? 'Please enjoy each throw equally.' : 'A better kind of work-life balance.'}</p><span className="location-tag">{s.level === 1 ? <BriefcaseBusiness size={13}/> : <Sun size={14}/>} {s.level === 1 ? 'Macrodata Refinement' : 'The beachfront Airbnb'}</span></div>
      <aside className="score-card" aria-label="Scoreboard"><div className="score-heading"><span>TOTAL SCORE</span><CircleDot size={15}/></div><div className="score-value">{String(s.score).padStart(3, '0')}<span>PTS</span></div><div className="score-stats"><span><b>{s.made}</b> baskets</span><span><b>{s.shots ? Math.round(s.made / s.shots * 100) : 0}%</b> accuracy</span></div><div className="score-rule"/>{s.level === 1 ? <><div className="goal-copy"><span>The escape awaits</span><span>{s.score}<em> / 100</em></span></div><Progress aria-label="Points to unlock level two" value={Math.min(s.score, 100)} className="level-progress"/><p className="unlock-note"><LockKeyhole size={12}/> {Math.max(0, (100 - s.score) / 10)} baskets to unlock level 02</p></> : <><div className="goal-copy"><span><Check size={13}/> Both rooms unlocked</span><Sun size={16}/></div><p className="unlock-note">Stay a little longer. Every basket +10.</p></>}</aside>
      <div className="environment-note"><span className="vertical-line"/><span>{s.level === 1 ? 'LUMON INDUSTRIES' : 'OCEANFRONT RESIDENCE'}<br/><b>{s.level === 1 ? 'A productive use of your break.' : 'You’ve earned this view.'}</b></span></div>
      <div className="feedback" aria-live="polite" aria-atomic="true">{s.message && <span className={s.message.includes('+10') ? 'made-feedback' : ''}>{s.message.includes('+10') && <Sparkles size={19}/>} {s.message}</span>}</div>
      {!s.ready && !error && <div className="loading-room"><span className="loading-orbit"/><p>Preparing your workstation…</p></div>}
      {error && <div className="error-room" role="alert"><h2>Let’s get you back in the game.</h2><p>{error}</p><button onClick={() => window.location.reload()}>Reload game <ArrowRight size={17}/></button></div>}
      <div className="bottom-hud">
        <div className="aim-note"><Move size={18}/><span>Drag to aim<span className="secondary">Click the room or press <kbd>space</kbd> to throw</span></span></div>
        <div className="throw-console">
          <div className="power-control"><label id="power-label">THROW POWER <span>{Math.round(s.power)}<em>%</em></span></label><Slider aria-labelledby="power-label" value={[s.power]} min={10} max={100} step={1} disabled={s.flying || !s.ready || s.transition} onValueChange={v => game.current?.setPower(Array.isArray(v) ? v[0] : v)} className="power-slider"/></div>
          <span className="console-divider"/>
          <div className="angle-readout"><span>ANGLE</span><b>{Math.round(s.elevation)}°</b></div>
          <button className="throw-button" disabled={!s.ready || s.flying || s.transition} onClick={() => game.current?.shoot()}>{s.flying ? 'In the air…' : 'Throw paper'}<ArrowUpRight size={21}/></button>
        </div>
        <div className="scene-tools"><button aria-label={arc ? 'Hide trajectory' : 'Show trajectory'} aria-pressed={arc} onClick={() => { setArc(!arc); game.current?.setTrajectory(!arc); }}>{arc ? <Eye size={17}/> : <EyeOff size={17}/>}<span>Trajectory {arc ? 'on' : 'off'}</span></button><button className="restart-button" title="Restart game" aria-label="Restart game" onClick={() => game.current?.restart()}><RotateCcw size={17}/></button></div>
      </div>
      <div className="target-hint"><span>+10</span> PER BASKET</div>
    </section>
    <footer className="statusbar"><span><span className="live-dot"/> {s.level === 1 ? 'INNIE MODE' : 'OUTIE MODE'}</span><span className="footer-center">Nothing but bin.</span><span>2 ROOMS <span className="footer-dot">·</span> ENDLESS PAPER</span></footer>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent className="game-dialog"><span className="dialog-kicker">A SMALL BREAK FROM WORK</span><DialogTitle>Nothing but bin.</DialogTitle><DialogDescription>Find your arc. Make the basket. Earn your escape.</DialogDescription><div className="instruction-row"><Move/><p><b>Aim your throw</b>Drag anywhere in the room, or use the arrow keys. Up raises your arc.</p></div><div className="instruction-row"><MousePointer2/><p><b>Find your power</b>Adjust the slider or use + / −. The dots show your ball’s predicted path.</p></div><div className="instruction-row"><ArrowUpRight/><p><b>Let it fly</b>Click the room, press Space, or tap Throw paper. Each basket earns 10 points.</p></div><div className="instruction-row"><Sun/><p><b>Clock out at 100</b>Make 10 baskets to unlock the beach house, then keep your score climbing.</p></div><button className="throw-button" onClick={() => setHelp(false)}>Back to the game <ArrowRight size={18}/></button></DialogContent></Dialog>
    <Dialog open={s.transition}><DialogContent showCloseButton={false} className="game-dialog transition-dialog"><span className="escape-icon"><Sun size={33}/></span><span className="dialog-kicker">LEVEL 01 COMPLETE</span><DialogTitle>Your outie is waiting.</DialogTitle><DialogDescription>100 points. A job well done.<br/>Trade the fluorescent lights for a little ocean light.</DialogDescription><div className="escape-detail"><span>02</span><div><b>The escape</b><p>A beachfront Airbnb. Same excellent aim.</p></div></div><button className="throw-button" onClick={() => game.current?.nextLevel()}>Enter the beach house <ArrowRight size={19}/></button></DialogContent></Dialog>
  </main>;
}
