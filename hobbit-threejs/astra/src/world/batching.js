import {Mesh} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Merge only static siblings. Animated pivots, shared material identities and
// per-object rendering semantics remain intact.
export function batchStaticMeshes(root,excluded=new Set()) {
  const stats={batches:0,removedMeshes:0};
  function visit(parent){
    for(const child of [...parent.children])visit(child);
    const buckets=new Map();
    for(const child of parent.children){
      if(!child.isMesh||child.isInstancedMesh||child.isSkinnedMesh||child.children.length||excluded.has(child))continue;
      const {geometry,material}=child;
      if(!child.visible||Array.isArray(material)||material.transparent||child.customDepthMaterial||child.customDistanceMaterial)continue;
      if(Object.keys(geometry.morphAttributes).length||geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity)continue;
      if(child.matrixAutoUpdate)child.updateMatrix();
      if(child.matrix.determinant()<0)continue;
      const attributes=Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b));
      if(attributes.some(([,attribute])=>attribute.isInterleavedBufferAttribute))continue;
      const layout=attributes.map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).join(',');
      const key=[material.uuid,!!geometry.index,layout,child.castShadow,child.receiveShadow,child.layers.mask,child.renderOrder,child.frustumCulled].join('|');
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(child);
    }
    for(const siblings of buckets.values()){
      if(siblings.length<2)continue;
      const copies=siblings.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrix));
      const geometry=mergeGeometries(copies,false);
      for(const copy of copies)copy.dispose();
      if(!geometry)continue;
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const first=siblings[0],batch=new Mesh(geometry,first.material);
      batch.name=`Static batch (${siblings.length} pieces)`;
      batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
      batch.layers.mask=first.layers.mask;batch.renderOrder=first.renderOrder;batch.frustumCulled=first.frustumCulled;
      parent.remove(...siblings);parent.add(batch);
      stats.batches++;stats.removedMeshes+=siblings.length-1;
    }
  }
  visit(root);return stats;
}
