import * as THREE from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// The existing normal pass supplies depth, so focus needs no additional scene
// render. Keep a broad sharp zone around the subject and soften distant detail.
export function createFocusPass(depthTexture,camera) {
  // A ShaderMaterial keeps the live depth attachment. ShaderPass clones the
  // uniforms of plain shader objects, which would create an unrendered texture.
  return new ShaderPass(new THREE.ShaderMaterial({
    uniforms:{tDiffuse:{value:null},tDepth:{value:depthTexture},uFocus:{value:40},
      uNear:{value:camera.near},uFar:{value:camera.far},uTexel:{value:new THREE.Vector2(1/1600,1/1000)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      #include <packing>
      varying vec2 vUv;
      uniform sampler2D tDiffuse;uniform sampler2D tDepth;
      uniform float uFocus;uniform float uNear;uniform float uFar;uniform vec2 uTexel;
      float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,uNear,uFar);}
      void main(){
        float depth=distanceAt(vUv),sharp=max(2.0,uFocus*.25);
        float radius=clamp((abs(depth-uFocus)-sharp)/max(2.0,uFocus*.5),0.,1.)*4.;
        vec3 color=texture2D(tDiffuse,vUv).rgb*2.;float total=2.;
        for(int i=0;i<20;i++){
          float a=float(i)*2.3999632;
          float r=sqrt((float(i)+.5)/20.);
          vec2 uv=clamp(vUv+vec2(cos(a),sin(a))*uTexel*radius*r,vec2(0.),vec2(1.));
          float sampleDepth=distanceAt(uv);
          float weight=(depth>uFocus+sharp&&sampleDepth<uFocus+sharp)?0.:1.;
          color+=texture2D(tDiffuse,uv).rgb*weight;total+=weight;
        }
        gl_FragColor=vec4(color/total,1.);
      }`,
  }));
}
