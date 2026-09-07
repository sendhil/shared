import {Timeline,clamp} from '../timeline.js';
import {makeSoundscape} from './soundscape.js';
import {encodeWav} from './wav.js';
import manifest from '../data/cues.json';

export class AudioDirector {
  constructor(onStatus=()=>{}) {
    this.onStatus=onStatus;this.manifest=manifest;
    this.sources=[];this.muted=false;this.levels={master:.8,narration:1,ambience:.65};
    this.fallback=false;this.speechToken=0;
  }
  async prepare() {
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)throw new Error('This browser does not support Web Audio. Open this experience in a current desktop browser.');
    this.context=new AudioCtx({latencyHint:'interactive'});
    this.timeline=new Timeline(this.context,manifest.duration);
    this.master=this.context.createGain();this.master.gain.value=this.levels.master;
    this.narrationGain=this.context.createGain();this.narrationGain.gain.value=this.levels.narration;
    this.ambienceGain=this.context.createGain();this.ambienceGain.gain.value=this.levels.ambience;
    this.narrationGain.connect(this.master);this.ambienceGain.connect(this.master);this.master.connect(this.context.destination);
    const response=await fetch(import.meta.env.BASE_URL+'audio/narration.wav').catch(()=>null);
    try{
      if(!response?.ok)throw new Error('Narration file could not be loaded');
      this.narration=await this.context.decodeAudioData(await response.arrayBuffer());
      this.timeline.duration=this.narration.duration;
    }catch(error){
      if(!('speechSynthesis' in window))throw new Error('The narration could not load. Check the local audio file and reload to try again.');
      this.fallback=true;
      this.onStatus('Using your browser’s voice. Seeking moves to the nearest phrase.');
    }
    this.ambience=await makeSoundscape({...manifest,duration:this.timeline.duration});
    this.context.addEventListener('statechange',()=>{
      if(this.context.state!=='running'&&this.timeline.playing){this.pause();this.onStatus('Audio was interrupted. Press play to continue.');}
    });
    this.ready=true;return this;
  }
  async play() {
    if(!this.ready)return;
    await this.context.resume();
    if(this.context.state!=='running')throw new Error('Audio is still blocked. Press play to try again.');
    if(this.timeline.ended)this.timeline.seek(0);
    if(this.timeline.playing)return;
    this.stopSources();
    const when=this.context.currentTime+.025;
    this.timeline.play(when);
    this.startBuffer(this.ambience,this.ambienceGain,when,this.timeline.offset);
    if(this.fallback){if(!this.muted)this.speakFrom(this.timeline.offset);}
    else this.startBuffer(this.narration,this.narrationGain,when,this.timeline.offset);
  }
  startBuffer(buffer,gain,when,offset) {
    if(offset>=buffer.duration)return;
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(gain);
    source.start(when,offset);this.sources.push(source);
  }
  stopBuffers() {
    for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}
    this.sources=[];
  }
  stopSources() {
    this.stopBuffers();
    if(this.fallback){this.speechToken++;speechSynthesis.cancel();}
  }
  pause() {this.timeline.pause();this.stopSources();}
  async seek(time) {
    const playing=this.timeline.playing;
    this.pause();
    if(this.fallback)time=(manifest.cues.findLast(c=>c.start<=time)||manifest.cues[0]).start;
    this.timeline.seek(time);
    if(playing)await this.play();
  }
  async restart(){this.pause();this.timeline.seek(0);await this.play();}
  setVolume(layer,value) {
    this.levels[layer]=clamp(Number(value));
    const gain=layer==='master'?this.master:this[layer+'Gain'];
    if(gain)gain.gain.setTargetAtTime(layer==='master'&&this.muted?0:this.levels[layer],this.context.currentTime,.015);
    if(this.fallback&&(layer==='master'||layer==='narration'))this.onStatus('Browser voice volume changes take effect at the next phrase.');
  }
  setMuted(value){
    const changed=this.muted!==Boolean(value);
    this.muted=Boolean(value);this.setVolume('master',this.levels.master);
    if(this.fallback&&changed){
      this.speechToken++;speechSynthesis.cancel();
      if(!this.muted&&this.timeline.playing)this.speakFrom(this.timeline.time);
      this.onStatus('Browser narration · phrase-level seeking and resume');
    }
  }
  speakFrom(time) {
    const token=++this.speechToken;
    const index=manifest.cues.findIndex(c=>c.end>time);
    if(index<0)return;
    const voice=speechSynthesis.getVoices().filter(v=>/^en[-_]/.test(v.lang)).sort((a,b)=>{
      const score=v=>(/natural|premium|enhanced/i.test(v.name)?4:0)+(/Daniel|Samantha|Karen/i.test(v.name)?2:0)+(/GB/.test(v.lang)?1:0);
      return score(b)-score(a);
    })[0];
    const say=i=>{
      if(token!==this.speechToken||!this.timeline.playing||!manifest.cues[i])return;
      const cue=manifest.cues[i],u=new SpeechSynthesisUtterance(cue.text);
      if(voice)u.voice=voice;u.lang='en-GB';u.rate=.92;
      u.volume=this.muted?0:this.levels.master*this.levels.narration;
      u.onstart=()=>{
        if(token!==this.speechToken||!this.timeline.playing)return;
        this.timeline.seek(cue.start);
        this.stopBuffers();
        this.startBuffer(this.ambience,this.ambienceGain,this.context.currentTime,cue.start);
      };
      u.onend=()=>say(i+1);
      u.onerror=e=>{if(e.error!=='canceled'&&e.error!=='interrupted'){this.pause();this.onStatus('Browser speech was interrupted. Press play to resume this phrase.');}};
      speechSynthesis.speak(u);
    };say(index);
  }
  // Verification records the actual post-volume browser mix.
  async startRecording() {
    if(this.recording){
      if(this.recording.stopPromise)await this.recording.stopPromise;
      else return true;
    }
    if(!this.recorderLoaded){
      await this.context.audioWorklet.addModule(new URL('./recorder-worklet.js',import.meta.url));
      this.recorderLoaded=true;
    }
    const tap=new AudioWorkletNode(this.context,'evidence-recorder',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
    const chunks=[];let finish;
    const done=new Promise(resolve=>{finish=resolve;});
    tap.port.onmessage=e=>{if(e.data.type==='chunk')chunks.push(e.data);else if(e.data.type==='done')finish();};
    this.master.connect(tap);tap.connect(this.context.destination);
    this.recording={tap,chunks,done};return true;
  }
  async stopRecording() {
    const recording=this.recording;
    if(!recording){
      if(this.lastRecordingBlob)return this.lastRecordingBlob;
      throw new Error('Start a verification recording first.');
    }
    if(!recording.stopPromise)recording.stopPromise=(async()=>{
      const {tap,chunks,done}=recording;
      tap.port.postMessage('stop');await done;
      this.master.disconnect(tap);tap.disconnect();tap.port.close();
      const length=chunks.reduce((n,c)=>n+c.left.length,0),left=new Float32Array(length),right=new Float32Array(length);
      let offset=0;
      for(const chunk of chunks){left.set(chunk.left,offset);right.set(chunk.right,offset);offset+=chunk.left.length;}
      const blob=new Blob([encodeWav([left,right],this.context.sampleRate)],{type:'audio/wav'});
      this.lastRecordingBlob=blob;
      if(this.recording===recording)this.recording=null;
      return blob;
    })();
    return recording.stopPromise;
  }
}
