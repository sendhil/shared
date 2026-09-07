import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {createFocusPass} from './focus.js';

export function createRendering(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.99;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.info.autoReset=false;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9ccc0');scene.fog=new THREE.FogExp2('#b4c4ac',.0064);
  const camera=new THREE.PerspectiveCamera(38,1,.1,650);
  const hemisphere=new THREE.HemisphereLight('#d3e8e3','#68624d',1.75);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight('#fff0cf',2.7);sun.position.set(-32,45,24);scene.add(sun);
  sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  Object.assign(sun.shadow.camera,{left:-47,right:47,top:48,bottom:-35,near:1,far:130});
  sun.shadow.bias=-.00012;sun.shadow.normalBias=.065;sun.shadow.radius=2.5;
  sun.target.position.set(0,4,0);scene.add(sun.target);
  const rim=new THREE.DirectionalLight('#8fb5bc',.55);rim.position.set(35,22,-28);scene.add(rim);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(390,48,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{uDusk:{value:0},uTime:{value:0},uSun:{value:new THREE.Vector3(-.5,.5,-.65).normalize()}},
    vertexShader:'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vDir;uniform float uDusk;uniform float uTime;uniform vec3 uSun;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 low=mix(vec3(.79,.84,.68),vec3(.30,.35,.39),uDusk);
      vec3 high=mix(vec3(.32,.56,.57),vec3(.075,.16,.23),uDusk);
      vec3 c=mix(low,high,pow(h,.58));float glow=pow(max(dot(d,uSun),0.),18.);c+=vec3(.25,.15,.045)*glow*(1.-uDusk*.7);
      vec2 p=d.xz/max(d.y+.18,.04)*3.;p.x+=uTime*.006;
      float n=noise(p)+.5*noise(p*2.03)+.25*noise(p*4.01);
      float cloud=smoothstep(1.05,1.35,n)*smoothstep(.03,.25,d.y)*.4;c=mix(c,mix(vec3(.9,.89,.72),vec3(.34,.36,.4),uDusk),cloud);
      gl_FragColor=vec4(c,1.);}`
  }));scene.add(sky);
  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,960,600,16);ao.kernelRadius=.9;ao.minDistance=.0001;ao.maxDistance=.008;composer.addPass(ao);
  const focus=createFocusPass(ao.normalRenderTarget.depthTexture,camera);composer.addPass(focus);
  const bloom=new UnrealBloomPass(new THREE.Vector2(1280,720),.19,.52,1.05);composer.addPass(bloom);
  const grade=new ShaderPass({
    uniforms:{tDiffuse:{value:null},uTime:{value:0},uFade:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uFade;varying vec2 vUv;
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;vec2 p=(vUv-.5)*vec2(1.,.85);
      float vignette=smoothstep(.28,.77,length(p));c*=1.-vignette*.32;
      float grain=fract(sin(dot(vUv,vec2(12.9898,78.233))+floor(uTime*24.))*43758.5453)-.5;
      c+=grain*.005;c=mix(c,vec3(.065,.091,.091),uFade);gl_FragColor=vec4(c,1.);}`
  });composer.addPass(grade);composer.addPass(new SMAAPass());composer.addPass(new OutputPass());
  function resize(){
    const w=window.innerWidth,h=window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
    renderer.setSize(w,h);composer.setSize(w,h);ao.setSize(Math.round(w*.7),Math.round(h*.7));
    focus.uniforms.uTexel.value.set(1/w,1/h);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  resize();window.addEventListener('resize',resize);
  return {renderer,scene,camera,composer,bloom,grade,ao,focus,sun,hemisphere,rim,sky,resize};
}
