import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/audio/wav.js').catch(()=>({}));
test('PCM evidence files have a valid stereo RIFF header and clamped interleaved samples',()=>{
  assert.equal(typeof api.encodeWav,'function','PCM encoder must exist');
  const result=api.encodeWav([Float32Array.of(-2,0,.5),Float32Array.of(2,0,-.5)],24000);
  const bytes=new Uint8Array(result),v=new DataView(result),read=(a,b)=>new TextDecoder().decode(bytes.slice(a,b));
  assert.equal(read(0,4),'RIFF');assert.equal(read(8,12),'WAVE');assert.equal(read(36,40),'data');
  assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),24000);
  assert.equal(v.getUint32(40,true),12);assert.equal(result.byteLength,56);
  assert.equal(v.getInt16(44,true),-32768);assert.equal(v.getInt16(46,true),32767);
  assert.equal(v.getInt16(52,true),16384);assert.equal(v.getInt16(54,true),-16384);
});
