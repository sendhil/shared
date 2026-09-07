import * as THREE from 'three';
import {canvasTexture,random} from './util.js';

export function grainTexture(kind='earth',repeats=1) {
  const texture=canvasTexture(256,256,(ctx,w,h)=>{
    const rand=random(kind==='cloth'?63:97);
    ctx.fillStyle=kind==='cloth'?'#ddd9c9':'#eeeee5';ctx.fillRect(0,0,w,h);
    if(kind==='cloth'){
      for(let i=0;i<w;i+=4){ctx.fillStyle=i%8?'#ffffff18':'#574e441c';ctx.fillRect(i,0,1,h);}
      for(let i=0;i<h;i+=4){ctx.fillStyle=i%8?'#ffffff18':'#574e441c';ctx.fillRect(0,i,w,1);}
    }
    for(let i=0;i<18000;i++){
      const shade=rand()>.5?'rgba(255,255,244,.18)':'rgba(51,57,37,.12)';
      ctx.fillStyle=shade;ctx.fillRect(rand()*w,rand()*h,rand()*2.5+.5,rand()*1.3+.5);
    }
    if(kind==='wood'){
      for(let i=0;i<85;i++){
        ctx.strokeStyle='rgba(80,49,21,.07)';ctx.lineWidth=rand()*2+.4;
        ctx.beginPath();const x=rand()*w;
        ctx.moveTo(x,0);ctx.bezierCurveTo(x+rand()*9,60,x-rand()*8,190,x,256);ctx.stroke();
      }
    }
  });
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeats,repeats);
  return texture;
}

export function addLeafCanopies(group,crowns) {
  const rand=random(513),perCrown=380;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,.034, -.19,0,0, -.015,.097,0, .23,0,0, -.015,-.097,0
  ],3));
  geometry.setIndex([0,1,2,0,2,3,0,3,4,0,4,1]);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.88,side:THREE.DoubleSide});
  const leaves=new THREE.InstancedMesh(geometry,material,crowns.length*perCrown);
  leaves.castShadow=true;leaves.receiveShadow=true;
  const dummy=new THREE.Object3D(),normal=new THREE.Vector3(),up=new THREE.Vector3(0,0,1),color=new THREE.Color();
  group.updateMatrixWorld(true);
  let index=0;
  for(const crown of crowns){
    const mesh=crown.mesh;
    for(let n=0;n<perCrown;n++){
      const y=1-2*(n+.5)/perCrown,a=n*2.3999632297+rand()*.22,r=Math.sqrt(1-y*y);
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      const lobe=1+.12*Math.sin(x*4+crown.phase)+.10*Math.cos(z*4-y*3);
      const rad=(.77+rand()*.27)*lobe;
      dummy.position.set(x*rad,y*rad,z*rad);mesh.localToWorld(dummy.position);
      normal.set(x,y,z).normalize();dummy.quaternion.setFromUnitVectors(up,normal);
      dummy.rotateZ(rand()*Math.PI);const s=.9+rand()*.85;dummy.scale.setScalar(s);dummy.updateMatrix();
      leaves.setMatrixAt(index,dummy.matrix);
      color.copy(mesh.material.color).lerp(new THREE.Color('#aebc71'),rand()*.22).multiplyScalar(.9+rand()*.17);
      leaves.setColorAt(index,color);index++;
    }
    mesh.scale.multiplyScalar(.81);
    // An irregular inner volume connects the sprays without a spherical rim.
    mesh.geometry.dispose();mesh.geometry=new THREE.SphereGeometry(1,16,12);
    const vertices=mesh.geometry.attributes.position;
    for(let n=0;n<vertices.count;n++){
      const x=vertices.getX(n),y=vertices.getY(n),z=vertices.getZ(n);
      const lobe=1+.12*Math.sin(x*4+crown.phase)+.10*Math.cos(z*4-y*3);
      vertices.setXYZ(n,x*lobe,y*lobe,z*lobe);
    }
    mesh.geometry.computeVertexNormals();
  }
  group.add(leaves);
  material.onBeforeCompile=shader=>{
    shader.uniforms.uTime={value:0};leaves.userData.shader=shader;
    shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n vec4 leafRoot=instanceMatrix*vec4(position,1.); transformed.z += sin(leafRoot.x*1.7+leafRoot.z*.7+uTime*1.4)*.04;');
  };
  return leaves;
}
