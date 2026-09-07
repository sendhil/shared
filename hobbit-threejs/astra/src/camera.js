import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {HERO,heightAt} from './world/terrain.js';
import {smooth,clamp,ease} from './timeline.js';

export function createCameraSystem(camera,canvas,cues,duration) {
  const Y=HERO.y;
  const at=id=>cues[id].start;
  const shots=[
    {name:'The hillside',start:0,end:at(1),from:[34,24,43],to:[27,21,33],target:[0,6,-7],targetEnd:[0,7,-8],fov:39},
    {name:'An unusual birthday',start:at(1),end:at(2),from:[6.8,Y+4.4,6],to:[4.7,Y+3.8,3.8],target:[-.55,Y+2.5,-7.3],targetEnd:[-.55,Y+2.55,-7.3],fov:40},
    {name:'A village full of talk',start:at(2),end:at(4),from:[-9,9,18],to:[-7,8.7,14],target:[-.5,5.8,4.0],targetEnd:[0,5.6,3],fov:40},
    {name:'The wonder of the Shire',start:at(4),end:at(5),from:[-5,Y+2.6,1.2],to:[-4.1,Y+2.3,-.4],target:[-1.9,Y+1,-6.35],targetEnd:[-1.9,Y+1.1,-6.35],fov:37},
    {name:'A disappearance. A return.',start:at(5),end:at(6),from:[4.4,5.3,30],to:[3.4,6.4,23],target:[-3.51,heightAt(-3.51,24)+1.1,24],targetEnd:[-1.37,heightAt(-1.37,18)+1.1,18],fov:38},
    {name:'The things people imagine',start:at(6),end:at(9),from:[116.4,4.0,7],to:[113.7,3.1,4],target:[110,1.4,-4],targetEnd:[110.3,1.2,-3.7],fov:42,vault:true},
    {name:'The unchanging host',start:at(9),end:at(11),from:[3.5,Y+2.8,.0],to:[2.0,Y+2.6,-1.0],target:[-1.9,Y+1.0,-6.35],targetEnd:[-1.9,Y+1.1,-6.35],fov:38},
    {name:'Time wore on',start:at(11),end:at(16),from:[-10,Y+3.5,2.3],to:[-8.6,Y+3.0,1],target:[-3.5,Y+1.4,-7.1],targetEnd:[-3.5,Y+1.4,-7.1],fov:39},
    {name:'Too much of a good thing',start:at(16),end:at(19),from:[2.8,7.15,12.8],to:[2.2,7.0,11.5],target:[-.85,6.10,3.6],targetEnd:[-.85,6.10,3.6],fov:38},
    {name:'Trouble will come of it',start:at(19),end:duration,from:[14,Y+6.0,15],to:[19,Y+9.5,24],target:[0,Y+1.6,-8.5],targetEnd:[0,Y+1.6,-8.5],fov:38}
  ];
  // Ordinary cuts carry the village action. Only memories and the final mood
  // change receive a slower dip through darkness.
  const transitions=[0,0,0,0,.25,.6,.4,.38,0,.65];
  const orbit=new OrbitControls(camera,canvas);orbit.enabled=false;orbit.enableDamping=true;orbit.dampingFactor=.07;
  orbit.minDistance=2;orbit.maxDistance=100;orbit.maxPolarAngle=Math.PI*.47;orbit.minPolarAngle=.12;
  const target=new THREE.Vector3(),pos=new THREE.Vector3();
  let active=shots[0],spectator=false;
  function shotAt(t){return shots.find(s=>t>=s.start&&t<s.end)||shots.at(-1);}
  function update(t) {
    if(spectator){orbit.update();return {shot:active,fade:0};}
    active=shotAt(t);const p=clamp((t-active.start)/(active.end-active.start));
    // Constant gentle dolly; smooth only the ends so the middle never stalls.
    const u=p*.72+ease(p)*.28;
    pos.fromArray(active.from).lerp(new THREE.Vector3(...active.to),u);
    target.fromArray(active.target).lerp(new THREE.Vector3(...active.targetEnd),u);
    camera.position.copy(pos);camera.lookAt(target);
    camera.fov=active.fov+(camera.aspect<1.15?12:0);camera.updateProjectionMatrix();
    const i=shots.indexOf(active);
    let fade=0;
    if(transitions[i])fade=1-smooth(active.start,active.start+transitions[i],t);
    if(transitions[i+1])fade=Math.max(fade,smooth(active.end-transitions[i+1],active.end,t));
    return {shot:active,fade:fade*.92};
  }
  function setSpectator(value) {
    spectator=value;orbit.enabled=value;
    if(value){orbit.target.copy(target);orbit.update();}
  }
  return {shots,update,setSpectator,get spectator(){return spectator;},get focusDistance(){return camera.position.distanceTo(spectator?orbit.target:target);},orbit};
}
