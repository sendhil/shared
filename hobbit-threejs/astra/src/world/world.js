import * as THREE from 'three';
import {buildTerrain,heightAt,HERO} from './terrain.js';
import {buildVegetation} from './vegetation.js';
import {buildArchitecture} from './architecture.js';
import {buildProps} from './props.js';
import {buildCharacters} from '../characters.js';
import {canvasTexture,random,ball,mat} from './util.js';
import {buildSeasons} from './seasons.js';
import {batchStaticMeshes} from './batching.js';

export function buildWorld(scene) {
  const terrain=buildTerrain(scene);
  const architecture=buildArchitecture(scene);
  const vegetation=buildVegetation(scene,architecture.homes);
  const props=buildProps(scene,architecture);
  const characters=buildCharacters(scene);
  const seasons=buildSeasons(scene);
  // Transparent textured motes and smoke provide scale without hiding the models.
  const tex=canvasTexture(64,64,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'rgba(255,249,226,.65)');g.addColorStop(.45,'rgba(255,249,226,.27)');g.addColorStop(1,'rgba(255,249,226,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
  const smoke=new THREE.Group();scene.add(smoke);
  const smokeSprites=[];
  for(let s=0;s<architecture.smokestacks.length;s++)for(let i=0;i<6;i++){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.16,depthWrite:false,color:'#d7d1b5'}));
    smoke.add(sprite);smokeSprites.push({sprite,source:architecture.smokestacks[s],index:i});
  }
  const rand=random(777),dustGeo=new THREE.BufferGeometry(),dustPos=new Float32Array(450*3),dustBase=[];
  for(let i=0;i<450;i++){const x=(rand()-.5)*54,z=(rand()-.5)*54,y=heightAt(x,z)+rand()*8+1;dustBase.push([x,y,z]);dustPos.set([x,y,z],i*3);}
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({map:tex,color:'#ffdd9a',size:.19,transparent:true,opacity:.47,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(dust);
  // A few swallows cross the space to establish its depth.
  const birds=[];
  for(let i=0;i<7;i++){
    const root=new THREE.Group();const left=ball(root,mat('#52645a'),[-.20,0,0],[.25,.028,.10]);const right=ball(root,mat('#52645a'),[.20,0,0],[.25,.028,.10]);
    ball(root,mat('#52645a'),[0,0,0],[.10,.04,.18]);scene.add(root);birds.push({root,left,right,i});
  }
  const animatedMeshes=new Set([
    props.bannerMesh,...vegetation.treeCrowns.map(c=>c.mesh),
    ...[characters.bilbo,characters.traveler,...characters.residents.map(r=>r.root)].flatMap(c=>c.userData.brows),
    ...birds.flatMap(b=>[b.left,b.right]),
  ]);
  const batching=batchStaticMeshes(scene,animatedMeshes);
  return {terrain,architecture,vegetation,props,characters,seasons,smokeSprites,dust,dustBase,birds,batching};
}
