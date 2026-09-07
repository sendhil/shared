import * as THREE from 'three';
import { mesh, ball, rod, mat, rng, between, pick, random, palette } from './util.js';
import {heightAt,pathX,HERO} from './terrain.js';
import {addLeafCanopies,grainTexture} from './surfaces.js';

export function buildVegetation(scene,homes=[]) {
  const group=new THREE.Group();scene.add(group);
  function plantedGround(x,z,margin=0) {
    if((z>-9&&Math.abs(x-pathX(z))<1.55+margin)||Math.abs(z-8-Math.sin(x*.095)*3)<1.1+margin)return false;
    for(const home of homes){
      const dx=(x-home.position.x)/home.scale.x,dz=(z-home.position.z)/home.scale.x,a=home.rotation.y;
      const lx=dx*Math.cos(a)-dz*Math.sin(a),lz=dx*Math.sin(a)+dz*Math.cos(a);
      if(lx*lx/59+(lz-4.4)**2/19<1.08||lx*lx/56+(lz+2.2)**2/42<1.08)return false;
    }
    return true;
  }
  const barkTexture=grainTexture('wood',3);
  const bark=mat('#61513b',{map:barkTexture,bumpMap:barkTexture,bumpScale:.06});
  const leaves=[mat('#668247'),mat('#82984f'),mat('#3e6748'),mat('#95a85b')];
  const treeCrowns=[];
  function tree(x,z,scale=1,seed=5) {
    const rand=random(seed);const root=new THREE.Group();
    root.position.set(x,heightAt(x,z),z);root.scale.setScalar(scale);group.add(root);
    const trunk=rod(root,bark,[0,0,0],[.2,4.9,0],.45,.25);
    for(let b=0;b<7;b++){
      const a=b/7*Math.PI*2+.7, y=3.1+rand()*2;
      const end=[Math.cos(a)*(1.8+rand()),y+1.8,Math.sin(a)*2.2];
      rod(root,bark,[.1,y-.8,0],end,.16,.065);
      for(let n=0;n<3;n++){
        const c=ball(root,leaves[Math.floor(rand()*leaves.length)],
          [end[0]+(rand()-.5)*2,end[1]+rand()*1.1,end[2]+(rand()-.5)*2],
          [1.4+rand()*.7,1.15+rand()*.75,1.35+rand()*.6]);
        c.geometry=c.geometry.clone();
        const p=c.geometry.attributes.position;
        for(let i=0;i<p.count;i++){
          const x=p.getX(i),y=p.getY(i),z=p.getZ(i),v=1+.075*Math.sin(x*14+z*9)*Math.sin(y*17);
          p.setXYZ(i,x*v,y*v,z*v);
        }
        c.geometry.computeVertexNormals();treeCrowns.push({mesh:c,x:c.position.x,z:c.position.z,phase:rand()*8});
      }
    }
    for(let r=0;r<5;r++){
      const a=r/5*Math.PI*2;rod(root,bark,[0,.3,0],[Math.cos(a)*.9,0,Math.sin(a)*.9],.18,.08);
    }
    return root;
  }
  tree(11,-15,1.45,7);tree(-17,-18,1.15,15);
  [[-26,6,1.15],[23,1,1],[-32,-31,1.4],[32,-29,1.1],[-45,-1,1.6],[41,14,1.25],
   [-19,26,1],[26,31,1.15],[-55,-31,1.2],[54,-38,1.3],[-65,10,1.4],[65,5,1.4],
   [-39,37,1], [45,41,1.2],[-58,38,.9],[61,38,1],[-10,-40,1],[19,-47,.95]].forEach((p,i)=>tree(...p,i*9+33));
  const foliage=addLeafCanopies(group,treeCrowns);
  // Meadow tufts are instanced. Their roots stay fixed while the tips breathe in the wind.
  const blades=new THREE.BufferGeometry();
  const bladeVertices=[];
  for(let b=0;b<3;b++){
    const a=b*2.399,h=.24+b*.048,w=.025;
    const points=[[-w,0,0],[w,0,0],[-w*.5,h*.62,.035],[w*.5,h*.62,.035],[0,h,.10]];
    for(const i of [0,1,2,1,3,2,2,3,4]){
      const [x,y,z]=points[i];bladeVertices.push(x*Math.cos(a)+z*Math.sin(a),y,-x*Math.sin(a)+z*Math.cos(a));
    }
  }
  blades.setAttribute('position',new THREE.Float32BufferAttribute(bladeVertices,3));
  // Soft upward-biased normals avoid black, paper-thin silhouettes in the sun.
  const normals=new Float32Array(bladeVertices.length);
  for(let i=0;i<normals.length;i+=3)normals[i+1]=1;
  blades.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  const grassMat=mat('#b5c985',{side:THREE.DoubleSide});
  const count=58000;
  const grasses=new THREE.InstancedMesh(blades,grassMat,count);
  grasses.receiveShadow=true;grasses.castShadow=false;group.add(grasses);
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  let placed=0;
  const rand=random(101);
  for(let i=0;i<count*2&&placed<count;i++){
    const near=i<count*.72;
    const x=(rand()-.5)*(near?76:142),z=(rand()-.5)*(near?65:118);
    const riverZ=29+Math.sin(x*.047)*5;
    if(Math.abs(z-riverZ)<4.6||!plantedGround(x,z,.1))continue;
    dummy.position.set(x,heightAt(x,z)+.02,z);dummy.rotation.y=rand()*Math.PI*2;
    const size=.5+rand()*.8;dummy.scale.set(size*.65,size*.55,size*.65);dummy.updateMatrix();
    grasses.setMatrixAt(placed,dummy.matrix);
    color.set(pick(['#92ad66','#b5bf76','#729b5c','#a3b371']));grasses.setColorAt(placed,color);placed++;
  }
  grasses.count=placed;grasses.instanceMatrix.needsUpdate=true;
  grassMat.onBeforeCompile=shader=>{
    shader.uniforms.uTime={value:0};grasses.userData.shader=shader;
    shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n vec4 root = instanceMatrix * vec4(position,1.); transformed.x += sin(root.x*.35+root.z*.25+uTime*1.25)*position.y*.22;');
  };
  // Individual flowers around paths and gardens.
  const stemMat=mat('#466d42'),petals=[mat('#ede0a3'),mat('#c58c74'),mat('#cfb6cd')],pollen=mat('#c59535');
  const flowerGeo=new THREE.SphereGeometry(1,6,4);
  const flowerMesh=new THREE.InstancedMesh(flowerGeo,mat('#fff4c7'),2200);
  const stemMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.014,.018,.35,4),stemMat,440);
  group.add(flowerMesh,stemMesh);flowerMesh.castShadow=false;
  let flowerCount=0;
  for(let attempt=0;attempt<1200&&flowerCount<440;attempt++){
    const x=(rand()-.5)*68,z=(rand()-.5)*49;
    if(!plantedGround(x,z,.22))continue;
    const i=flowerCount++;
    const y=heightAt(x,z)+.07;
    dummy.position.set(x,y+.17,z);dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();
    stemMesh.setMatrixAt(i,dummy.matrix);
    const petalColor=new THREE.Color(pick(['#efdba1','#d2b9cf','#e8ca8a','#c99576']));
    for(let p=0;p<5;p++){
      const a=p/5*Math.PI*2;
      dummy.position.set(x+Math.cos(a)*.09,y+.35,z+Math.sin(a)*.09);
      dummy.scale.set(.082,.035,.065);dummy.updateMatrix();
      flowerMesh.setMatrixAt(i*5+p,dummy.matrix);flowerMesh.setColorAt(i*5+p,petalColor);
    }
  }
  stemMesh.count=flowerCount;flowerMesh.count=flowerCount*5;
  // Small shrubs fill the architectural bases without hiding faces.
  for(let i=0;i<100;i++){
    const x=between(-45,45),z=between(-37,20);
    if(!plantedGround(x,z,1.1))continue;
    ball(group,pick(leaves),[x,heightAt(x,z)+.3,z],[between(.4,1),between(.35,.65),between(.4,1)]);
  }
  return {group,treeCrowns,grasses,leaves,foliage,tree};
}
