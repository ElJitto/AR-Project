/* Fox Spirits v22 — clean skinned girl's hug; morph-animated foxes.
   Girl has shoulder/elbow skin joints and Bow morph. Fox tail movement is
   morph-driven; nine tails do not yet have individual skeleton bones. */
(() => {
 'use strict';
 const THREE = AFRAME.THREE;
 const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
 const PAT_DURATION = 8.8;
 const CARE_DURATION = 11.4;
 const STORY_DURATION = 10.8;
 // Turn the existing Cuddle/Greet GLB clips into a new, temporary "Pet" clip.
 // Reuses the same mesh, skins and textures: no added GLB assets or geometry.
 const makePetClip = (base, isGirl) => {
   if (!base || !base.tracks?.length) return null;
   const tracks=[];
   const frames=89; // 0.1s increments, 0 to 8.8 seconds
   for (const srcTrack of base.tracks) {
     const interpolant = srcTrack.createInterpolant();
     const stride = srcTrack.getValueSize();
     const times=new Float32Array(frames);
     const values=new Float32Array(frames*stride);
     const atHold=Math.min(base.duration*0.53,3.0);
     const armTrack=isGirl && /(LeftElbow|RightElbow)\.quaternion$/.test(srcTrack.name);
     const left=srcTrack.name.includes('LeftElbow');
     for(let i=0;i<frames;i++) {
       const t=i*.1;
       times[i]=t;
       // Reach the foxes, hold the pose for several pats, gently return.
       const sample=t<2.5 ? (t/2.5)*atHold
         : (t<5.6 ? atHold
         : atHold+((t-5.6)/(PAT_DURATION-5.6))*(base.duration-atHold));
       const original=interpolant.evaluate(Math.min(base.duration,Math.max(0,sample)));
       for(let k=0;k<stride;k++) values[i*stride+k]=original[k];
       if(armTrack && stride===4) {
         // Only the elbows move: small rotations, never separate the skin mesh.
         const envelope=smooth(2.6,3.0,t)*(1-smooth(5.1,5.6,t));
         const wave=Math.sin((t-2.6)*Math.PI*2*1.10+(left?0:1.2));
         const q = new THREE.Quaternion().fromArray(original).normalize();
         const delta = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1,0,0), (left?1:-1)*wave*.09*envelope);
         q.multiply(delta).normalize();
         q.toArray(values,i*stride);
       }
     }
     const C=srcTrack.constructor;
     tracks.push(new C(srcTrack.name,times,values,THREE.InterpolateLinear));
   }
   return new THREE.AnimationClip('Pet',PAT_DURATION,tracks);
 };


 // Extra interaction: touch first the white fox, then the black fox.
 // Retimes v19's existing skinned Cuddle clip; never duplicates geometry.
 const makeCareClip = (base, isGirl) => {
   if (!base?.tracks?.length) return null;
   const tracks=[];
   const frames=115; // 0.1s, 0..11.4 seconds
   const hold=Math.min(base.duration*.53,3.0);
   const armAxis=new THREE.Vector3(1,0,0);
   for(const source of base.tracks){
     const interp=source.createInterpolant();
     const stride=source.getValueSize();
     const times=new Float32Array(frames);
     const values=new Float32Array(frames*stride);
     const left=isGirl && /LeftElbow\.quaternion$/.test(source.name);
     const right=isGirl && /RightElbow\.quaternion$/.test(source.name);
     for(let i=0;i<frames;i++){
       const t=i*.1;times[i]=t;
       const sample=t<1.9 ? hold*smooth(0,1.9,t)
         : t<=9.0 ? hold
         : hold+(base.duration-hold)*smooth(9.0,CARE_DURATION,t);
       const original=interp.evaluate(Math.max(0,Math.min(base.duration,sample)));
       for(let k=0;k<stride;k++)values[i*stride+k]=original[k];
       if((left||right)&&stride===4){
         const start=left?2.05:5.35;
         const stop=left?4.7:8.15;
         const pulse=smooth(start,start+.35,t)*(1-smooth(stop-.35,stop,t));
         const movement=Math.sin((t-start)*Math.PI*2*1.12)*(left?1:-1)*.12*pulse;
         const q=new THREE.Quaternion().fromArray(original).normalize();
         const dq=new THREE.Quaternion().setFromAxisAngle(armAxis,movement);
         q.multiply(dq).normalize().toArray(values,i*stride);
       }
     }
     tracks.push(new source.constructor(source.name,times,values,THREE.InterpolateLinear));
   }
   return new THREE.AnimationClip('Care',CARE_DURATION,tracks);
 };

 // NEW in v22: a restrained, sequential cuddle. All changes are animation
 // tracks; the skin/mesh is shared with v19 (no duplicate arms or new GLB).
 const makeStoryClip = (base, isGirl) => {
   if (!base?.tracks?.length) return null;
   const tracks=[]; const count=109; // 0..10.8 at 10 FPS
   const hold=Math.min(base.duration*.54,3.05);
   const axis=new THREE.Vector3(1,0,0);
   for(const source of base.tracks){
     const interp=source.createInterpolant(), stride=source.getValueSize();
     const times=new Float32Array(count), values=new Float32Array(count*stride);
     const left=isGirl && /LeftElbow\.quaternion$/.test(source.name);
     const right=isGirl && /RightElbow\.quaternion$/.test(source.name);
     for(let i=0;i<count;i++){
       const t=i*.1;times[i]=t;
       // Reach for the first fox, keep the comfortable pose, release once.
       const sample=t<2.1 ? hold*smooth(0,2.1,t) :
          t<8.8 ? hold :
          hold+(base.duration-hold)*smooth(8.8,STORY_DURATION,t);
       const original=interp.evaluate(Math.max(0,Math.min(base.duration,sample)));
       for(let k=0;k<stride;k++) values[i*stride+k]=original[k];
       if((left||right)&&stride===4){
         const start=left?2.1:4.9, end=left?4.4:7.35;
         const envelope=smooth(start,start+.4,t)*(1-smooth(end-.45,end,t));
         const wave=Math.sin((t-start)*Math.PI*2*.85)*(left?1:-1)*.065*envelope;
         new THREE.Quaternion().fromArray(original).normalize()
            .multiply(new THREE.Quaternion().setFromAxisAngle(axis,wave))
            .normalize().toArray(values,i*stride);
       }
     }
     tracks.push(new source.constructor(source.name,times,values,THREE.InterpolateLinear));
   }
   return new THREE.AnimationClip('Story',STORY_DURATION,tracks);
 };

 AFRAME.registerComponent('morph-clip-player', {
   init(){
     this.mixer=null;this.idle=null;this.greet=null;this.pet=null;this.care=null;this.story=null;
     this.active=null;
     this.showRoot=this.el.closest('[spirit-show]');
     this.playAction=(kind)=>{
       const next=kind==='story'?this.story:kind==='pet'?this.pet:kind==='care'?this.care:this.greet;
       if(!this.mixer||!next)return;
       // Do not keep a previous clip driving the same skin joints.
       this.mixer.stopAllAction();
       next.reset();
       next.enabled=true;
       next.setEffectiveWeight(1);
       next.setEffectiveTimeScale(1);
       next.setLoop(THREE.LoopOnce,1);
       next.clampWhenFinished=true;
       next.play();
       this.active=next;
     };
     this.onGreet=()=>this.playAction('greet');
     this.onPet=()=>this.playAction('pet');
     this.onCare=()=>this.playAction('care');
     this.onStory=()=>this.playAction('story');
     this.onLoaded=e=>{
       const model=e.detail?.model||this.el.getObject3D('mesh');
       const clips=model?.animations||[];
       if(!clips.length){console.warn('[Fox AR v22] Missing model clips:',this.el.getAttribute('data-gltf-label'));return;}
       if(this.mixer){this.mixer.stopAllAction();this.mixer.uncacheRoot(model);}
       this.mixer=new THREE.AnimationMixer(model);
       const idle=THREE.AnimationClip.findByName(clips,'Idle');
       const cuddle=THREE.AnimationClip.findByName(clips,'Cuddle')||THREE.AnimationClip.findByName(clips,'Hug');
       const greet=cuddle||THREE.AnimationClip.findByName(clips,'Greet');
       const isGirl=this.el.getAttribute('data-gltf-label')==='Девушка';
       const pet=makePetClip(greet,isGirl);
       const care=makeCareClip(greet,isGirl);
       const story=makeStoryClip(greet,isGirl);
       this.idle=idle?this.mixer.clipAction(idle):null;
       this.greet=greet?this.mixer.clipAction(greet):null;
       this.pet=pet?this.mixer.clipAction(pet):null;
       this.care=care?this.mixer.clipAction(care):null;
       this.story=story?this.mixer.clipAction(story):null;
       if(this.idle)this.idle.setLoop(THREE.LoopRepeat,Infinity).play();
       this.onFinished=event=>{
         if(event.action!==this.active)return;
         this.active=null;
         if(this.idle){this.idle.reset();this.idle.setEffectiveWeight(1);this.idle.play();}
       };
       this.mixer.addEventListener('finished',this.onFinished);
       console.log('[Fox AR v22] loaded',this.el.getAttribute('data-gltf-label'),clips.map(c=>c.name),'Pet synthesized',Boolean(pet));
     };
     this.el.addEventListener('model-loaded',this.onLoaded);
     if(this.showRoot){
       this.showRoot.addEventListener('fox-greet',this.onGreet);
       this.showRoot.addEventListener('fox-pet',this.onPet);
       this.showRoot.addEventListener('fox-care',this.onCare);
       this.showRoot.addEventListener('fox-story',this.onStory);
     }
     const model=this.el.getObject3D('mesh');if(model?.animations?.length)this.onLoaded({detail:{model}});
   },
   tick(t,dt){if(this.mixer)this.mixer.update(Math.min(Math.max(dt,0),75)*.001);},
   remove(){
     this.el.removeEventListener('model-loaded',this.onLoaded);
     if(this.showRoot){this.showRoot.removeEventListener('fox-greet',this.onGreet);this.showRoot.removeEventListener('fox-pet',this.onPet);this.showRoot.removeEventListener('fox-care',this.onCare);this.showRoot.removeEventListener('fox-story',this.onStory);}
     if(this.mixer){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.el.getObject3D('mesh'));}
   }
 });

 AFRAME.registerComponent('sakura-petals', {
   schema:{count:{type:'int',default:14},spread:{type:'number',default:1.6},speed:{type:'number',default:1}},
   init(){
     this.pieces=[];this.group=new THREE.Group();
     this.geometry=new THREE.PlaneGeometry(0.038,0.023);
     this.materials=['#f6c2d2','#ffdeea','#fff3eb'].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.75,side:THREE.DoubleSide,depthWrite:false}));
     for(let i=0;i<this.data.count;i++){
       const angle=i*2.39996,rad=.1+((i*7)%11)/11;
       const x=Math.cos(angle)*rad*this.data.spread*.56;
       const z=.08+Math.sin(angle)*rad*this.data.spread*.25;
       const mesh=new THREE.Mesh(this.geometry,this.materials[i%3]);
       this.group.add(mesh);
       this.pieces.push({mesh,x,z,y:((i*0.173)%1)*1.8,phase:i*1.81});
     }
     this.el.object3D.add(this.group);
   },
   tick(time){
     const t=time*.001*this.data.speed;
     for(const p of this.pieces){
       const y=(p.y + t*0.09)%1.8;
       p.mesh.position.set(p.x+.055*Math.sin(t*.8+p.phase),y,p.z+.018*Math.cos(t+p.phase));
       p.mesh.rotation.set(.2*Math.sin(t+p.phase),.5*Math.sin(t*.5+p.phase),t*.42+p.phase);
     }
   },
   remove(){this.el.object3D.remove(this.group);this.geometry.dispose();for(const m of this.materials)m.dispose();}
 });

 AFRAME.registerComponent('magic-hearts', {
   schema:{centerY:{type:'number',default:1.0}, size:{type:'number',default:.062}},
   init(){
     this.born=-100000; this.group=new THREE.Group();this.hearts=[];
     const s=new THREE.Shape();
     s.moveTo(0,-0.32);s.bezierCurveTo(-.12,-.23,-.55,.06,-.49,.34);
     s.bezierCurveTo(-.43,.69,-.06,.60,0,.37);
     s.bezierCurveTo(.06,.60,.43,.69,.49,.34);
     s.bezierCurveTo(.55,.06,.12,-.23,0,-.32);
     this.geometry=new THREE.ShapeGeometry(s,8);
     for(let i=0;i<9;i++){
       const m=new THREE.MeshBasicMaterial({color:i%3===0?'#ffe0e8':i%3===1?'#ff99b4':'#ffd9a7',side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false});
       const mesh=new THREE.Mesh(this.geometry,m);mesh.visible=false;this.group.add(mesh);
       this.hearts.push({mesh,phase:i*0.73,offset:(i-4)*.115});
     }
     this.el.object3D.add(this.group);
     this.onGreet=()=>{this.born=(this.el.sceneEl.time||0)*.001+1.15};
     this.el.addEventListener('fox-greet',this.onGreet);
     this.el.addEventListener('fox-pet',this.onGreet);
     this.el.addEventListener('fox-care',this.onGreet);
     this.onStory=()=>{this.born=(this.el.sceneEl.time||0)*.001+7.4};
     this.el.addEventListener('fox-story',this.onStory);
   },
   tick(time){
     const age=time*.001-this.born;
     for(let i=0;i<this.hearts.length;i++){
       const h=this.hearts[i];const local=age-i*.105;
       const show=(local>=0 && local<3.1);
       h.mesh.visible=show;
       if(!show)continue;
       const fade=(1-smooth(1.65,3.1,local))*smooth(0,.2,local);
       h.mesh.material.opacity=.88*fade;
       h.mesh.position.set(h.offset+.035*Math.sin(local*2+h.phase),this.data.centerY+local*.19+.04*Math.sin(h.phase),.28+.01*i);
       h.mesh.rotation.set(0,.2*Math.sin(local+h.phase),.13*Math.sin(local*2+h.phase));
       const s=this.data.size*(.8+.3*Math.sin(local*3+h.phase));h.mesh.scale.set(s,s,s);
     }
   },
   remove(){this.el.removeEventListener('fox-greet',this.onGreet);this.el.removeEventListener('fox-pet',this.onGreet);this.el.removeEventListener('fox-care',this.onGreet);this.el.removeEventListener('fox-story',this.onStory);this.el.object3D.remove(this.group);this.geometry.dispose();for(const h of this.hearts)h.mesh.material.dispose();}
 });


 AFRAME.registerComponent('care-glints', {
   schema: {mode:{type:'string',default:'preview'}},
   init(){
     this.born=-1e5;
     this.group=new THREE.Group();
     this.geometry=new THREE.OctahedronGeometry(.022,0);
     this.materials=['#ffe5a9','#ffb9d2','#fff7dc'].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));
     this.particles=[];
     for(let i=0;i<12;i++){
       const mat=this.materials[i%3].clone();
       const mesh=new THREE.Mesh(this.geometry,mat);
       this.group.add(mesh);
       this.particles.push({mesh,fox:i<6?-1:1,k:i%6});
     }
     this.el.object3D.add(this.group);
     this.onCare=()=>{this.born=(this.el.sceneEl.time||0)*.001;};
     this.el.addEventListener('fox-care',this.onCare);
     this.onStory=()=>{this.born=(this.el.sceneEl.time||0)*.001;this.isStory=true;};
     this.el.addEventListener('fox-story',this.onStory);
   },
   tick(time){
     const t=time*.001,age=t-this.born,ar=this.data.mode==='ar';
     for(const p of this.particles){
       const active=p.fox<0 ? smooth(2.0,2.35,age)*(1-smooth(4.45,4.85,age))
                                : smooth(5.3,5.65,age)*(1-smooth(7.95,8.35,age));
       p.mesh.visible=active>.02;
       if(!p.mesh.visible)continue;
       const phase=p.k*1.23;
       const side=p.fox;
       const x=side*(ar?.17:.30), baseY=ar?.34:.75;
       p.mesh.position.set(x+.05*Math.cos(phase)+.018*Math.sin(t*3+phase),baseY+.03*p.k+.02*Math.sin(t*2+phase),.17+.02*Math.sin(phase));
       p.mesh.material.opacity=.65*active;
       p.mesh.rotation.set(t+phase,2*t+phase,0);
       const size=.55+.3*Math.sin(t*2+phase);
       p.mesh.scale.setScalar(size);
     }
   },
   remove(){
     this.el.removeEventListener('fox-care',this.onCare);this.el.removeEventListener('fox-story',this.onStory);
     this.el.object3D.remove(this.group);
     this.geometry.dispose();
     for(const p of this.particles)p.mesh.material.dispose();
     for(const m of this.materials)m.dispose();
   }
 });

 AFRAME.registerComponent('spirit-show', {
   schema:{mode:{type:'string',default:'preview'}},
   init(){
     this.actionAt=-100000;this.lastAuto=-100000;this.first=true;this.kind='greet';
     this.girl=this.el.querySelector('[data-actor="girl"]');
     this.left=this.el.querySelector('[data-actor="white"]');
     this.right=this.el.querySelector('[data-actor="black"]');
     this.onGreet=()=>this.begin('greet');
     this.onPet=()=>this.begin('pet');
     this.onCare=()=>this.begin('care');
     this.onStory=()=>this.begin('story');
     this.el.addEventListener('fox-greet',this.onGreet);
     this.el.addEventListener('fox-pet',this.onPet);
     this.el.addEventListener('fox-care',this.onCare);
     this.el.addEventListener('fox-story',this.onStory);
   },
   begin(kind){
     this.actionAt=(this.el.sceneEl.time||0)*.001;
     this.lastAuto=this.actionAt;
     this.kind=kind;
   },
   tick(time){
     const t=time*.001;
     if(this.first && time>2800){this.first=false;this.el.emit('fox-story');}
     // Auto alternates between cuddling and petting, but buttons always work.
     if(t-this.lastAuto>26 && !this.first){
       this.el.emit(this.kind==='story'?'fox-care':'fox-story');
     }
     const p=t-this.actionAt;
     const pet=this.kind==='pet';
     const care=this.kind==='care';
     const story=this.kind==='story';
     const whitePet=story?smooth(1.65,2.2,p)*(1-smooth(4.3,4.95,p)):
                    care?smooth(1.65,2.35,p)*(1-smooth(4.65,5.15,p)):0;
     const blackPet=story?smooth(4.85,5.45,p)*(1-smooth(7.5,8.15,p)):
                    care?smooth(5.1,5.7,p)*(1-smooth(8.2,8.8,p)):0;
     const together=story?smooth(7.8,8.35,p)*(1-smooth(9.25,10.65,p)):
                    care?smooth(8.5,9.1,p)*(1-smooth(9.6,11.3,p)):0;
     const approach=story?smooth(.4,1.75,p)*(1-smooth(9.25,10.65,p)):
                    care?smooth(.40,1.85,p)*(1-smooth(9.4,11.25,p)):
                    pet?smooth(.35,1.8,p)*(1-smooth(6.55,8.2,p)):
                        smooth(.35,1.55,p)*(1-smooth(4.45,5.85,p));
     const contact=(care||story)?Math.max(whitePet,blackPet,together*.75):
                     pet?smooth(1.7,2.7,p)*(1-smooth(5.9,7.6,p)):
                       smooth(1.4,2.15,p)*(1-smooth(4.15,5.15,p));
     const happy=smooth(.45,.85,p)*(1-smooth(story?9.5:care?9.6:pet?6.6:4.45,story?10.6:care?11.1:pet?8:5.35,p));
     const hop=(!pet && p>=1.05&&p<=1.95)?Math.max(0,Math.sin((p-1.05)*Math.PI*3))*.037:0;
     const idle=Math.sin(t*2)*.005;
     const isAR=this.data.mode==='ar';
     const g=this.girl?.object3D;
     if(g){
       g.position.set(story ? .020*(blackPet-whitePet) : 0,.008+idle-.006*contact,story ? .025*contact : 0);
       g.rotation.set(.007+(story ? .075 : .02)*contact, .015*Math.sin(t*.75)+(story ? .065*(whitePet-blackPet) : 0), .011*Math.sin(t)+((care||story) ? .025*(whitePet-blackPet) : 0));
       const breath=1+.004*Math.sin(t*2.3);
       g.scale.set(1/breath,breath,1/breath);
     }
     const actors=[{el:this.left,side:-1,phase:0},{el:this.right,side:1,phase:1.8}];
     const bx=isAR?.26:.52,by=isAR?0:.02,bz=isAR?.07:.34;
     for(const a of actors){
       if(!a.el)continue;
       const o=a.el.object3D,side=a.side;
       const pulse=Math.sin(t*2+a.phase);
       const touch=(care||story)?Math.max(side<0?whitePet:blackPet, story?together*.7:0):contact;
       const travel=(story?approach*(side<0 ? .93 : .89):approach)*(isAR?.115:.225);
       // Gentle nuzzle while she's petting them, body does not detach from legs.
       const nuzzle=(care||story)?touch*Math.sin((p-2.0)*Math.PI*2*.95+a.phase)*.014 :
                    pet?contact*Math.sin((p-2.0)*Math.PI*2*1.0+a.phase)*.012:0;
       o.position.set(side*(bx-travel),by+.009+.060*touch+hop+.005*pulse+nuzzle,bz+.024*touch);
       o.rotation.set(.025*Math.sin(t*1.2+a.phase)-.10*touch-.055*touch*(pet||care?1:0),
                      -side*(.17+.16*approach)+(story ? .07*Math.sin(t*1.7+a.phase)*touch : 0),
                      side*(.025*Math.sin(t*1.6+a.phase)-.06*touch));
       const s=1+.035*touch-.013*happy*Math.max(0,Math.sin(p*12+a.phase));
       o.scale.set(s,s,s);
     }
   },
   remove(){
     this.el.removeEventListener('fox-greet',this.onGreet);
     this.el.removeEventListener('fox-pet',this.onPet);this.el.removeEventListener('fox-care',this.onCare);this.el.removeEventListener('fox-story',this.onStory);
   }
 });
})();
