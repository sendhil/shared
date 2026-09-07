import './style.css';
import {createRendering} from './rendering.js';
import {buildWorld} from './world/world.js';
import {createCameraSystem} from './camera.js';
import {createNarrative} from './narrative.js';
import {AudioDirector} from './audio/audio.js';
import {createControls} from './controls.js';

const status=message=>{const el=document.getElementById('status');el.textContent=message;el.hidden=!message;};
const app={ready:false,errors:[],frames:0};
window.__film=app;
window.addEventListener('error',e=>app.errors.push(e.message));
window.addEventListener('unhandledrejection',e=>app.errors.push(String(e.reason)));

async function boot(){
  let rendering;
  try{rendering=createRendering(document.getElementById('world'));}
  catch(error){
    document.getElementById('begin-label').textContent='WebGL is unavailable';
    document.getElementById('loading-detail').textContent='Enable hardware acceleration in your browser, then reload.';
    status('The 3D world could not start. Try a current desktop browser with WebGL enabled.');
    app.errors.push(String(error));return;
  }
  document.getElementById('loading-detail').textContent='Planting the gardens and opening the shutters';
  // Let the loading state paint before synchronous procedural construction.
  await new Promise(requestAnimationFrame);
  const world=buildWorld(rendering.scene);
  const audio=new AudioDirector(status),manifest=audio.manifest;
  const cameraSystem=createCameraSystem(rendering.camera,rendering.renderer.domElement,manifest.cues,manifest.duration);
  const narrative=createNarrative(world,rendering,manifest.cues);
  let controls;
  let lastFrame=performance.now(),sum=0,n=0;
  let lastRenderedTime=-1,lastSize='',lastShot=null;
  function renderFrame(force=true){
    const t=audio.timeline?.time||0;
    const size=window.innerWidth+'x'+window.innerHeight+'@'+window.devicePixelRatio;
    if(!force&&t===lastRenderedTime&&size===lastSize&&!cameraSystem.spectator){
      if(audio.ready&&lastShot)controls?.update(t,lastShot);
      return false;
    }
    const renderStart=performance.now();
    narrative(t);
    const {shot,fade}=cameraSystem.update(t);
    lastRenderedTime=t;lastSize=size;lastShot=shot;
    rendering.focus.uniforms.uFocus.value=cameraSystem.focusDistance;
    rendering.ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(rendering.camera.projectionMatrix);
    rendering.ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(rendering.camera.projectionMatrixInverse);
    rendering.grade.uniforms.uTime.value=t;rendering.grade.uniforms.uFade.value=controls?.started?fade:0;
    rendering.renderer.info.reset();rendering.composer.render();
    app.renderMs=performance.now()-renderStart;
    if(audio.ready)controls?.update(t,shot);
    app.frames++;
    if(audio.timeline?.playing&&audio.timeline.ended){audio.pause();controls?.update(t,shot);}
    return true;
  }
  controls=createControls(audio,cameraSystem,renderFrame);
  function loop(now){
    const dt=now-lastFrame;lastFrame=now;
    const rendered=renderFrame(false);
    if(rendered&&dt<250){sum+=dt;n++;if(n>=120){app.frameMs=sum/n;sum=0;n=0;}}
    requestAnimationFrame(loop);
  }
  renderFrame();requestAnimationFrame(loop);
  Object.assign(app,{audio,world,rendering,cameraSystem,controls,renderFrame,manifest,
    getState:()=>({ready:app.ready,time:audio.timeline?.time,playing:audio.timeline?.playing,ended:audio.timeline?.ended,
      duration:audio.timeline?.duration,context:audio.context?.state,muted:audio.muted,levels:audio.levels,
      fallback:audio.fallback,spectator:cameraSystem.spectator,frameMs:app.frameMs,renderMs:app.renderMs,frames:app.frames,
      draws:rendering.renderer.info.render.calls,triangles:rendering.renderer.info.render.triangles,errors:app.errors}),
    seek:async(t,play=false)=>{audio.pause();audio.timeline.seek(t);if(play)await audio.play();renderFrame();},
    recordStart:()=>audio.startRecording(),
    recordStop:async()=>{
      const blob=await audio.stopRecording();
      return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
    },
  });
  try{
    document.getElementById('loading-detail').textContent='Preparing the storyteller and soundscape';
    await audio.prepare();
    app.ready=true;controls.ready();
  }catch(error){
    app.errors.push(String(error));status(error.message);
    const button=document.getElementById('begin');
    button.disabled=false;document.getElementById('begin-label').textContent='Reload and try again';
    button.addEventListener('click',()=>location.reload(),{once:true});
  }
  document.getElementById('world').addEventListener('webglcontextlost',event=>{
    event.preventDefault();if(audio.ready)audio.pause();status('The graphics context was interrupted. Reload to restore the world.');
  });
}
boot().catch(error=>{app.errors.push(String(error));status('The world could not finish loading. '+error.message);});
