// TFN playback host. Rendering code is pinned locally; no media or account access.
import { LumierePixiRuntime, compileLumiereProgram, DEFAULT_LUMIERE_TUNING,
  HanabiPixiRuntime, compileHanabiProgram, DEFAULT_HANABI_TUNING } from './renderer.js';

const host = document.getElementById('window');
const send = type => window.TfnNebbiaHost?.postMessage(JSON.stringify({ type }));
let runtime = null, content = null, clock = null, sequence = -1;
let controller = null, generation = 0, destroyed = false;
let applied = null, appliedPlayback = '', appliedSeek = -1;
let preparedKey = null, preparedSong = null;
const time = { get: () => {
  if (!clock) return 0;
  const seconds = Math.min(clock.duration || Infinity, clock.position +
    (clock.playing && clock.active && !document.hidden ? Math.max(0, performance.now() - clock.at) : 0)) / 1000;
  return content?.song.placeholder ? Math.min(3, seconds) : seconds;
} };
const energy = key => ({ get: () => clock?.active && clock.playing ? clock[key] || 0 : 0 });
const band = (from, to) => ({ get: () => {
  const values = clock?.active && clock.playing ? clock.bands?.slice(from,to) ?? [] : [];
  return values.reduce((a,b) => a+b,0) / Math.max(1,values.length);
} });
const audioBands = { bass: energy('bass'), lowMid: band(2,5), mid: band(4,8), vocal: energy('vocal'), treble: band(11,16) };

function tuningFor(c) {
  const raw=c.tuning??{};
  const mobile=(c.performance?.maxFps??30)<=30;
  const {scale,renderQuality,...rest}=raw;
  const quality=renderQuality&&renderQuality!=='auto'?renderQuality:mobile?'balanced':'full';
  return {...(c.skin==='lumiere'?DEFAULT_LUMIERE_TUNING:DEFAULT_HANABI_TUNING),overlayFrame:false,...rest,renderQuality:quality};
}
function songContext(c) {
  const theme = { name: '', description: '', fontStyle: 'sans', fontWeight: 500,
    animationIntensity: 'normal', secondaryColor: '#b7b8d8', wordColors: [], lyricsIcons: [], ...c.theme };
  const programKey=`${c.skin}:${c.songKey}:${c.skin==='lumiere'?tuningFor(c).seamlessTransitions:''}`;
  if (preparedKey === programKey) return {song:{...preparedSong,theme},theme};
  const lines = c.song.lines.map(line => ({ ...line,
    // Preserve real line timing as one unit, never synthesize word timestamps.
    words: line.words.length ? line.words : line.fullText ? [{text:line.fullText,startTime:line.startTime,endTime:line.endTime}] : [],
  }));
  preparedKey = programKey;
  const compile = c.skin === 'lumiere' ? compileLumiereProgram : compileHanabiProgram;
  preparedSong = {seed:c.songKey,program:compile(lines,c.songKey,{}, {duration:(clock?.duration||180000)/1000,seamless:c.skin==='lumiere'?tuningFor(c).seamlessTransitions:undefined}),theme};
  return { song:preparedSong, theme };
}
function playback(force = false) {
  if (!runtime || !clock) return;
  const active = clock.active && !document.hidden;
  const paused = !active || !clock.playing || clock.reduceMotion;
  const key = `${active}:${paused}:${clock.reduceMotion}`;
  if (force || appliedPlayback !== key) {
    // Stop the renderer itself: a paused frame must not retain a running ticker.
    runtime.setPaused(paused);
    runtime.setStaticMode(clock.reduceMotion);
    runtime.setTfnActive(active);
    appliedPlayback = key;
  }
  const seek = Math.floor(clock.position / 100);
  if (active && paused && seek !== appliedSeek) runtime.renderOnce();
  appliedSeek = seek;
}
async function apply() {
  const c = content;
  if (!c || destroyed) return;
  const input = songContext(c);
  const tuning=tuningFor(c);
  window.tfnPerformance = c.performance;
  if(!runtime)window.tfnLyricScale=c.lyricScale??1;
  document.documentElement.style.setProperty('--accent',c.theme.backgroundColor);
  if (runtime && applied && applied.skin !== c.skin) {
    try {
      runtime.destroy();
    } catch (e) {
      console.warn('Runtime destroy error:', e);
    }
    runtime = null;
    applied = null;
    appliedPlayback = '';
    appliedSeek = -1;
    host.innerHTML = '';
  }
  if (!runtime) {
    const token = ++generation;
    controller?.abort(); controller = new AbortController();
    const common = {host, song:input.song, currentTime:time, paused:true,
      staticMode:!!clock?.reduceMotion, showText:true, renderScale:c.scale??1, antialias:false,
      signal:controller.signal, metadata:{title:c.song.title,artist:c.song.artist,album:''}};
    try {
      let next;
      if (c.skin === 'lumiere') next = await LumierePixiRuntime.create({...common,
        tuning,audioPower:energy('power'),audioBands});
      else if (c.skin === 'hanabi') next = await HanabiPixiRuntime.create({...common,
        tuning});
      else throw Error('Unknown skin');
      if (destroyed || token !== generation) {next.destroy();return;}
      runtime = next;
      host.querySelector('canvas')?.addEventListener('webglcontextlost',()=>send('failed'),{once:true});
      applied = c;
      runtime.setTfnInsets(c.insets.top,c.insets.bottom);
      appliedPlayback = ''; appliedSeek = -1;
      playback(true);
      send('frame');
      // Content may have changed during shader warmup; drain the newest input.
      if (content !== c) await apply();
    } catch (error) {
      if (!destroyed && token === generation) { console.error(error); send('failed'); }
    }
    return;
  }
  const tuningChanged=JSON.stringify(c.tuning)!==JSON.stringify(applied?.tuning);
  if(tuningChanged){
    runtime.setTuning(tuning);
    runtime.setRenderScale(c.scale??1);
  }
  if ((c.skin==='lumiere'&&c.tuning?.seamlessTransitions!==applied?.tuning?.seamlessTransitions) || c.songKey !== applied?.songKey || JSON.stringify(c.theme) !== JSON.stringify(applied?.theme)) {
    await runtime.swapSong(input.song); runtime.setSongMetadata({title:c.song.title,artist:c.song.artist,album:''});
  }
  if (destroyed || !runtime) return;
  runtime.setTfnLyricScale(c.lyricScale??1);
  runtime.setTfnInsets(c.insets.top,c.insets.bottom);
  applied = c;
  playback();
}
let applying = false, pending = false;
async function drain() {
  if (applying) {pending = true;return;}
  applying = true;
  try {do {pending = false;await apply();} while(pending && !destroyed);}
  catch(error) {if(!destroyed){console.error(error);send('failed');}}
  finally {applying=false;}
}
window.TfnNebbia = {
  receive(packet) {
    if(destroyed || !Number.isSafeInteger(packet.sequence) || packet.sequence <= sequence)return;
    sequence = packet.sequence;
    if(packet.clock)clock={...packet.clock,at:performance.now()};
    if(packet.content){content=packet.content;void drain();}
    playback();
  },
  dispose() {destroyed=true;generation++;controller?.abort();runtime?.destroy();runtime=null;content=null;clock=null;},
};
document.addEventListener('visibilitychange',()=>playback());
window.addEventListener('pagehide',()=>{runtime?.setPaused(true);runtime?.setTfnActive(false);});
window.addEventListener('error',()=>send('failed'));
window.addEventListener('unhandledrejection',()=>send('failed'));
send('loaded');
