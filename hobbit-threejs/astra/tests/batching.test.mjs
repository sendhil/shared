import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,BoxGeometry,Group,InstancedMesh,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {batchStaticMeshes} from '../src/world/batching.js';

test('static batching preserves precise world bounds through transformed parents',()=>{
  const root=new Group(),parent=new Group();root.add(parent);
  parent.position.set(2,3,-4);parent.rotation.y=.7;parent.scale.set(1.2,.8,1.1);
  const geometry=new BoxGeometry(1,2,3),material=new MeshStandardMaterial();
  for(let i=0;i<4;i++){
    const mesh=new Mesh(geometry,material);mesh.position.set(i*2,i*.3,-i);
    mesh.rotation.set(.2*i,-.3*i,.1*i);mesh.scale.set(1+i*.2,1,1);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  }
  const before=new Box3().setFromObject(root,true);
  const expectedVertices=geometry.attributes.position.count*4;
  const result=batchStaticMeshes(root);
  const after=new Box3().setFromObject(root,true);
  assert.equal(result.batches,1);assert.equal(parent.children.length,1);
  assert.ok(before.min.distanceTo(after.min)<1e-5);assert.ok(before.max.distanceTo(after.max)<1e-5);
  const merged=parent.children[0];
  assert.equal(merged.material,material);assert.equal(merged.geometry.attributes.position.count,expectedVertices);
  assert.equal(merged.castShadow,true);assert.equal(merged.receiveShadow,true);
  const normal=new Vector3(),normals=merged.geometry.attributes.normal;
  for(let i=0;i<normals.count;i++){normal.fromBufferAttribute(normals,i);assert.ok(Math.abs(normal.length()-1)<1e-6);}
  assert.equal(geometry.attributes.position.count,24,'shared source geometry remains intact');
});

test('animated exclusions, instancing, visibility, layers and shadow semantics survive batching',()=>{
  const root=new Group(),material=new MeshStandardMaterial(),geometry=new BoxGeometry();
  const animated=new Mesh(geometry,material),instanced=new InstancedMesh(geometry,material,2);
  const hidden=new Mesh(geometry,material);hidden.visible=false;
  const shadowed=new Mesh(geometry,material);shadowed.castShadow=true;
  const layered=new Mesh(geometry,material);layered.layers.set(2);
  const a=new Mesh(geometry,material),b=new Mesh(geometry,material);
  const pivot=new Group();pivot.position.x=3;root.add(pivot);pivot.add(animated);
  root.add(instanced,hidden,shadowed,layered,a,b);
  batchStaticMeshes(root,new Set([animated]));
  assert.equal(animated.parent,pivot);assert.equal(instanced.parent,root);assert.equal(hidden.parent,root);
  assert.equal(shadowed.parent,root);assert.equal(layered.parent,root);
  assert.ok(a.parent===null);assert.ok(b.parent===null);
  pivot.position.x=8;animated.rotation.y=1.4;root.updateMatrixWorld(true);
  assert.equal(animated.getWorldPosition(new Vector3()).x,8);
  assert.equal(animated.rotation.y,1.4);assert.equal(hidden.visible,false);assert.equal(layered.layers.mask,4);
});

test('separate material identities and transparent sorting are retained',()=>{
  const root=new Group(),geometry=new BoxGeometry();
  const a=new Mesh(geometry,new MeshStandardMaterial()),b=new Mesh(geometry,new MeshStandardMaterial());
  const transparent=new MeshStandardMaterial({transparent:true,opacity:.5});
  const c=new Mesh(geometry,transparent),d=new Mesh(geometry,transparent);root.add(a,b,c,d);
  batchStaticMeshes(root);assert.equal(root.children.length,4);
  a.material.color.set('red');assert.notEqual(a.material.color.getHex(),b.material.color.getHex());
});
