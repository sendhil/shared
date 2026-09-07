import * as THREE from 'three';
import {smooth,clamp} from '../timeline.js';
import {random} from './util.js';
import {HERO,heightAt} from './terrain.js';

// A year passes through the garden while the host remains in the same pose.
// Everything is evaluated from film time, including the position of each leaf.
export function buildSeasons(parent) {
  const group=new THREE.Group();parent.add(group);
  const shape=new THREE.Shape();
  shape.moveTo(0,-.15);shape.bezierCurveTo(-.16,-.03,-.14,.1,0,.22);
  shape.bezierCurveTo(.14,.1,.16,-.03,0,-.15);
  const leaves=new THREE.InstancedMesh(new THREE.ShapeGeometry(shape,4),new THREE.MeshStandardMaterial({
    color:'#e5b069',roughness:.92,side:THREE.DoubleSide,transparent:true,depthWrite:false,
  }),90);
  group.add(leaves);
  const snow=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({
    color:'#e3eeee',size:.045,transparent:true,depthWrite:false,opacity:0,
  }));
  const snowPositions=new Float32Array(180*3);
  snow.geometry.setAttribute('position',new THREE.BufferAttribute(snowPositions,3));
  group.add(snow);
  const rand=random(401),seeds=Array.from({length:180},()=>({x:rand()*17-8.5,z:rand()*3-10,y:rand(),phase:rand()*6.28,s:.3+rand()*.5}));
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  for(let i=0;i<leaves.count;i++){
    leaves.setColorAt(i,color.set(['#c48b49','#b96138','#d8ac59','#a87636'][i%4]));
  }
  function update(t,start,end) {
    const p=clamp((t-start)/(end-start));
    const active=t>start&&t<end;
    const autumn=smooth(.01,.15,p)*(1-smooth(.28,.40,p));
    const winter=smooth(.28,.44,p)*(1-smooth(.62,.78,p));
    const spring=smooth(.61,.77,p)*(1-smooth(.88,1,p));
    group.visible=active;
    leaves.visible=autumn>.005;leaves.material.opacity=autumn*.9;
    snow.visible=winter>.005;snow.material.opacity=winter*.75;
    if(active){
      for(let i=0;i<seeds.length;i++){
        const s=seeds[i],fall=((t-start)*.21+s.y)%1;
        const x=s.x+fall*2.7+Math.sin(t*1.1+s.phase)*.35,z=s.z+Math.sin(t*.65+s.phase)*.8;
        const y=HERO.y+.16+(1-fall)*5.2;
        if(i<leaves.count){
          dummy.position.set(x,Math.max(heightAt(x,z)+.08,y),z);
          dummy.rotation.set(t*.8+s.phase,t*.55+s.phase,Math.sin(t*1.6+s.phase)*.8);
          dummy.scale.setScalar(s.s);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
        }
        snowPositions[i*3]=s.x+Math.sin(t*.3+s.phase)*.45;
        snowPositions[i*3+1]=HERO.y+((s.y*6-(t-start)*.43)%6+6)%6;
        snowPositions[i*3+2]=s.z;
      }
      leaves.instanceMatrix.needsUpdate=true;snow.geometry.attributes.position.needsUpdate=true;
    }
    return {active,autumn,winter,spring,progress:p};
  }
  return {group,update};
}
