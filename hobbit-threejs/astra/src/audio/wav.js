export function encodeWav(channels,sampleRate) {
  const count=channels.length,length=Math.min(...channels.map(c=>c.length));
  const buffer=new ArrayBuffer(44+length*count*2),view=new DataView(buffer);
  const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+length*count*2,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);
  view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*count*2,true);
  view.setUint16(32,count*2,true);view.setUint16(34,16,true);text(36,'data');
  view.setUint32(40,length*count*2,true);
  let offset=44;
  for(let i=0;i<length;i++)for(let c=0;c<count;c++){
    const s=Math.max(-1,Math.min(1,channels[c][i]||0));
    view.setInt16(offset,Math.round(s*(s<0?32768:32767)),true);offset+=2;
  }
  return buffer;
}
