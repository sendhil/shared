import * as THREE from 'three';
import {ball,box,rod,mesh,mat,palette,between,pick,textTexture,curveTube,noiseTexture} from './util.js';
import {heightAt,HERO} from './terrain.js';
import {grainTexture} from './surfaces.js';

function archShape(width,height) {
  const r=width/2,shape=new THREE.Shape();
  shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,height-r);
  shape.absarc(0,height-r,r,0,Math.PI,false);shape.closePath();return shape;
}
function arch(parent,width,height,depth,material,pos) {
  return mesh(new THREE.ExtrudeGeometry(archShape(width,height),{depth,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1,curveSegments:20}),material,parent,pos);
}
export function lantern(parent,x,y,z,scale=1) {
  const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
  const iron=mat('#493c33',{metalness:.5,roughness:.6});
  rod(g,iron,[0,.38,0],[0,.84,0],.025);
  const glass=ball(g,mat('#ffdf9c',{emissive:'#ffb454',emissiveIntensity:.85,roughness:.3}),[0,0,0],[.18,.27,.18]);
  mesh(new THREE.ConeGeometry(.27,.17,6),iron,g,[0,.33,0]);
  mesh(new THREE.CylinderGeometry(.22,.15,.08,6),iron,g,[0,-.3,0]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(g,iron,[Math.cos(a)*.19,-.25,Math.sin(a)*.19],[Math.cos(a)*.19,.25,Math.sin(a)*.19],.016);}
  return {root:g,glass};
}

export function buildArchitecture(scene) {
  const group=new THREE.Group();scene.add(group);
  const stoneMats=['#b8aa8b','#c6b697','#a79a7f','#d2c4a5'].map(c=>mat(c));
  const plasterTexture=grainTexture('earth',3),woodTexture=grainTexture('wood',2);
  const plaster=mat('#d6bb92',{map:plasterTexture,bumpMap:plasterTexture,bumpScale:.035});
  const wood=mat(palette.timber,{map:woodTexture,bumpMap:woodTexture,bumpScale:.02}),warm=mat('#ffc878',{emissive:'#dd8c39',emissiveIntensity:.42});
  const turf=mat('#748945'),metal=mat('#b99055',{metalness:.48,roughness:.4});
  const lanterns=[],smokestacks=[],doors=[],homes=[];let porchLight;
  function home(x,z,s=1,angle=0,hero=false,color='#497d80') {
    const root=new THREE.Group();root.position.set(x,heightAt(x,z),z);root.rotation.y=angle;root.scale.setScalar(s);group.add(root);
    const mound=ball(root,turf,[0,-.4,-3.4],[7.1,4.9,6.2]);
    // Rounded ochre plaster and hand-cut sandstone frame the turf roof.
    const face=new THREE.Shape();
    face.moveTo(-5.65,0);face.lineTo(5.65,0);face.lineTo(5.65,1.4);
    face.bezierCurveTo(5.45,4.6,2.8,4.6,0,4.6);
    face.bezierCurveTo(-2.8,4.6,-5.45,4.6,-5.65,1.4);face.closePath();
    mesh(new THREE.ExtrudeGeometry(face,{depth:2.9,bevelEnabled:true,bevelSize:.13,bevelThickness:.15,bevelSegments:3,curveSegments:24}),[plaster,turf],root,[0,0,.4]);
    // Retaining stones and a broad terrace.
    const terrace=mesh(new THREE.CylinderGeometry(7.4,7.65,.55,48),mat('#9b997f'),root,[0,-.2,4.4],[1,1,.57]);
    // Follow the sloping ground beneath the level terrace; the porch is built
    // into its hill, with a retaining wall rather than an unsupported rim.
    const foundationVertices=[],foundationIndices=[],foundationUV=[];
    for(let i=0;i<=72;i++){
      const a=i/72*Math.PI*2,lx=Math.cos(a)*7.57,lz=4.4+Math.sin(a)*4.31;
      const wx=x+s*(lx*Math.cos(angle)+lz*Math.sin(angle));
      const wz=z+s*(-lx*Math.sin(angle)+lz*Math.cos(angle));
      const bottom=Math.min(-.47,(heightAt(wx,wz)-root.position.y)/s-.16);
      foundationVertices.push(lx,-.24,lz,lx,bottom,lz);
      foundationUV.push(i/72*10,0,i/72*10,-bottom*.7);
      if(i<72){const j=i*2;foundationIndices.push(j,j+2,j+1,j+2,j+3,j+1);}
    }
    const foundation=new THREE.BufferGeometry();
    foundation.setAttribute('position',new THREE.Float32BufferAttribute(foundationVertices,3));
    foundation.setAttribute('uv',new THREE.Float32BufferAttribute(foundationUV,2));
    foundation.setIndex(foundationIndices);foundation.computeVertexNormals();
    mesh(foundation,mat('#a49a7d',{map:plasterTexture,bumpMap:plasterTexture,bumpScale:.045}),root);
    for(let i=0;i<58;i++){
      const a=i/58*Math.PI*2;
      const b=box(root,pick(stoneMats),[Math.cos(a)*7.39,.025,4.4+Math.sin(a)*4.20],[.61,.19,.32]);
      b.rotation.y=Math.atan2(-4.20*Math.cos(a),-7.39*Math.sin(a));
    }
    for(let step=0;step<4;step++)box(root,pick(stoneMats),[0,-.12-step*.2,8.1+step*.42],[3.0+step*.3,.24,.75]);
    // The door is a real hinge, with a luminous dark vestibule behind it.
    arch(root,2.25,3.18,.16,wood,[0,.02,3.36]);
    arch(root,1.93,2.96,.12,mat('#302f27',{emissive:'#925627',emissiveIntensity:.12}),[0,.04,3.55]);
    const hinge=new THREE.Group();hinge.position.set(-.93,.06,3.76);root.add(hinge);
    const leaf=arch(hinge,1.84,2.88,.10,mat(color,{map:woodTexture,bumpMap:woodTexture,bumpScale:.013}),[.92,0,0]);
    for(let p=-3;p<=3;p++)rod(hinge,mat('#30595a'),[.92+p*.24,.12,.13],[.92+p*.24,2.15+Math.sqrt(Math.max(0,.85*.85-(p*.24)**2)),.13],.012);
    for(const y of [.52,1.86])box(hinge,metal,[.36,y,.16],[.66,.085,.045]);
    ball(hinge,metal,[1.57,1.3,.18],[.09,.09,.07]);
    doors.push(hinge);
    for(let i=0;i<15;i++){
      const a=i/14*Math.PI,block=box(root,pick(stoneMats),[Math.cos(a)*1.21,1.98+Math.sin(a)*1.21,3.6],[.26,.37,.37]);
      block.rotation.z=a-Math.PI/2;
    }
    for(const side of [-1,1]){
      const wx=side*3.42;
      mesh(new THREE.CylinderGeometry(.99,.99,.14,32),wood,root,[wx,2.09,3.46]).rotation.x=Math.PI/2;
      mesh(new THREE.CircleGeometry(.84,32),warm,root,[wx,2.09,3.57]);
      box(root,wood,[wx,2.09,3.63],[.075,1.66,.09]);box(root,wood,[wx,2.09,3.63],[1.66,.075,.09]);
      for(const dx of [-.45,.45])box(root,wood,[wx+dx,2.09,3.62],[.035,1.4,.06]);
      box(root,wood,[wx,1.03,3.8],[2.25,.16,.64]);
      box(root,mat('#855744'),[wx,.82,3.86],[1.94,.35,.5]);
      for(let f=0;f<11;f++){
        const fx=wx+(f/10-.5)*1.8;
        rod(root,mat('#477044'),[fx,1.0,3.88],[fx+Math.sin(f)*.1,1.36,3.88],.025);
        ball(root,mat(pick(['#e2ad86','#e8cea2','#ac758f'])),[fx,1.4+Math.sin(f*3)*.08,3.87],[.115,.1,.10]);
      }
      rod(root,wood,[side*1.64,3.0,3.6],[side*1.64,3.0,4.06],.048);
      lanterns.push(lantern(root,side*1.64,2.50,4.02,.66));
    }
    // Timber brow, chimney pot, ivy and garden trim.
    curveTube(root,[[-5.7,1.4,3.48],[-4.95,3.42,3.48],[-2.7,4.54,3.48],[0,4.75,3.48],[2.7,4.54,3.48],[4.95,3.42,3.48],[5.7,1.4,3.48]],.11,wood,40);
    for(let row=0;row<7;row++)for(let j=0;j<3;j++)box(root,pick(stoneMats),[-3.1+(j-1)*.37+(row%2)*.08,3.5+row*.23,-.2],[.36,.215,.95]);
    mesh(new THREE.CylinderGeometry(.58,.47,.17,8),wood,root,[-3.06,5.09,-.2]);
    const chimney=new THREE.Object3D();chimney.position.set(-3.05,5.35,-.2);root.add(chimney);smokestacks.push(chimney);
    const ivyMat=mat('#5e8455');
    curveTube(root,[[-5.5,.2,3.55],[-5.55,1.0,3.58],[-5.4,2,3.6],[-4.9,3.2,3.6],[-4.1,3.8,3.6]],.027,ivyMat,24);
    for(let i=0;i<42;i++){
      const yy=.25+i*.082,xx=-5.5+Math.max(0,yy-1.7)*.55+Math.sin(i*2.4)*.22;
      const leaf=ball(root,ivyMat,[xx,yy,3.58],[.10,.14,.027]);leaf.rotation.z=Math.sin(i*2)*.7;
    }
    for(let row=0;row<2;row++)for(let s0=0;s0<23;s0++){
      const x=-5.4+s0*.48+(row%2)*.21;
      if(Math.abs(x)<1.26||x>5.55)continue;
      const stone=box(root,stoneMats[(s0+row)%4],[x,.15+row*.28,3.42],[.445,.255,.22]);
      stone.rotation.z=Math.sin(s0*8+row)*.045;
    }
    const pathStones=new THREE.Group();root.add(pathStones);
    for(let i=0;i<15;i++) {
      const x=(i%3-1)*.75,z0=4.2+Math.floor(i/3)*.66;
      const slab=mesh(new THREE.CylinderGeometry(.46,.47,.05,7),pick(stoneMats),pathStones,[x,.105,z0],[1,1,.8]);slab.rotation.y=i*.72;
    }
    if(hero){
      porchLight=new THREE.PointLight('#ffbf78',1.0,8,1.6);porchLight.position.set(-.4,2.4,4.6);root.add(porchLight);
      box(root,wood,[4.6,.48,6.18],[2.3,.14,.68]);
      for(const dx of [-.82,.82])box(root,wood,[4.6+dx,.2,6.18],[.13,.5,.55]);
      box(root,wood,[4.6,1.0,5.9],[2.3,.16,.10]);
      for(const dx of [-.95,.95])rod(root,wood,[4.6+dx,.4,5.9],[4.6+dx,1.1,5.9],.05);
    }
    homes.push(root);return {root,door:hinge,terrace};
  }
  const hero=home(0,-12,1,0,true,'#37767b');
  [
    [-19,2,.57,.26,'#9e6261'],[18,5,.62,-.27,'#44757d'],
    [-29,-18,.57,.55,'#7a7880'],[31,-14,.65,-.44,'#b27f49'],
    [-39,13,.50,.25,'#477771'],[39,20,.53,-.35,'#896557'],
    [-53,-19,.6,.5,'#976554'],[54,-26,.7,-.5,'#5a7472'],
    [-22,-36,.5,.5,'#596f71'],[21,-38,.5,-.5,'#8c6852'],
  ].forEach(p=>home(p[0],p[1],p[2],p[3],false,p[4]));
  // A mossy, slightly humped timber bridge in the foreground.
  const bridge=new THREE.Group();bridge.position.set(-3,-.05,29+Math.sin(-3*.047)*5);scene.add(bridge);
  for(let i=0;i<22;i++){
    const z=(i-10.5)*.4,y=.7+Math.cos(z/5*Math.PI/2)*.65;
    const plank=box(bridge,mat(i%2?'#997953':'#af8e64'),[0,y,z],[4.0,.18,.37]);plank.rotation.y=Math.sin(i*7)*.009;
  }
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){const z=-4+i*2,y=.7+Math.cos(z/5*Math.PI/2)*.65;rod(bridge,wood,[side*1.85,y,z],[side*1.85,y+1.0,z],.065);}
    curveTube(bridge,[-4,-2,0,2,4].map(z=>[side*1.85,1.7+Math.cos(z/5*Math.PI/2)*.65,z]),.06,wood);
  }
  return {group,hero,homes,doors,lanterns,smokestacks,bridge,porchLight,warm};
}
