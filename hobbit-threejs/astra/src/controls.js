import {cueAt} from './timeline.js';
const $=id=>document.getElementById(id);
const stamp=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');

export function createControls(audio,cameraSystem,onRender) {
  let started=false,captions=false,dragging=false,lastCue=null;
  const el={};
  for(const id of ['begin','begin-label','loading-detail','welcome','transport','play','restart','seek','time','scene-label','caption','captions','orbit','orbit-hint','mute','mix-toggle','mixer','fullscreen','end-card','replay-end','explore-end','chapter'])el[id]=$(id);
  function status(message){$('status').textContent=message;$('status').hidden=!message;}
  function run(fn){Promise.resolve().then(fn).catch(e=>{status(e.message);});}
  function explore(value) {
    if(value)audio.pause();
    cameraSystem.setSpectator(value);
    el.orbit.setAttribute('aria-pressed',String(value));el['orbit-hint'].hidden=!value;
    el['end-card'].hidden=true;
    onRender();
  }
  el.begin.addEventListener('click',()=>run(async()=>{
    await audio.play();started=true;
    el.welcome.classList.add('dismissed');el.transport.hidden=false;
    document.body.classList.add('has-begun');status(audio.fallback?'Browser narration · phrase-level seeking':'');
    el.play.focus({preventScroll:true});
  }));
  const toggle=()=>run(async()=>{
    if(audio.timeline.playing)audio.pause();
    else{explore(false);await audio.play();status(audio.fallback?'Browser narration · phrase-level seeking':'');}
  });
  el.play.addEventListener('click',toggle);
  el.restart.addEventListener('click',()=>run(async()=>{explore(false);await audio.restart();}));
  el.seek.addEventListener('pointerdown',()=>{dragging=true;});
  el.seek.addEventListener('input',()=>{el.time.textContent=stamp(Number(el.seek.value))+' / '+stamp(audio.timeline.duration);});
  const seekTo=async time=>{explore(false);await audio.seek(time);onRender();};
  const seek=()=>run(async()=>{dragging=false;await seekTo(Number(el.seek.value));});
  el.seek.addEventListener('change',seek);
  el.seek.addEventListener('pointerup',()=>{dragging=false;});
  el.captions.addEventListener('click',()=>{
    captions=!captions;el.captions.setAttribute('aria-pressed',String(captions));
    el.caption.hidden=!captions;lastCue=null;
  });
  el.orbit.addEventListener('click',()=>explore(!cameraSystem.spectator));
  el.mute.addEventListener('click',()=>{
    audio.setMuted(!audio.muted);el.mute.textContent=audio.muted?'×':'♫';
    el.mute.setAttribute('aria-label',audio.muted?'Unmute':'Mute');
    el.mute.setAttribute('aria-pressed',String(audio.muted));
  });
  el['mix-toggle'].addEventListener('click',()=>{
    el.mixer.hidden=!el.mixer.hidden;el['mix-toggle'].setAttribute('aria-expanded',String(!el.mixer.hidden));
  });
  for(const layer of ['master','narration','ambience']){
    const input=$(layer+'-volume');
    const updateVolume=()=>{
      audio.setVolume(layer,input.value);
      input.style.setProperty('--progress',(Number(input.value)*100)+'%');
      input.setAttribute('aria-valuetext',Math.round(Number(input.value)*100)+' percent');
    };
    input.style.setProperty('--progress',(Number(input.value)*100)+'%');
    input.addEventListener('input',updateVolume);
  }
  el.fullscreen.addEventListener('click',()=>run(async()=>{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await $('experience').requestFullscreen();
  }));
  document.addEventListener('fullscreenchange',()=>el.fullscreen.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
  el['replay-end'].addEventListener('click',()=>run(async()=>{explore(false);await audio.restart();}));
  el['explore-end'].addEventListener('click',()=>explore(true));
  window.addEventListener('keydown',e=>{
    if(!started||e.ctrlKey||e.altKey||e.metaKey)return;
    const key=e.key.toLowerCase();
    if(key==='escape'){
      explore(false);el.mixer.hidden=true;el['mix-toggle'].setAttribute('aria-expanded','false');
      return;
    }
    const tag=document.activeElement.tagName;
    if(['INPUT','TEXTAREA','SELECT'].includes(tag)||(tag==='BUTTON'&&e.code==='Space'))return;
    if(e.code==='Space'){e.preventDefault();toggle();}
    else if(key==='r')el.restart.click();
    else if(key==='c')el.captions.click();
    else if(key==='m')el.mute.click();
    else if(key==='o')el.orbit.click();
    else if(key==='f')el.fullscreen.click();
    else if(key==='arrowright'){e.preventDefault();run(()=>seekTo(audio.timeline.time+5));}
    else if(key==='arrowleft'){e.preventDefault();run(()=>seekTo(audio.timeline.time-5));}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&audio.timeline?.playing){audio.pause();status('Paused while you were away.');}});
  function ready() {
    el.begin.disabled=false;el['begin-label'].textContent='Begin Experience';
    el['loading-detail'].textContent='Sound on · '+stamp(audio.timeline.duration)+' · A passage by J. R. R. Tolkien';
    el.seek.max=audio.timeline.duration;
  }
  function update(t,shot) {
    const playing=audio.timeline?.playing;
    el.play.textContent=playing?'Ⅱ':'▶';el.play.setAttribute('aria-label',playing?'Pause':'Play');
    document.body.classList.toggle('is-playing',!!playing);
    if(!dragging){el.seek.value=t;el.time.textContent=stamp(t)+' / '+stamp(audio.timeline.duration);}
    el.seek.style.setProperty('--progress',(t/audio.timeline.duration*100)+'%');
    el['scene-label'].textContent=shot.name;
    const cues=audio.manifest.cues;
    el.chapter.textContent=cameraSystem.spectator?'A MOMENT TO WANDER':shot.vault?'BENEATH THE HILL · A RUMOR':
      t>=cues[11].start&&t<cues[16].start?'BAG END · THE YEARS PASS':
      t>=cues[18].start?'BAG END · THE LIGHT FADES':'HOBBITON · LATE SUMMER';
    if(captions){
      const cue=cueAt(audio.manifest.cues,t);
      if(cue!==lastCue){el.caption.textContent=cue?.text||'';el.caption.classList.toggle('visible',!!cue);lastCue=cue;}
    }
    if(started&&!cameraSystem.spectator)el['end-card'].hidden=!audio.timeline.ended;
  }
  return {ready,update,status,get started(){return started;},get captions(){return captions;}};
}
