import test from 'node:test';
import assert from 'node:assert/strict';
import {DepthTexture,PerspectiveCamera} from 'three';
import {createFocusPass} from '../src/focus.js';

test('focus samples the live render-target depth attachment',()=>{
  const depth=new DepthTexture(1600,1000);
  const pass=createFocusPass(depth,new PerspectiveCamera(38,1.6,.1,650));
  assert.equal(pass.uniforms.tDepth.value,depth);
  pass.dispose();depth.dispose();
});
