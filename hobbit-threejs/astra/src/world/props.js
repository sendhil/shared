import * as THREE from 'three';
import {mat,ball,box,rod,mesh,curveTube,between,pick,palette,textTexture,rng} from './util.js';
import {heightAt,HERO} from './terrain.js';
import {lantern} from './architecture.js';
import {grainTexture} from './surfaces.js';

export function buildProps(scene,architecture) {
  const group=new THREE.Group();scene.add(group);
  const woodGrain=grainTexture('wood',2),potteryGrain=grainTexture('earth',2);
  const wood=mat('#70533c',{map:woodGrain,bumpMap:woodGrain,bumpScale:.018}),rope=mat('#bdaa78'),cloths=['#b87857','#789787','#d4b667','#947488'].map(c=>mat(c,{side:THREE.DoubleSide}));
  const flags=[],lanterns=[];
  function string(a,b,sag=.8) {
    const p=[];
    for(let i=0;i<=20;i++){const t=i/20;p.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-Math.sin(t*Math.PI)*sag,a[2]+(b[2]-a[2])*t]);}
    curveTube(group,p,.017,rope);
    for(let i=1;i<20;i++){
      const pos=p[i],g=new THREE.Group();g.position.set(...pos);group.add(g);
      const shape=new THREE.Shape();shape.moveTo(-.24,0);shape.lineTo(.24,0);shape.lineTo(.08,-.62);shape.lineTo(-.08,-.62);shape.closePath();
      const m=mesh(new THREE.ShapeGeometry(shape),cloths[i%4],g);
      if(a[2]===-5&&b[2]===-5&&i>=7&&i<=13)m.visible=false;
      g.rotation.y=Math.atan2(b[2]-a[2],b[0]-a[0]);flags.push({root:g,phase:i*.83});
      if(i%4===0&&!(a[2]===-5&&b[2]===-5&&i>=7&&i<=13))lanterns.push(lantern(group,pos[0],pos[1]-.6,pos[2],.65));
    }
  }
  const Y=HERO.y;
  for(const x of [-7.4,7.4])rod(group,wood,[x,heightAt(x,-5),-5],[x,Y+5.8,-5],.095);
  string([-7.4,Y+5.8,-5],[7.4,Y+5.8,-5],.65);
  string([-7.4,Y+4,-5],[-14,heightAt(-14,9)+3.4,9],.55);
  string([7.4,Y+4,-5],[14,heightAt(14,9)+3.4,9],.55);
  for(const x of [-14,14])rod(group,wood,[x,heightAt(x,9),9],[x,heightAt(x,9)+3.4,9],.075);
  // The birthday cloth opens in response to the spoken announcement.
  const banner=new THREE.Group();banner.position.set(0,Y+4.9,-7.9);group.add(banner);
  const bannerMat=mat('#ffffff',{map:textTexture('111',{font:'210px Georgia',background:'#e1bc75',color:'#513e38'}),side:THREE.DoubleSide});
  const bannerMesh=mesh(new THREE.PlaneGeometry(3.35,1.68,24,12),bannerMat,banner,[0,-.84,0]);
  const bannerRest=new Float32Array(bannerMesh.geometry.attributes.position.array);
  for(const y of [0,-1.68])rod(banner,wood,[-1.82,y,0],[1.82,y,0],.055);
  for(const x of [-1.82,1.82])rod(group,wood,[x,Y+.1,-7.92],[x,Y+5.04,-7.92],.045);
  const cordGeometry=new THREE.BufferGeometry();
  cordGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(25*3),3));
  const bannerCord=new THREE.Line(cordGeometry,new THREE.LineBasicMaterial({color:'#d2ba8a'}));
  bannerCord.frustumCulled=false;group.add(bannerCord);

  function barrel(x,y,z,s=1) {
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);group.add(g);
    const profile=[[.0,.39],[.08,.44],[.3,.5],[.6,.5],[.86,.44],[.93,.39]].map(([y,r])=>new THREE.Vector2(r,y));
    mesh(new THREE.LatheGeometry(profile,14),mat('#a0794e'),g);
    for(const y of [.15,.76])mesh(new THREE.TorusGeometry(.46,.029,6,24),mat('#534e42',{metalness:.35}),g,[0,y,0]).rotation.x=Math.PI/2;
    mesh(new THREE.CylinderGeometry(.38,.38,.06,14),wood,g,[0,.95,0]);
    return g;
  }
  const tables=[];
  for(const [x,z,angle] of [[-8,3,.24],[9,7,-.2],[-11,13,.18]]){
    const g=new THREE.Group();g.position.set(x,heightAt(x,z),z);g.rotation.y=angle;group.add(g);
    box(g,wood,[0,.84,0],[4.2,.15,1.12]);
    for(const dx of [-1.6,1.6])for(const dz of [-.35,.35])box(g,wood,[dx,.4,dz],[.12,.9,.12]);
    for(const dz of [-.92,.92]){
      box(g,wood,[0,.47,dz],[4.3,.12,.35]);
      for(const dx of [-1.6,1.6])box(g,wood,[dx,.23,dz],[.13,.5,.3]);
    }
    const linen=box(g,mat('#d9c69e'),[0,.935,0],[2.8,.035,1.13]);
    for(let i=0;i<4;i++){
      const xx=-1.45+i*.95;
      mesh(new THREE.CylinderGeometry(.23,.21,.027,24),mat('#e5d8ba'),g,[xx,.98,.16]);
      ball(g,mat('#bd853f'),[xx,1.06,.16],[.17,.08,.12]);
      mesh(new THREE.CylinderGeometry(.073,.065,.19,12),mat('#b2885e'),g,[xx+.27,1.07,-.23]);
    }
    tables.push(g);
  }
  barrel(7,heightAt(7,3),3);barrel(7.9,heightAt(7.9,3.1),3.1,.8);barrel(-11,heightAt(-11,0),0);
  // Cart, produce, baskets and wheel spokes.
  const cart=new THREE.Group();cart.position.set(-7,heightAt(-7,12),12);cart.rotation.y=-.7;group.add(cart);
  box(cart,wood,[0,.68,0],[1.4,.12,2.1]);
  for(const x of [-.73,.73])for(let row=0;row<3;row++)box(cart,wood,[x,.83+row*.18,0],[.06,.14,2.1]);
  for(const x of [-.87,.87]){
    const wheel=mesh(new THREE.TorusGeometry(.5,.065,8,24),wood,cart,[x,.5,.26]);wheel.rotation.y=Math.PI/2;
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;rod(cart,wood,[x,.5,.26],[x,.5+Math.cos(a)*.49,.26+Math.sin(a)*.49],.025);}
  }
  for(const x of [-.52,.52])rod(cart,wood,[x,.67,-.9],[x,.61,-3.1],.05);
  for(let i=0;i<25;i++)ball(cart,mat(pick(['#c78b42','#b8a255','#bd6947'])),[between(-.52,.52),1.0+Math.floor(i/12)*.15,between(-.8,.8)],[.17,.16,.17]);
  // Low woven fencing keeps the path legible.
  for(const side of [-1,1]){
    for(let i=0;i<10;i++){
      const z=-1+i*2.1,x=side*(5.3+Math.sin(z*.17)*.5),y=heightAt(x,z);
      rod(group,wood,[x,y,z],[x,y+.85,z],.055);
      if(i<9){const nz=z+2.1,nx=side*(5.3+Math.sin(nz*.17)*.5),ny=heightAt(nx,nz);
        for(const h of [.32,.68])rod(group,wood,[x,y+h,z],[nx,ny+h,nz],.033);
      }
    }
  }
  // Conjectural underground vault: curved brick ribs, coins, sealed jars, chest.
  const vault=new THREE.Group();vault.position.set(110,0,0);scene.add(vault);
  const brick=mat('#745340'),dark=mat('#332e2c');
  box(vault,mat('#5d4c39'),[0,-.2,-3],[18,.4,25]);
  box(vault,dark,[0,3,-13],[18,9,.4]);
  for(const x of [-7.8,7.8])box(vault,dark,[x,2.7,-2],[.4,6,24]);
  const ribs=[];
  for(let r=0;r<6;r++){
    const z=2-r*3;
    for(let i=0;i<19;i++){
      const a=i/18*Math.PI,b=box(vault,mat(i%3?'#84624a':'#947250'),[Math.cos(a)*7.6,1.8+Math.sin(a)*5.2,z],[.8,.62,.68]);b.rotation.z=a-Math.PI/2;
    }
    for(const x of [-7.6,7.6])box(vault,brick,[x,.8,z],[.62,1.6,.72]);
  }
  const gold=mat('#d6ac50',{metalness:.64,roughness:.4});
  // Ground every stack; a surface-only mound leaves coins hovering in space.
  const coinMatrices=[],stackCenters=[],d=new THREE.Object3D();
  for(let attempt=0;attempt<5000&&stackCenters.length<310;attempt++){
    const x=between(-3.35,3.35),z=between(-3.35,3.35);
    const radius=Math.hypot(x,z);
    if(radius>3.35)continue;
    if(Math.abs(x-.25)<1.43&&Math.abs(z+.9)<.99)continue;
    if(stackCenters.some(p=>Math.hypot(x-p[0],z-p[1])<.275))continue;
    stackCenters.push([x,z]);
    const levels=1+Math.floor((1-radius/3.5)*5+rng()*2);
    const lift=rng()*.006;
    for(let level=0;level<levels;level++){
      d.position.set(x+between(-.007,.007),.022+lift+level*.036,z-2.8+between(-.007,.007));
      d.rotation.set(between(-.025,.025),rng()*6,between(-.025,.025));d.updateMatrix();coinMatrices.push(d.matrix.clone());
    }
  }
  const coins=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.13,.035,24),gold,coinMatrices.length);
  coinMatrices.forEach((matrix,i)=>coins.setMatrixAt(i,matrix));vault.add(coins);
  const chest=new THREE.Group();chest.position.set(.25,0,-3.7);chest.rotation.y=-.13;vault.add(chest);
  const chestWood=mat('#714533',{map:woodGrain,bumpMap:woodGrain,bumpScale:.025});
  box(chest,chestWood,[0,.06,0],[2.6,.12,1.6]);
  for(const z of [-.74,.74])box(chest,chestWood,[0,.53,z],[2.6,.94,.12]);
  for(const x of [-1.24,1.24])box(chest,chestWood,[x,.53,0],[.12,.94,1.48]);
  for(let i=0;i<65;i++){
    const coin=mesh(new THREE.CylinderGeometry(.14,.14,.034,24),gold,chest,[between(-1.07,1.07),.80+rng()*.08,between(-.58,.58)]);
    coin.rotation.z=between(-.12,.12);
  }
  const lid=new THREE.Group();lid.position.set(0,1,-.8);chest.add(lid);
  mesh(new THREE.CylinderGeometry(.8,.8,2.6,32,1,false,0,Math.PI),mat('#83563a',{map:woodGrain,bumpMap:woodGrain,bumpScale:.022}),lid,[0,0,.8]).rotation.z=Math.PI/2;
  for(const x of [-.88,.88]){
    box(chest,gold,[x,.5,.82],[.14,.94,.06]);box(chest,gold,[x,.04,0],[.14,.07,1.6]);
    curveTube(lid,Array.from({length:17},(_,i)=>[x,Math.sin(i/16*Math.PI)*.81,.8+Math.cos(i/16*Math.PI)*.81]),.057,gold);
  }
  box(chest,gold,[0,.64,.85],[.23,.32,.09]);
  for(let i=0;i<12;i++){
    const x=(i%2?-1:1)*(4.4+rng()*1.8),z=-i*1.08+1;
    const ceramic=mat(pick(['#b8844f','#9c694d','#657c71']),{map:potteryGrain,bumpMap:potteryGrain,bumpScale:.018,roughness:.8});
    mesh(new THREE.LatheGeometry([[0,0],[.6,0],[.7,.25],[.6,.9],[.26,1.2],[.28,1.4],[.23,1.4],[.21,1.26]].map(p=>new THREE.Vector2(...p)),28),ceramic,vault,[x,0,z]);
    mesh(new THREE.TorusGeometry(.258,.033,8,28),ceramic,vault,[x,1.4,z]).rotation.x=Math.PI/2;
  }
  const vaultLight=new THREE.PointLight('#ffbb67',55,35,1.5);vaultLight.position.set(0,4,1);vault.add(vaultLight);
  const chestLight=new THREE.PointLight('#ffcc59',8,8,2);chestLight.position.set(.25,1.8,-3.7);vault.add(chestLight);
  for(const x of [-6.6,6.6])for(const z of [0,-7]){
    lanterns.push(lantern(vault,x,2.2,z,1.1));
    const light=new THREE.PointLight('#ed9943',11,11,1.4);light.position.set(x,2.3,z);vault.add(light);
  }
  return {group,flags,lanterns,banner,bannerMesh,bannerRest,bannerCord,tables,cart,vault,chest,lid,coins,vaultLight,chestLight};
}
