import * as THREE from 'three';
import {smooth,clamp} from './timeline.js';
import {poseCharacter} from './characters.js';
import {heightAt,pathX,HERO} from './world/terrain.js';

export function createNarrative(world,rendering,cues) {
  const {architecture,vegetation,props,characters,smokeSprites,dust,dustBase,birds}=world;
  const {bilbo,residents,traveler}=characters;
  const at=id=>cues[id].start;
  const dayFog=new THREE.Color('#b4c4ac'),nightFog=new THREE.Color('#687d85');
  const summer=new THREE.Color('#668247'),autumn=new THREE.Color('#b98440');
  const winterColor=new THREE.Color('#adbdb6'),springColor=new THREE.Color('#9bb573');
  const leafTone=new THREE.Color(),sunPosition=new THREE.Vector3(-32,45,24);
  const smokePos=new THREE.Vector3(),handPosition=new THREE.Vector3();
  const blendAngle=(a,b,u)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*u;
  const gestureAt=(start,t)=>smooth(start,start+.65,t)*(1-smooth(start+1.8,start+2.7,t));
  return function update(t) {
    const announcement=smooth(at(1)+.4,at(1)+2.1,t);
    const inVault=t>=at(6)&&t<at(9);
    for(const group of [world.terrain.group,architecture.group,vegetation.group,props.group,characters.group])group.visible=!inVault;
    props.vault.visible=inVault;world.dust.visible=!inVault;
    rendering.sky.visible=!inVault;rendering.sun.visible=!inVault;rendering.rim.visible=!inVault;
    rendering.scene.background.set(inVault?'#282524':'#b9ccc0');
    const worry=smooth(at(16),at(19),t);
    const dusk=smooth(at(18),cues.at(-1).end+2,t);
    const season=world.seasons.update(t,at(11),at(16));
    const wave=smooth(at(1)+1.65,at(1)+2.4,t)*(1-smooth(at(2)-.5,at(2)+1,t));
    const pull=smooth(at(1)-.2,at(1)+.32,t)*(1-smooth(at(1)+1.25,at(1)+1.85,t))*(1-.48*smooth(at(1)+.35,at(1)+1.25,t));
    const bow=smooth(at(9)+.5,at(10),t)*(1-smooth(at(10)+1,at(11),t));
    poseCharacter(bilbo,t,{wave,bow,hold:.15,look:worry*.14,pull});
    bilbo.position.set(-1.9,HERO.y+.12,-6.35);
    bilbo.rotation.y=.16+Math.sin(t*.35)*.02;
    architecture.hero.door.rotation.y=-.16-.52*smooth(at(0),at(1),t)+.48*dusk;
    props.banner.scale.y=Math.max(.04,announcement);
    props.banner.visible=t>=at(1)-.2;
    props.bannerCord.visible=t>=at(1)-.2&&t<at(1)+2;
    if(props.bannerCord.visible){
      bilbo.updateMatrixWorld(true);bilbo.userData.arms[0].hand.getWorldPosition(handPosition);
      const cord=props.bannerCord.geometry.attributes.position;
      for(let i=0;i<cord.count;i++){
        const u=i/(cord.count-1);
        cord.setXYZ(i,-1.82+(handPosition.x+1.82)*u,HERO.y+4.85+(handPosition.y-HERO.y-4.85)*u-Math.sin(u*Math.PI)*.10,-7.90+(handPosition.z+7.90)*u);
      }
      cord.needsUpdate=true;
    }
    const bp=props.bannerMesh.geometry.attributes.position;
    for(let i=0;i<bp.count;i++){
      bp.setZ(i,props.bannerRest[i*3+2]+Math.sin(props.bannerRest[i*3]*2.1+t*1.8)*.038*announcement);
    }bp.needsUpdate=true;props.bannerMesh.geometry.computeVertexNormals();
    for(const flag of props.flags)flag.root.rotation.x=Math.sin(t*2+flag.phase)*.19+.16;
    for(let i=0;i<residents.length;i++){
      const r=residents[i],c=r.root;
      const approach=(1-smooth(at(0),at(2)+.7,t))*(i<6?2.8:0);
      const moveAside=smooth(at(16)-.6,at(16)+1.8,t);
      const z=r.z+approach;const x=r.x+(i===1?1.7:i===0?-.65:0)*moveAside;
      c.position.set(x,heightAt(x,z)+.02,z);
      const listening=smooth(at(1)+2,at(2)+1,t);
      c.rotation.y=Math.PI+(i%2?.34:-.34)+listening*.11*Math.sin(t*.35+i);
      const conversation=smooth(at(2),at(2)+1.5,t)*(1-smooth(at(4)-.5,at(4)+.7,t));
      const partner=residents[i%2?i-1:i+1]||residents[0];
      const towardPartner=Math.atan2(partner.x-r.x,partner.z-r.z);
      c.rotation.y=blendAngle(c.rotation.y,towardPartner,conversation);
      if(t>at(16)){
        const turn=smooth(at(16),at(16)+2.0,t);
        const goal=i===2?.48:i===3?Math.PI*2-.58:Math.PI+(i%2?-.75:.65);
        c.rotation.y=blendAngle(c.rotation.y,goal,turn);
      }
      const reaction=r.age?gestureAt(at(16)+.6+i*.12,t):0;
      const gesture=conversation*(.35+.2*Math.sin(t*1.3+i))+(i===2?gestureAt(at(17)+.6,t):i===3?gestureAt(at(18)+.2,t):0);
      const steppingAside=(i<2&&moveAside>.01&&moveAside<.99)?.6:0;
      poseCharacter(c,t,{walk:approach>0.03?.7:steppingAside,talk:conversation*.6,
        unease:r.age?worry:0,look:(i%2?-.28:.24)*worry,hold:i===4?.7:0,
        gesture,shake:Math.sin((t-at(16)) *5.2)*.16*reaction,
        gaitDistance:(i<6?2.8-approach:0)+(i===1?1.7:i===0?.65:0)*moveAside});
    }
    const travelP=smooth(at(5),at(6),t);
    const tz=24-travelP*6,tx=pathX(tz);
    traveler.position.set(tx,heightAt(tx,tz),tz);traveler.rotation.y=Math.PI+.1;
    traveler.visible=t>=at(5)-.3&&t<at(6);
    poseCharacter(traveler,t,{walk:smooth(0,.08,travelP)*(1-smooth(.92,1,travelP)),gaitDistance:travelP*6});
    props.lid.rotation.x=-.55*smooth(at(6)+1,at(8)+1,t);
    props.vaultLight.intensity=48+Math.sin(t*2.5)*1.1;
    props.chestLight.intensity=7+Math.sin(t*3)*.3;
    world.terrain.water.userData.shader&&(world.terrain.water.userData.shader.uniforms.uTime.value=t);
    vegetation.grasses.userData.shader&&(vegetation.grasses.userData.shader.uniforms.uTime.value=t);
    vegetation.foliage.userData.shader&&(vegetation.foliage.userData.shader.uniforms.uTime.value=t);
    leafTone.set('#ffffff').lerp(autumn,season.autumn*.78).lerp(winterColor,season.winter*.76).lerp(springColor,season.spring*.2);
    vegetation.foliage.material.color.copy(leafTone);
    for(const crown of vegetation.treeCrowns){
      crown.mesh.position.x=crown.x+Math.sin(t*.64+crown.phase)*.045;
      crown.mesh.rotation.z=Math.sin(t*.72+crown.phase)*.009;
    }
    vegetation.leaves[0].color.copy(summer).lerp(autumn,season.autumn).lerp(winterColor,season.winter*.55);
    world.terrain.ground.material.color.set('#ffffff').lerp(winterColor,season.winter*.54);
    rendering.sun.position.copy(sunPosition);
    if(season.active)rendering.sun.position.x+=Math.sin(season.progress*Math.PI*2)*17;
    rendering.sun.intensity=3.15*(1-dusk*.75)*(1-season.winter*.47);
    rendering.sun.color.set(dusk>.1?'#efbb91':'#fff0d7').lerp(winterColor,season.winter*.6);
    rendering.hemisphere.intensity=inVault?.30:1.15-dusk*.32;
    rendering.rim.intensity=.75+dusk*.2;
    rendering.scene.fog.color.copy(dayFog).lerp(nightFog,dusk);
    if(inVault)rendering.scene.fog.color.set('#282524');
    rendering.sky.material.uniforms.uDusk.value=dusk;
    rendering.sky.material.uniforms.uTime.value=t;
    architecture.porchLight.intensity=1.0+dusk*14;
    architecture.warm.emissiveIntensity=.42+dusk*.9;
    for(const l of [...architecture.lanterns,...props.lanterns])l.glass.material.emissiveIntensity=.8+dusk*.9+Math.sin(t*2.1+l.root.position.x)*.035;
    architecture.group.updateMatrixWorld(true);
    for(const {sprite,source,index} of smokeSprites){
      sprite.visible=!inVault;
      const phase=(t*.22+index/6)%1;
      source.getWorldPosition(smokePos);
      sprite.position.copy(smokePos).add(new THREE.Vector3(phase*1.6,phase*4.1,Math.sin(phase*4)*.3));
      sprite.scale.setScalar(.5+phase*1.6);sprite.material.opacity=Math.sin(phase*Math.PI)*.19*(1-dusk*.25);
    }
    const dp=dust.geometry.attributes.position;
    for(let i=0;i<dustBase.length;i++){
      const [x,y,z]=dustBase[i];
      dp.setXYZ(i,x+Math.sin(t*.23+i)*.55,y+Math.sin(t*.31+i*2)*.38,z+Math.cos(t*.13+i)*.35);
    }dp.needsUpdate=true;dust.material.opacity=.34+dusk*.23;
    for(const bird of birds){
      bird.root.visible=!inVault;
      const a=t*.075+bird.i*.87;
      bird.root.position.set(Math.cos(a)*22,16+bird.i*.7+Math.sin(a*2),-17+Math.sin(a)*14);
      bird.root.rotation.y=-a-Math.PI/2;
      bird.left.rotation.z=Math.sin(t*9+bird.i)*.45;bird.right.rotation.z=-Math.sin(t*9+bird.i)*.45;
    }
  };
}
