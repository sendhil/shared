import {random} from '../world/util.js';
import {smooth} from '../timeline.js';

// Every sound is synthesized from seed 111. This identical graph is rendered
// once into a seekable stereo buffer; it cannot drift from the narrator.
export async function makeSoundscape(manifest, options={}) {
  const rate=24000,duration=manifest.duration;
  const ctx=new OfflineAudioContext(2,Math.ceil(duration*rate),rate);
  const rand=random(111),bus=ctx.createGain();bus.gain.value=options.gain ?? 1;
  bus.connect(ctx.destination);
  const at=i=>manifest.cues[i].start;
  function gainEnvelope(node,start,length,peak,attack=.05) {
    const g=ctx.createGain();
    g.gain.setValueAtTime(0,start);
    g.gain.linearRampToValueAtTime(peak,start+attack);
    g.gain.exponentialRampToValueAtTime(.00001,start+Math.max(attack+.01,length));
    node.connect(g);return g;
  }
  function pan(node,value) {
    const p=ctx.createStereoPanner();p.pan.value=value;node.connect(p);p.connect(bus);
  }
  function tone(start,length,freq,peak,where=0,endFreq=freq,type='sine') {
    const osc=ctx.createOscillator();osc.type=type;osc.frequency.setValueAtTime(freq,start);
    osc.frequency.exponentialRampToValueAtTime(endFreq,start+length);
    pan(gainEnvelope(osc,start,length,peak,Math.min(.03,length*.1)),where);
    osc.start(start);osc.stop(start+length+.03);
  }
  function noise(start,length,peak,lowpass,where=0,attack=.02) {
    const b=ctx.createBuffer(1,Math.ceil(length*rate),rate),data=b.getChannelData(0);
    let y=0;
    for(let i=0;i<data.length;i++){y=y*.74+(rand()*2-1)*.26;data[i]=y;}
    const src=ctx.createBufferSource();src.buffer=b;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=lowpass;
    src.connect(filter);pan(gainEnvelope(filter,start,length,peak,attack),where);
    src.start(start);src.stop(start+length);
  }
  // Wind and brook: broad, low backgrounds, with a gradual evening change.
  const wind=ctx.createBuffer(2,Math.ceil(duration*rate),rate);
  for(let c=0;c<2;c++){
    const data=wind.getChannelData(c);let low=0,slow=0;
    for(let i=0;i<data.length;i++){
      const t=i/rate,n=rand()*2-1;low=.985*low+.015*n;slow=.999*slow+.001*n;
      const mood=t>at(18)?Math.min(1,(t-at(18))/10):0;
      const fade=Math.min(1,t/2,(duration-t)/3);
      const chamber=smooth(at(6)-.3,at(6)+.35,t)*(1-smooth(at(9)-.35,at(9)+.3,t));
      data[i]=((low-slow)*.13+(n*.005))*(.62+Math.sin(t*.21+c)*.12+mood*.4)*Math.max(0,fade)*(1-chamber*.88);
    }
  }
  const windSource=ctx.createBufferSource();windSource.buffer=wind;windSource.connect(bus);windSource.start(0);
  // A sparse morning song with varied pitch, intervals and stereo distance.
  for(let t=2.4;t<at(18);t+=3.7+rand()*3.0) {
    if(t>at(6)&&t<at(9))continue;
    const p=rand()*1.6-.8,f=1750+rand()*1300;
    for(let b=0;b<3;b++)tone(t+b*.15,.13,f*(1+b*.065),.009,p,f*(1.15+b*.065));
    if(rand()>.4)tone(t+.68,.19,f*.85,.006,p,f*1.03);
  }
  // Community motion: feet on gravel and tiny cloth/pottery noises.
  for(let t=3.1;t<at(2)+.4;t+=.56)noise(t,.11,.055,800,Math.sin(t)*.6);
  noise(at(1)+.55,1.0,.054,2200,-.15,.1); // unfurling linen
  tone(at(1)+1.82,.35,740,.009,-.1,570); // light wooden roller
  for(let t=at(2)+.6;t<at(4);t+=1.3){
    noise(t,.25,.019,430,Math.sin(t)*.45);
    tone(t+.1,.14,1800+rand()*500,.003,.35);
  }
  for(let t=at(5)+.2;t<at(6);t+=.48)noise(t,.1,.08,600,0);
  // The conjectural vault has warm metallic resonance and a timber hinge.
  noise(at(6)+1.0,1.2,.056,380,0,.25);
  tone(at(6)+1.2,.75,187,.013,0,156,'triangle');
  for(let i=0;i<13;i++){
    const t=at(8)+.2+i*.12;
    for(const [f,g] of [[1290,.008],[2134,.004],[3279,.002]])tone(t,.7,f*(.97+rand()*.06),g,rand()*.8-.4);
  }
  // Original almost-musical room tone. Long attacks keep it below the reading.
  const pads=[[0,at(6),[146.832,220,293.665],.0038],[at(6),at(9),[110,164.814,246.942],.005],
    [at(9),at(16),[146.832,220,329.628],.003],[at(16),duration,[146.832,174.614,220],.0048]];
  for(const [start,end,notes,level] of pads)for(let n=0;n<notes.length;n++){
    const o=ctx.createOscillator();o.frequency.value=notes[n];o.detune.value=n-1;
    const g=ctx.createGain();g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(level,start+2);
    g.gain.setValueAtTime(level,Math.max(start+2,end-2));g.gain.linearRampToValueAtTime(0,end);
    o.connect(g);pan(g,(n-1)*.3);o.start(start);o.stop(end+.02);
  }
  // Time is felt in light wooden ticks; the final gust replaces the birds.
  for(let t=at(11)+.4;t<at(16)-.4;t+=1.15) {
    noise(t,.047,.03,1450,-.3);tone(t,.16,470,.003,.2,430);
  }
  // Leaves move left-to-right across the porch, then give way to winter air.
  for(let t=at(11)+1.1;t<at(11)+5.8;t+=.72){
    const p=(t-at(11)-1.1)/4.7;
    noise(t,.65,.031*Math.sin(Math.PI*(.12+p*.75)),2100,-.65+p*1.3,.14);
  }
  noise(at(11)+6,4.3,.027,370,.15,.9);
  noise(at(21),duration-at(21),.06,210,0,.6);
  return ctx.startRendering();
}
