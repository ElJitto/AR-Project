/* Fox Spirits v26 — final jumping kitsune and shaped sakura petals.
   No new GLB; limits shoulder/elbow rotations from v19 to avoid hand overlap
   with dress. Foxes move under hands rather than stretching arms into mesh.
   Existing skin, morph targets, textures and AR target remain untouched. */
(() => {
 'use strict';
 const THREE=AFRAME.THREE;
 const smooth=(a,b,x)=>{ const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u); };
 const HUG_DURATION=7.6, PET_DURATION=10.4;
 // Contact-safe leap: anticipation, high arc, soft landing and a small rebound.
 // lift is normalized: use different world-space heights for preview and AR.
 const foxLeap=(age)=>{
   if(age<0||age>=1.56)return {active:false,lift:0,shape:0};
   if(age<.16){
     const a=smooth(0,.16,age);
     return {active:true,lift:-.052*a,shape:-.095*a};
   }
   if(age<.95){
     const u=(age-.16)/.79;
     const arc=Math.pow(Math.max(0,Math.sin(Math.PI*u)),.86);
     return {active:true,lift:arc,shape:.06*arc-.095*(1-smooth(0,.13,u))};
   }
   if(age<1.10){
     const a=smooth(.95,1.10,age);
     return {active:true,lift:0,shape:-.070*Math.sin(Math.PI*a)};
   }
   const u=(age-1.10)/.46;
   const arc=Math.max(0,Math.sin(Math.PI*u));
   return {active:true,lift:.16*arc,shape:.025*arc};
 };
 const IDENTITY=new THREE.Quaternion();
 // Synthesize movement from the proven v19 skeleton, scaling joint rotations.
 // Cuddle max arm angles crossed hands over skirt; these use <50% of that pose.
 const makeGentleClip=(base,mode,isGirl,foxSide=0)=>{
   if(!base?.tracks?.length)return null;
   const duration=mode==='hug'?HUG_DURATION:PET_DURATION;
   const frames=Math.round(duration*10)+1, tracks=[];
   const hold=Math.min(base.duration*.50,3.05);
   for(const source of base.tracks){
     const interpolant=source.createInterpolant();
     const valueSize=source.getValueSize();
     const times=new Float32Array(frames), values=new Float32Array(frames*valueSize);
     const target=interpolant.evaluate(hold);
     const joint=isGirl&&/\.(?:quaternion)$/.test(source.name);
     const shoulder=/Shoulder/.test(source.name),elbow=/Elbow/.test(source.name);
     const left=/Left/.test(source.name),right=/Right/.test(source.name);
     const isMorph=/morphTargetInfluences$/.test(source.name);
     for(let i=0;i<frames;i++){
       const t=i*.1;times[i]=t;
       const envelope=mode==='hug'
         ?smooth(.25,1.80,t)*(1-smooth(5.50,HUG_DURATION,t))
         :smooth(.25,1.85,t)*(1-smooth(8.55,PET_DURATION,t));
       const leftPet=mode==='pet'?smooth(1.80,2.25,t)*(1-smooth(4.50,5.00,t)):0;
       const rightPet=mode==='pet'?smooth(5.00,5.50,t)*(1-smooth(7.90,8.40,t)):0;
       const petPulse=mode==='pet'?Math.sin(t*Math.PI*2*1.0):0;
       if(joint&&valueSize===4){
         const active=left?leftPet:right?rightPet:0;
         const weight=shoulder
            ?(mode==='hug'?.38:(.23+.17*active))
            :(mode==='hug'?.21:(.14+.21*active));
         const dst=new THREE.Quaternion().fromArray(target).normalize();
         const q=IDENTITY.clone().slerp(dst,Math.min(.47,envelope*weight));
         if(mode==='pet'&&elbow){
           const twist=new THREE.Quaternion().setFromAxisAngle(
             new THREE.Vector3(1,0,0),
             (left?1:-1)*petPulse*.025*active*envelope
           );
           q.multiply(twist).normalize();
         }
         q.toArray(values,i*valueSize);
       }else if(isMorph&&valueSize>=4&&isGirl){
         // Target names in v19 GLB: Bow, Reach, HairFlow, Crouch.
         // Reach is deliberately subdued: it was pulling hands into clothes.
         const weights=[.86,.28,.75,.92];
         for(let k=0;k<valueSize;k++) values[i*valueSize+k]=
            target[k]*envelope*(weights[k]??.7);
       }else if(!isGirl && isMorph && valueSize>=4){
         // Animated kitsune GLBs have four morph targets in order:
         // TailLeft, TailRight, TailTop, EarFlick. Add a gentle ear response
         // exactly when that fox receives attention; preserve tail motion.
         const touch = mode==='pet' ?
           (foxSide<0 ? smooth(1.95,2.35,t)*(1-smooth(4.45,4.90,t))
                      : smooth(5.20,5.60,t)*(1-smooth(7.90,8.35,t)))
            : smooth(2.00,2.50,t)*(1-smooth(4.80,5.30,t));
         const twitch=Math.max(0,Math.sin(t*11+foxSide*.9))*.13*touch*envelope;
         for(let k=0;k<valueSize;k++) values[i*valueSize+k]=
           Math.min(.9,Math.max(0,target[k]*envelope*.82+(k===3?twitch:0)));
       }else{
         for(let k=0;k<valueSize;k++) values[i*valueSize+k]=
           target[k]*envelope*.82;
       }
     }
     tracks.push(new source.constructor(source.name,times,values,THREE.InterpolateLinear));
   }
   return new THREE.AnimationClip(mode==='hug'?'SoftHug':'GentlePet',duration,tracks);
 };

 AFRAME.registerComponent('morph-clip-player', {
   init(){
     this.mixer=null;this.idle=null;this.hug=null;this.pet=null;this.active=null;
     this.root=this.el.closest('[spirit-show]');
     this.run=kind=>{
       const action=kind==='pet'?this.pet:this.hug;
       if(!action||!this.mixer)return;
       this.mixer.stopAllAction();
       action.reset();action.enabled=true;action.setEffectiveWeight(1);
       action.setEffectiveTimeScale(1);action.setLoop(THREE.LoopOnce,1);
       action.clampWhenFinished=true;action.play();this.active=action;
     };
     this.onHug=()=>this.run('hug');this.onPet=()=>this.run('pet');
     this.tapAt=-1e5;
     this.onTap=e=>{if(this.foxSide && e.detail?.side===this.foxSide) this.tapAt=(this.el.sceneEl.time||0)*.001;};
     this.onLoaded=e=>{
       const model=e.detail?.model||this.el.getObject3D('mesh');
       const clips=model?.animations||[];
       if(!clips.length){console.warn('[v25] Missing animation clips',this.el.getAttribute('data-gltf-label'));return;}
       if(this.mixer){this.mixer.stopAllAction();this.mixer.removeEventListener('finished',this.onFinished);}
       this.mixer=new THREE.AnimationMixer(model);
       const idle=THREE.AnimationClip.findByName(clips,'Idle');
       const base=THREE.AnimationClip.findByName(clips,'Cuddle')||THREE.AnimationClip.findByName(clips,'Hug')||THREE.AnimationClip.findByName(clips,'Greet');
       const label=this.el.getAttribute('data-gltf-label');
       const girl=label==='Девушка';
       const side=girl?0:(label==='Белый лисёнок'?-1:1);
       this.foxSide=side;
       this.tailMeshes=[];
       if(side!==0)model.traverse(node=>{
         if(node.isMesh && node.morphTargetInfluences?.length>=4){
           const dict=node.morphTargetDictionary||{};
           const ix=['TailLeft','TailRight','TailTop'].map((n,i)=>dict[n]??i);
           if(ix.every(n=>n>=0 && n<node.morphTargetInfluences.length))
             this.tailMeshes.push({node,ix});
         }
       });
       this.idle=idle?this.mixer.clipAction(idle):null;
       this.hug=base?this.mixer.clipAction(makeGentleClip(base,'hug',girl,side)):null;
       this.pet=base?this.mixer.clipAction(makeGentleClip(base,'pet',girl,side)):null;
       if(this.idle)this.idle.setLoop(THREE.LoopRepeat,Infinity).play();
       this.onFinished=e=>{
         if(e.action!==this.active)return;
         this.active=null;
         if(this.idle){this.idle.reset().setEffectiveWeight(1).play();}
       };
       this.mixer.addEventListener('finished',this.onFinished);
       console.log('[Fox v25] loaded',this.el.getAttribute('data-gltf-label'),clips.map(c=>c.name));
     };
     this.el.addEventListener('model-loaded',this.onLoaded);
     if(this.root){
       this.root.addEventListener('fox-story',this.onHug);
       this.root.addEventListener('fox-care',this.onPet);
       this.root.addEventListener('fox-tap',this.onTap);
     }
     const model=this.el.getObject3D('mesh');if(model?.animations?.length)this.onLoaded({detail:{model}});
   },
   tick(time,dt){
     if(this.mixer)this.mixer.update(Math.max(0,Math.min(dt,70))*.001);
     // V16 kitsune GLBs have separate left/right/top tail morph targets.
     // The old Idle action altered them by only a few percent of fox width.
     // Apply larger independent waves AFTER the mixer so its Idle/Greet
     // tracks do not overwrite these values on the very next frame.
     if(!this.tailMeshes?.length)return;
     const t=time*.001,phase=this.foxSide<0?0.12:1.42;
     const age=t-this.tapAt;
     const excited=(age>=0&&age<2.0)?smooth(0,.14,age)*(1-smooth(1.30,2.0,age)):0;
     const slowWaves=[
       Math.sin(t*2.15+phase),
       Math.sin(t*1.86+phase+2.25),
       Math.sin(t*1.68+phase+.92)
     ];
     const fastWaves=[
       Math.sin(t*5.9+phase),
       Math.sin(t*5.15+phase+1.5),
       Math.sin(t*4.7+phase+.6)
     ];
     for(const {node,ix} of this.tailMeshes){
       const values=node.morphTargetInfluences;
       for(let i=0;i<3;i++){
         const wave=slowWaves[i]*(1-excited*.65)+fastWaves[i]*excited*.65;
         values[ix[i]]=Math.min(1.74,.15+(.67+.12*excited)*(1+wave));
       }
     }
   },
   remove(){
     this.el.removeEventListener('model-loaded',this.onLoaded);
     if(this.root){
       this.root.removeEventListener('fox-story',this.onHug);
       this.root.removeEventListener('fox-care',this.onPet);
       this.root.removeEventListener('fox-tap',this.onTap);
     }
     if(this.mixer){this.mixer.stopAllAction();this.mixer.removeEventListener('finished',this.onFinished);}
   }
 });

 AFRAME.registerComponent('sakura-petals', {
   schema:{count:{type:'int',default:18},spread:{type:'number',default:1.6},speed:{type:'number',default:1}},
   init(){
     this.pieces=[];this.group=new THREE.Group();
     // A true sakura petal silhouette, pointed at its base and gently notched at the tip.
     // Unlike PlaneGeometry, this is not a square even when rotated toward the camera.
     const shape=new THREE.Shape();
     shape.moveTo(0,-.52);
     shape.bezierCurveTo(-.065,-.33,-.41,-.09,-.45,.20);
     shape.bezierCurveTo(-.49,.47,-.31,.59,-.115,.52);
     shape.quadraticCurveTo(-.025,.49,0,.37);
     shape.quadraticCurveTo(.025,.49,.115,.52);
     shape.bezierCurveTo(.31,.59,.49,.47,.45,.20);
     shape.bezierCurveTo(.41,-.09,.065,-.33,0,-.52);
     this.geometry=new THREE.ShapeGeometry(shape,10);
     // Subtle blush towards the pointed base, brighter near the lobe tips.
     const vertices=this.geometry.getAttribute('position');
     const tint=[];
     for(let i=0;i<vertices.count;i++){
       const y=vertices.getY(i);
       const a=Math.max(0,Math.min(1,(y+.52)/1.10));
       tint.push(1.0,.83+.17*a,.88+.12*a);
     }
     this.geometry.setAttribute('color',new THREE.Float32BufferAttribute(tint,3));
     this.materials=['#f9abc2','#ffd5e4','#ffc3d9','#fff0e9'].map(color=>
       new THREE.MeshBasicMaterial({color,vertexColors:true,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false}));
     // Deterministic spread so a reload keeps an attractive composition.
     const frac=x=>x-Math.floor(x);
     for(let i=0;i<this.data.count;i++){
       const seed=frac((i+1)*.6180339887);
       const phase=frac((i+1)*.754877666)*Math.PI*2;
       const angle=(i+1)*2.39996323;
       const radial=.18+frac(i*.463)*.82;
       const x=Math.cos(angle)*radial*this.data.spread*.58;
       const z=.10+Math.sin(angle)*radial*this.data.spread*.30;
       const size=.057+.036*frac((i+3)*.431);
       const mesh=new THREE.Mesh(this.geometry,this.materials[i%this.materials.length]);
       mesh.scale.setScalar(size);
       this.group.add(mesh);
       this.pieces.push({mesh,x,z,start:seed,phase,wind:.035+.055*frac(i*.33),
                          fall:.10+.045*frac(i*.619),size,spin:((i%2)?-1:1)});
     }
     this.el.object3D.add(this.group);
   },
   tick(time){
     const t=time*.001*this.data.speed;
     const height=1.72;
     for(const p of this.pieces){
       // Fall DOWN with gentle wind, then reset above the characters.
       const progress=(p.start+(t*p.fall)/height)%1;
       const y=height*(1-progress)-.11;
       const sway=p.wind*Math.sin(1.12*t+p.phase)+.022*Math.sin(t*.52+p.phase*2.1);
       p.mesh.position.set(p.x+sway,y,p.z+.028*Math.sin(t*.61+p.phase));
       p.mesh.rotation.set(.20+.63*Math.sin(t*.76+p.phase),
                          .38+.80*Math.sin(t*.51+p.phase*1.2),
                          p.phase+p.spin*t*(.56+.10*Math.sin(p.phase)));
       const shimmer=1+.09*Math.sin(t*1.2+p.phase);
       p.mesh.scale.setScalar(p.size*shimmer);
     }
   },
   remove(){
     this.el.object3D.remove(this.group);
     this.geometry.dispose();
     for(const material of this.materials)material.dispose();
   }
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
     this.onStory=()=>{this.born=(this.el.sceneEl.time||0)*.001+2.45};
     this.el.addEventListener('fox-story',this.onStory);
     this.onTap=()=>{this.born=(this.el.sceneEl.time||0)*.001+.13};
     this.el.addEventListener('fox-tap',this.onTap);
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
   remove(){this.el.removeEventListener('fox-greet',this.onGreet);this.el.removeEventListener('fox-pet',this.onGreet);this.el.removeEventListener('fox-care',this.onGreet);this.el.removeEventListener('fox-story',this.onStory);this.el.removeEventListener('fox-tap',this.onTap);this.el.object3D.remove(this.group);this.geometry.dispose();for(const h of this.hearts)h.mesh.material.dispose();}
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
     this.girl=this.el.querySelector('[data-actor="girl"]');
     this.left=this.el.querySelector('[data-actor="white"]');
     this.right=this.el.querySelector('[data-actor="black"]');
     this.kind='hug';this.actionAt=-1e5;this.lastAuto=-1e5;this.first=true;
     this.tapTime={[-1]:-1e5,[1]:-1e5};
     this.onTap=e=>{const side=e.detail?.side;if(side===-1||side===1)this.tapTime[side]=(this.el.sceneEl.time||0)*.001;};
     this.el.addEventListener('fox-tap',this.onTap);
     this.onJumpAll=()=>{
       const now=(this.el.sceneEl.time||0)*.001;
       this.el.emit('fox-tap',{side:-1},false);
       this.el.emit('fox-tap',{side:1},false);
       this.tapTime[1]=now+.22; // the second fox follows slightly behind
       const hint=document.querySelector('#hint');
       if(hint)hint.textContent='🦊 Лисята подпрыгивают от радости!';
     };
     this.el.addEventListener('fox-jump-all',this.onJumpAll);
     this.onHug=()=>this.start('hug');this.onPet=()=>this.start('pet');
     this.el.addEventListener('fox-story',this.onHug);
     this.el.addEventListener('fox-care',this.onPet);
   },
   start(kind){this.actionAt=(this.el.sceneEl.time||0)*.001;this.lastAuto=this.actionAt;this.kind=kind;},
   tick(time){
     const t=time*.001;
     if(this.first&&time>2400){this.first=false;this.el.emit('fox-story');}
     // Only start a new scene once the previous one has finished.
     if(!this.first&&t-this.lastAuto>24)this.el.emit(this.kind==='hug'?'fox-care':'fox-story');
     const p=t-this.actionAt,pet=this.kind==='pet',ar=this.data.mode==='ar';
     const contact=pet
       ?smooth(.30,1.85,p)*(1-smooth(8.45,PET_DURATION,p))
       :smooth(.25,1.8,p)*(1-smooth(5.45,HUG_DURATION,p));
     const leftPat=pet?smooth(1.8,2.25,p)*(1-smooth(4.5,5.0,p)):0;
     const rightPat=pet?smooth(5,5.5,p)*(1-smooth(7.9,8.4,p)):0;
     const idle=Math.sin(t*2.1)*.004;
     const girl=this.girl?.object3D;
     if(girl){
       // Small extra lean on top of the Crouch morph; avoid hands entering the skirt.
       girl.position.set(0,-.004-.022*contact+idle,.014*contact);
       girl.rotation.set(.040*contact,.012*Math.sin(t*.8)+.018*(leftPat-rightPat),.012*Math.sin(t)+.010*(leftPat-rightPat));
       const breath=1+.0035*Math.sin(t*2.3);
       girl.scale.set(1/breath,breath,1/breath);
     }
     const bx=ar?.232:.440, bz=ar?.066:.34, by=ar?.003:.016;
     for(const {el,side,phase,pat} of [
       {el:this.left,side:-1,phase:0,pat:leftPat},
       {el:this.right,side:1,phase:1.5,pat:rightPat}
     ]){
       if(!el)continue;
       const o=el.object3D;
       // Bring fox HEADS toward relaxed hands instead of over-folding elbows.
       const travel=(ar?.080:.168)*contact+(ar?.018:.032)*pat;
       const nuzzle=pat*.010*Math.sin(t*6.5+phase);
       const age=t-this.tapTime[side];
       // Both story modes include a clear, staggered leap; tap triggers an additional leap.
       const scriptedAt=pet?(side<0?2.3:5.6):(side<0?2.15:2.62);
       const tapLeap=foxLeap(age),sceneLeap=foxLeap(p-scriptedAt);
       const leap=tapLeap.active?tapLeap:sceneLeap;
       const jumpHeight=ar?.148:.235;  // >3x the old 0.047 hop, scaled to AR.
       const hop=leap.lift*jumpHeight;
       o.position.set(side*(bx-travel),by+.012+.011*contact+.009*pat+.003*Math.sin(t*2+phase)+nuzzle+hop,bz+.020*contact);
       const midair=Math.max(0,leap.lift);
       o.rotation.set(-.055*contact-.045*pat+.018*Math.sin(t+phase)-.09*midair,
                      -side*(.13+.14*contact),
                      side*.020*Math.sin(t*1.7+phase)+side*.045*midair);
       const size=1+.015*contact+.010*pat;
       // Compression on takeoff/landing, slight stretch mid-air.
       o.scale.set(size*(1-leap.shape*.50),size*(1+leap.shape),size*(1-leap.shape*.50));
     }
   },
   remove(){
     this.el.removeEventListener('fox-story',this.onHug);
     this.el.removeEventListener('fox-care',this.onPet);
     this.el.removeEventListener('fox-tap',this.onTap);
     this.el.removeEventListener('fox-jump-all',this.onJumpAll);
   } 
 });


 // Tap either fox in 3D/AR (or use the two small buttons in the help panel).
 // Sphere picking is significantly lighter on mobile than mesh raycasting.
 AFRAME.registerComponent('fox-touch-picker', {
   init(){
     this.canvas=null;this.pressed=null;
     this.foxes=[{side:-1,actor:this.el.querySelector('[data-actor="white"]')},
                 {side: 1,actor:this.el.querySelector('[data-actor="black"]')}];
     this.ray=new THREE.Raycaster();this.ndc=new THREE.Vector2();
     this.down=e=>{if(e.isPrimary===false)return;this.pressed={x:e.clientX,y:e.clientY,at:performance.now()};};
     this.up=e=>{
       if(!this.pressed)return;
       const start=this.pressed;this.pressed=null;
       if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>14||performance.now()-start.at>750)return;
       const cam=this.el.sceneEl.camera,canvas=this.canvas;
       if(!cam||!canvas)return;
       const box=canvas.getBoundingClientRect();
       if(!box.width||!box.height)return;
       this.ndc.set((e.clientX-box.left)/box.width*2-1,-((e.clientY-box.top)/box.height*2-1));
       this.ray.setFromCamera(this.ndc,cam);
       let best=null;
       for(const {side,actor} of this.foxes){
         const model=actor?.querySelector('a-gltf-model');
         if(!model?.getObject3D('mesh'))continue;
         const bounds=new THREE.Box3().setFromObject(model.object3D);
         if(bounds.isEmpty())continue;
         const sphere=bounds.getBoundingSphere(new THREE.Sphere());
         sphere.radius*=1.14;
         const hit=this.ray.ray.intersectSphere(sphere,new THREE.Vector3());
         if(hit){
           const distance=hit.distanceToSquared(this.ray.ray.origin);
           if(!best||distance<best.distance)best={side,distance};
         }
       }
       if(best)this.react(best.side);
     };
     this.mount=()=>{
       const canvas=this.el.sceneEl.canvas;
       if(!canvas||canvas===this.canvas)return;
       this.unmount();this.canvas=canvas;
       canvas.addEventListener('pointerdown',this.down,{passive:true});
       canvas.addEventListener('pointerup',this.up,{passive:true});
     };
     this.el.sceneEl.addEventListener('renderstart',this.mount);
     this.mount();
   },
   react(side){
     this.el.emit('fox-tap',{side},false);
     const hint=document.querySelector('#hint');
     if(hint)hint.textContent=side<0?'🤍 Белый лисёнок радуется!':'🖤 Чёрный лисёнок радуется!';
   },
   unmount(){
     if(this.canvas){this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointerup',this.up);}
     this.canvas=null;
   },
   remove(){this.el.sceneEl.removeEventListener('renderstart',this.mount);this.unmount();}
 });

 // Blink by gently compressing the actual eye-region vertices of each fox.
 // This runs on the GPU, after existing glTF morph targets and BEFORE skinning.
 // No separate 3D eyelid meshes are required.
 AFRAME.registerComponent('fox-face-reaction', {
   schema:{tone:{type:'string',default:'white'},side:{type:'number',default:-1},enabled:{type:'boolean',default:true}},
   init(){
     this.atPet=-1e6;this.atHug=-1e6;this.atTap=-1e6;
     this.onTap=e=>{if(e.detail?.side===this.data.side)this.atTap=(this.el.sceneEl.time||0)*.001;};
     this.uniform={value:0};this.patched=[];
     this.scene=this.el.closest('[spirit-show]');
     this.onPet=()=>{this.atPet=(this.el.sceneEl.time||0)*.001;};
     this.onHug=()=>{this.atHug=(this.el.sceneEl.time||0)*.001;};
     if(this.scene){this.scene.addEventListener('fox-care',this.onPet);this.scene.addEventListener('fox-story',this.onHug);this.scene.addEventListener('fox-tap',this.onTap);}
     this.onLoaded=()=>{
       this.restoreMaterials();
       const model=this.el.getObject3D('mesh');if(!model)return;
       model.traverse(node=>{
         if(!node.isMesh || !node.material)return;
         const before=node.material;
         const makeBlinkMaterial=source=>{
           const copy=source.clone();
           const originalCompile=source.onBeforeCompile;
           const previousCacheKey=source.customProgramCacheKey?.bind(source);
           copy.onBeforeCompile=shader=>{
             if(typeof originalCompile==='function')originalCompile.call(source,shader);
             shader.uniforms.uKitsuneBlink=this.uniform;
             shader.vertexShader='uniform float uKitsuneBlink;\n'+shader.vertexShader;
             // Coordinates correspond to the eye geometry of both v16 kitsune GLBs.
             const injection=`
               float eyeDx = min(abs(transformed.x - 0.092),abs(transformed.x + 0.092));
               float eyeDy = abs(transformed.y - 0.496);
               float eyeRegion = (1.0-smoothstep(0.031,0.055,eyeDx))
                    * (1.0-smoothstep(0.028,0.057,eyeDy))
                    * smoothstep(0.208,0.240,transformed.z);
               transformed.y += (0.495 - transformed.y) * eyeRegion * uKitsuneBlink * 0.90;
               transformed.z -= 0.012 * eyeRegion * uKitsuneBlink;
             `;
             const marker=shader.vertexShader.includes('#include <morphtarget_vertex>')?
               '#include <morphtarget_vertex>':'#include <begin_vertex>';
             shader.vertexShader=shader.vertexShader.replace(marker,marker+injection);
           };
           copy.customProgramCacheKey=()=> 'fox-blink-v24-'+(previousCacheKey?previousCacheKey():'base');
           copy.needsUpdate=true;
           return copy;
         };
         node.material=Array.isArray(before)?before.map(makeBlinkMaterial):makeBlinkMaterial(before);
         this.patched.push({node,before});
       });
     };
     this.el.addEventListener('model-loaded',this.onLoaded);
     if(this.el.getObject3D('mesh'))this.onLoaded();
   },
   pulse(age){
     if(age<0 || age>.29)return 0;
     return smooth(0,.095,age)*(1-smooth(.15,.29,age));
   },
   tick(ms){
     if(!this.data.enabled){this.uniform.value=0;return;}
     const t=ms*.001;
     const cycle=4.8+(this.data.side>0?.85:0);
     const regular=this.pulse((t+(this.data.side>0?2.1:0.7))%cycle);
     // White fox reacts during first part of petting; black fox during second.
     const touchT=this.data.side<0?2.35:5.70;
     const pet=this.pulse(t-this.atPet-touchT);
     const hug=this.pulse(t-this.atHug-2.70);
     const tapBlink=this.pulse(t-this.atTap-.32);
     this.uniform.value=Math.max(regular,pet,hug,tapBlink);
   },
   restoreMaterials(){
     for(const p of this.patched){
       const after=p.node.material;
       p.node.material=p.before;
       const list=Array.isArray(after)?after:[after];
       for(const mat of list)mat.dispose();
     }
     this.patched=[];
   },
   remove(){
     this.el.removeEventListener('model-loaded',this.onLoaded);
     if(this.scene){this.scene.removeEventListener('fox-care',this.onPet);this.scene.removeEventListener('fox-story',this.onHug);this.scene.removeEventListener('fox-tap',this.onTap);}
     this.restoreMaterials();
   }
 });
})();
