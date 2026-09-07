import * as THREE from 'three';
import { mat, palette, mesh, rng, between, random } from './util.js';
import {grainTexture} from './surfaces.js';

export function heightAt(x,z) {
  const main = 6.6 * Math.exp(-(x*x/390 + (z+12)*(z+12)/360));
  const left = 3.2 * Math.exp(-((x+33)*(x+33)/430 + (z+9)*(z+9)/480));
  const right = 3.8 * Math.exp(-((x-33)*(x-33)/510 + (z+18)*(z+18)/700));
  const rolling = Math.sin(x*.105+z*.06)*.5 + Math.cos(z*.105-x*.035)*.5;
  const river = 2.1 * Math.exp(-Math.pow((z - 29 - Math.sin(x*.047)*5)/5.2,2));
  return .7 + main + left + right + rolling - river;
}
export const HERO = { x:0, z:-12, y:heightAt(0,-12) };
export const pathX = z => 3.8 * Math.sin((z+8)*.135);

export function buildTerrain(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const geometry = new THREE.PlaneGeometry(220,200,180,160);
  geometry.rotateX(-Math.PI/2);
  const pos=geometry.attributes.position;
  const colors = new Float32Array(pos.count*3);
  const color=new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    pos.setY(i,heightAt(x,z));
    const v=.45+.25*Math.sin(x*.075+z*.032)+.15*Math.cos(z*.13);
    color.set('#638950').lerp(new THREE.Color('#a5ac62'),v*.25);
    color.multiplyScalar(.92 + .08*Math.sin(x*.55)*Math.cos(z*.39));
    color.toArray(colors,i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();
  const groundTexture=grainTexture('earth',28);
  const ground=mesh(geometry,mat('#ffffff',{vertexColors:true,map:groundTexture,bumpMap:groundTexture,bumpScale:.045}),group);
  ground.castShadow=false;
  // Warm, meandering lanes are meshes following the actual terrain.
  const paths=[];
  function ribbon(fn,start,end,width,material) {
    const vertices=[],uv=[],indices=[],n=180;
    for(let i=0;i<=n;i++){
      const p=fn(start+(end-start)*i/n);
      const q=fn(start+(end-start)*Math.min(1,(i+1)/n));
      let dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz)||1;
      const nx=-dz/l,nz=dx/l;
      for(const side of [-1,1]){
        const x=p.x+nx*width*side*.5,z=p.z+nz*width*side*.5;
        vertices.push(x,heightAt(x,z)+.045,z);uv.push((side+1)/2,i/n*12);
      }
      if(i<n){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    const m=mesh(g,material,group);m.castShadow=false;paths.push(m);return m;
  }
  const pathTexture=grainTexture('earth',2);
  const earth=mat('#bcaa7e',{map:pathTexture,bumpMap:pathTexture,bumpScale:.028,roughness:.99});
  ribbon(z=>({x:pathX(z),z}),-8,62,2.55,earth);
  ribbon(x=>({x,z:8+Math.sin(x*.095)*3}),-65,60,1.8,earth);
  // A stream with an animated specular surface, kept low between its banks.
  const waterGeo=new THREE.PlaneGeometry(225,8,180,5);waterGeo.rotateX(-Math.PI/2);
  const wp=waterGeo.attributes.position;
  for(let i=0;i<wp.count;i++){
    const x=wp.getX(i);wp.setZ(i,wp.getZ(i)+29+Math.sin(x*.047)*5);wp.setY(i,-.13);
  }
  waterGeo.computeVertexNormals();
  const water=mesh(waterGeo,new THREE.MeshStandardMaterial({color:'#639d9a',roughness:.25,metalness:.42,transparent:true,opacity:.88}),group);
  water.castShadow=false;
  water.material.onBeforeCompile=shader=>{
    shader.uniforms.uTime={value:0};water.userData.shader=shader;
    shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n transformed.y += sin(position.x*.8 + uTime*.8)*.045 + cos(position.z*2.8 + uTime)*.025;');
  };
  // Distant sculpted hills, each band progressively cooler.
  for(let band=0;band<3;band++){
    const g=new THREE.PlaneGeometry(430,100,110,20);g.rotateX(-Math.PI/2);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i);
      const h=5+Math.pow(Math.sin(x*.028+band*.8),2)*9+Math.sin(x*.077+band)*2;
      p.setY(i,h*Math.sin(Math.PI*(z+50)/100));p.setZ(i,z-106-band*54);
    }
    g.computeVertexNormals();
    mesh(g,mat(['#6e8976','#7f9690','#9caaa0'][band]),group).castShadow=false;
  }
  return {group,ground,water,paths};
}
