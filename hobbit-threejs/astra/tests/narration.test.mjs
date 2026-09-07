import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const normalize=s=>s.replace(/\s+/g,' ').trim();
const manifest=JSON.parse(await readFile(new URL('../src/data/cues.json',import.meta.url),'utf8'));
test('measured narration cues reproduce every word of the supplied passage in order',async()=>{
  const source=await readFile(new URL('../public/audio/passage.txt',import.meta.url),'utf8');
  assert.equal(normalize(manifest.cues.map(c=>c.text).join(' ')),normalize(source));
  assert.equal(normalize(manifest.source),normalize(source));
});
test('all phrases have nonoverlapping, measured audio bounds inside the film',()=>{
  let end=0;
  for(const cue of manifest.cues){
    assert.ok(cue.start>=end);
    assert.ok(cue.end>cue.start);
    end=cue.end;
  }
  assert.ok(end<manifest.duration);
  assert.equal(manifest.sampleRate,24000);
});
