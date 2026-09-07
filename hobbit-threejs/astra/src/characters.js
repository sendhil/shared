import * as THREE from 'three';
import {ball,box,rod,mesh,mat,random,pick,curveTube} from './world/util.js';
import {heightAt,HERO} from './world/terrain.js';
import {grainTexture} from './world/surfaces.js';
let clothTexture;

export function createCharacter({coat='#776778',hair='#5d4638',skin='#d7a581',scale=1,age=0,skirt=false,seed=1}={}) {
  const root=new THREE.Group();root.scale.setScalar(scale);
  const body=new THREE.Group();body.position.y=.48;root.add(body);
  clothTexture ||= grainTexture('cloth',3);
  const jacket=mat(coat,{map:clothTexture,bumpMap:clothTexture,bumpScale:.007}),shirt=mat('#e3cda7'),
    skinMat=mat(skin,{roughness:.83}),hairMat=mat(hair),pants=mat('#536359',{map:clothTexture,bumpMap:clothTexture,bumpScale:.005});
  const bodyProfile=[[.23,0],[.30,.10],[.33,.27],[.29,.48],[.24,.65],[.16,.72]].map(([r,y])=>new THREE.Vector2(r,y));
  mesh(new THREE.LatheGeometry(bodyProfile,20),jacket,body,[0,0,0],[1,1,.77]);
  // A waistcoat, lapels and small brass buttons give the silhouette an identity.
  ball(body,mat('#c4945f'),[0,.36,.197],[.19,.31,.075]);
  const collarL=box(body,shirt,[-.11,.63,.21],[.15,.16,.042]);collarL.rotation.z=.4;
  const collarR=box(body,shirt,[.11,.63,.21],[.15,.16,.042]);collarR.rotation.z=-.4;
  for(const x of [-.22,.22]){
    const lapel=box(body,jacket,[x,.43,.205],[.11,.43,.035]);lapel.rotation.z=x>0?-.18:.18;
    box(body,mat('#624744'),[x,.16,.22],[.125,.024,.026]);
  }
  const brass=mat('#d2ae6d',{metalness:.45,roughness:.4});
  for(let b=0;b<4;b++)ball(body,brass,[.035,.18+b*.105,.269],[.020,.020,.013]);
  const legs=[];
  for(const side of [-1,1]){
    const hip=new THREE.Group();hip.position.set(side*.15,.51,0);root.add(hip);legs.push(hip);
    ball(hip,pants,[0,-.11,0],[.145,.2,.15]);
    rod(hip,pants,[0,-.08,0],[side*.016,-.33,0],.11,.125);
    const cuff=mesh(new THREE.CylinderGeometry(.115,.12,.09,14),shirt,hip,[0,-.31,0]);
    rod(hip,skinMat,[0,-.34,0],[0,-.42,.035],.085);
    ball(hip,skinMat,[0,-.43,.115],[.143,.09,.25]);
    for(let j=0;j<4;j++)ball(hip,skinMat,[(j-1.5)*.06,-.443,.30+Math.cos(j)*.008],[.038,.05,.058]);
    for(let j=0;j<6;j++)ball(hip,hairMat,[(j%3-1)*.05,-.355,.11+Math.floor(j/3)*.06],[.031,.023,.027]);
  }
  if(skirt){
    const g=new THREE.LatheGeometry([[.4,.14],[.36,.22],[.31,.48],[.27,.64]].map(p=>new THREE.Vector2(...p)),24);
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),r=1+.05*Math.cos(Math.atan2(x,z)*12);
      pos.setX(i,x*r);pos.setZ(i,z*r);
    }
    g.computeVertexNormals();mesh(g,jacket,root,[0,.12,0]);
  }
  const arms=[];
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.285,.61,0);body.add(shoulder);
    ball(shoulder,jacket,[side*.01,-.09,0],[.118,.16,.13]);
    rod(shoulder,jacket,[0,-.05,0],[side*.035,-.29,0],.087,.11);
    const elbow=new THREE.Group();elbow.position.set(side*.035,-.27,0);shoulder.add(elbow);
    rod(elbow,jacket,[0,0,0],[0,-.22,0],.078,.086);
    mesh(new THREE.CylinderGeometry(.083,.083,.06,12),shirt,elbow,[0,-.21,0]);
    const hand=new THREE.Group();hand.position.y=-.29;elbow.add(hand);
    ball(hand,skinMat,[0,0,0],[.087,.115,.06]);
    for(let j=0;j<4;j++)ball(hand,skinMat,[(j-1.5)*.035,-.09,.008],[.02,.055,.024]);
    ball(hand,skinMat,[-side*.071,-.014,.027],[.034,.059,.031]);
    arms.push({shoulder,elbow,hand});
  }
  const neck=rod(body,skinMat,[0,.68,0],[0,.8,0],.11);
  const head=new THREE.Group();head.position.set(0,.87,.005);body.add(head);
  ball(head,skinMat,[0,.09,0],[.265,.30,.235]);
  // Cheeks and a rounded bridge read warmly in the near shots.
  ball(head,skinMat,[0,.025,.235],[.074,.088,.096]);
  ball(head,mat('#c78f74'),[-.172,-.012,.186],[.059,.036,.012]);
  ball(head,mat('#c78f74'),[.172,-.012,.186],[.059,.036,.012]);
  for(const side of [-1,1]){
    const ear=ball(head,skinMat,[side*.273,.084,-.01],[.105,.15,.075]);ear.rotation.z=-side*.5;
    const inner=ball(head,mat('#bc866d'),[side*.302,.085,.035],[.046,.088,.02]);inner.rotation.z=-side*.5;
  }
  const eyes=[],brows=[],pupils=[];
  const dark=mat('#3d302b');
  for(const side of [-1,1]){
    const eye=new THREE.Group();eye.position.set(side*.105,.109,.209);head.add(eye);
    ball(eye,mat('#f1e6cd'),[0,0,0],[.058,.050,.036]);
    const pupil=new THREE.Group();eye.add(pupil);pupils.push(pupil);
    ball(pupil,mat('#574f3a'),[0,0,.032],[.029,.033,.017]);
    ball(pupil,dark,[0,0,.047],[.015,.022,.009]);
    ball(pupil,mat('#fff6db'),[-.009,.012,.056],[.008,.009,.003]);
    eyes.push(eye);
    const brow=ball(head,hairMat,[side*.109,.184,.214],[.07,.018,.025]);brow.rotation.z=side*.10;
    brows.push(brow);
  }
  const mouth=new THREE.Group();mouth.position.set(0,-.083,.210);head.add(mouth);
  curveTube(mouth,[[-.079,-.004,-.006],[0,-.017,.015],[.079,.008,-.006]],.009,mat('#885842'),10);
  const rand=random(seed*99);
  // The curls sit over a continuous scalp, including in the return shot.
  mesh(new THREE.SphereGeometry(.245,20,12,0,Math.PI*2,0,Math.PI*.49),hairMat,head,[0,.235,-.026],[1,.78,.87]);
  for(let i=0;i<42;i++){
    const a=i/42*Math.PI*2,front=Math.cos(a)>.25;
    const yy=front?.30+rand()*.1:.16+rand()*.18;
    const xx=Math.sin(a)*.235,zz=Math.cos(a)*.18-.045;
    ball(head,(age>.5&&i%3===0)?mat('#aaa08a'):hairMat,[xx,yy,zz],[.064+rand()*.025,.064+rand()*.025,.067]);
  }
  if(skirt){
    for(let i=0;i<7;i++)ball(head,hairMat,[.235+Math.sin(i)*.015,.15-i*.045,-.08],[.060,.05,.055]);
  }
  if(age){
    for(const side of [-1,1]){
      curveTube(head,[[side*.09,.205,.222],[side*.15,.215,.203],[side*.19,.201,.185]],.004,mat('#ac816a'),6);
      curveTube(head,[[side*.16,.04,.217],[side*.20,.055,.192]],.003,mat('#ac816a'),4);
    }
  }
  root.userData={body,head,arms,legs,eyes,brows,pupils,mouth,seed,age};
  return root;
}

export function poseCharacter(character,t,{walk=0,wave=0,talk=0,unease=0,hold=0,bow=0,look=0,pull=0,gesture=0,shake=0,gaitDistance=null}={}) {
  const {body,head,arms,legs,eyes,brows,pupils,mouth,seed,age}=character.userData;
  const phase=(gaitDistance===null?t*8.2:gaitDistance/.85*Math.PI*2)+seed*1.7;
  body.position.y=.48+Math.sin(phase*2)*.017*walk+Math.sin(t*1.65+seed)*.006;
  body.rotation.set(bow*.26+age*.06+unease*.025,0,Math.sin(phase)*.025*walk-gesture*.025);
  head.rotation.set(Math.sin(t*1.75+seed)*.022+talk*Math.sin(t*2.2+seed)*.035+bow*.1+unease*.06,
    look+shake,
    unease*.035+Math.sin(t*.8+seed)*.018);
  mouth.scale.set(1-talk*.04*Math.sin(t*3+seed),1-unease*1.8,1);
  for(let i=0;i<2;i++){
    brows[i].rotation.z=(i===0?-1:1)*(.1+unease*.24);
    brows[i].position.y=.184+unease*(i===0?.018:.042);
    pupils[i].position.x=Math.max(-.013,Math.min(.013,look*.07));
  }
  for(let i=0;i<2;i++){
    const side=i===0?-1:1;
    legs[i].rotation.x=Math.sin(phase+i*Math.PI)*.47*walk;
    arms[i].shoulder.rotation.set(-Math.sin(phase+i*Math.PI)*.32*walk-hold*.65,0,side*(.13+talk*(.08+.08*Math.sin(t*2+seed))));
    arms[i].elbow.rotation.x=-.13-hold*.7-talk*.1;
    arms[i].elbow.rotation.z=0;
    arms[i].hand.rotation.set(0,0,0);
  }
  if(wave>0){
    arms[1].shoulder.rotation.z=2.25*wave+.12;
    arms[1].shoulder.rotation.x=-.2*wave;
    arms[1].elbow.rotation.z=.25*wave;
    arms[1].hand.rotation.z=Math.sin(t*5)*.22*wave;
  }
  if(pull>0){
    arms[0].shoulder.rotation.x=-pull*1.35;
    arms[0].shoulder.rotation.z=-.14;
    arms[0].elbow.rotation.x=-.13-pull*.7;
    head.rotation.x-=pull*.08;
  }
  if(gesture>0){
    arms[1].shoulder.rotation.x-=gesture*.55;
    arms[1].shoulder.rotation.z+=gesture*.6;
    arms[1].elbow.rotation.x-=gesture*.85;
    arms[1].hand.rotation.y=gesture*.9;
    arms[1].hand.rotation.z=gesture*.25;
  }
  const blinkPhase=(t+seed*.712)%4.7;
  const blink=blinkPhase>.1?1:.15+Math.abs(blinkPhase-.05)*17;
  for(const eye of eyes)eye.scale.y=blink;
}

export function buildCharacters(scene) {
  const group=new THREE.Group();scene.add(group);
  const bilbo=createCharacter({coat:'#755067',hair:'#705443',skin:'#d7ac88',scale:1.20,age:.12,seed:1});
  bilbo.position.set(-1.9,HERO.y+.12,-6.35);group.add(bilbo);
  const residents=[];
  const placements=[
    [-3.6,.9,.93,false,0], [2.8,1.5,.99,true,0],[-2.3,3.2,.98,false,1],
    [.7,4.2,.92,true,1],[-1.4,9.6,.82,false,0],[2.4,12,.83,true,0],
    [-9.3,4.7,1,false,0],[9.2,9.0,.95,true,0],[-9.4,14.7,.92,false,0],
    [-14,8,.87,true,0],[15,10,.93,false,0],[-20,10,.93,true,0],
    [4.4,17,.69,false,0],[-2.8,20,.68,true,0],
  ];
  const coats=['#8a6a58','#496d6b','#966553','#6d6479','#899069','#b89463','#66634e'];
  const hairs=['#4a3830','#867362','#514536','#b8a991','#8d6045'];
  for(let i=0;i<placements.length;i++){
    const [x,z,scale,skirt,age]=placements[i];
    const c=createCharacter({coat:coats[i%coats.length],hair:age?'#aaa08c':hairs[i%hairs.length],skin:i%3?'#d3a580':'#bc8c6c',scale,skirt,age,seed:i+3});
    c.position.set(x,heightAt(x,z)+.02,z);c.rotation.y=Math.PI+(i%2?.35:-.3);group.add(c);
    residents.push({root:c,x,z,scale,age,seed:i+3});
    if(age){
      const cane=new THREE.Group();c.userData.arms[0].hand.add(cane);
      curveTube(cane,[[0,-.0,0],[-.08,.08,0],[-.17,.01,0],[-.17,-.68,0]],.024,mat('#62533c'),12);
    }
  }
  // The travel memory uses the same figure and a practical little travel pack.
  const traveler=createCharacter({coat:'#755067',hair:'#705443',skin:'#d7ac88',scale:1.2,seed:1});
  const pack=box(traveler,mat('#a28056'),[0,.9,-.26],[.52,.58,.28]);
  for(const x of [-.18,.18])box(traveler,mat('#5d4c38'),[x,.92,-.42],[.05,.52,.03]);
  ball(traveler,mat('#b7a281'),[0,1.2,-.26],[.34,.1,.12]);group.add(traveler);
  return {group,bilbo,residents,traveler};
}
