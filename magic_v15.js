/* Fox Spirits v15 — low-cost animated choreography for GLBs without rigs.
   The characters have no bones. Motion of full characters is procedural;
   tail-fan motion is a subtle shader deformation, not nine independent bones. */
(() => {
 'use strict';
 const THREE = AFRAME.THREE;
 const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };

 AFRAME.registerComponent('fox-tail-wave', {
   schema: {speed:{type:'number', default:1}, phase:{type:'number',default:0}, amplitude:{type:'number',default:0.014}},
   init() {
     this.shaders=[];
     this.materials=[];
     this.applyWave=()=>{
       const root=this.el.getObject3D('mesh');
       if(!root) return;
       this.shaders=[];
       root.traverse(node=>{
         if(!node.isMesh || !node.material) return;
         const originals=Array.isArray(node.material)?node.material:[node.material];
         const upgraded=originals.map(mat=>{
           const m=mat.clone();
           const timeUniform={value:0};
           const ampUniform={value:this.data.amplitude};
           m.onBeforeCompile=shader=>{
             shader.uniforms.foxTime=timeUniform;
             shader.uniforms.foxAmplitude=ampUniform;
             shader.vertexShader='uniform float foxTime;\nuniform float foxAmplitude;\n'+shader.vertexShader;
             shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
               // Keep face, ears and paws still. Animate only the rear of the tail fan.
               float behind=1.0-smoothstep(-0.10,0.08,position.z);
               float sides=smoothstep(0.17,0.31,abs(position.x));
               float upper=smoothstep(0.33,0.58,position.y);
               float weight=behind*max(sides,0.72*upper);
               float phaseBand=floor((position.x+0.54)*8.0)*0.38;
               float wave=foxTime*1.9+phaseBand+position.y*4.0;
               transformed.x+=weight*foxAmplitude*sin(wave);
               transformed.y+=weight*foxAmplitude*0.53*cos(wave*0.84+0.9);
             `);
             this.shaders.push(shader);
           };
           m.customProgramCacheKey=()=> 'fox-tail-wave-v14';
           m.needsUpdate=true;
           this.materials.push(m);
           return m;
         });
         node.material=Array.isArray(node.material)?upgraded:upgraded[0];
       });
     };
     this.el.addEventListener('model-loaded',this.applyWave);
     if(this.el.getObject3D('mesh')) this.applyWave();
   },
   tick(time) {
     const t=time*0.001*this.data.speed+this.data.phase;
     for(const shader of this.shaders) shader.uniforms.foxTime.value=t;
   },
   remove() {
     this.el.removeEventListener('model-loaded',this.applyWave);
     // Cloned materials are per component: do not dispose original glTF materials.
     for(const m of this.materials) m.dispose();
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
     this.onGreet=()=>{this.born=(this.el.sceneEl.time||0)*.001};
     this.el.addEventListener('fox-greet',this.onGreet);
   },
   tick(time){
     const age=time*.001-this.born;
     for(let i=0;i<this.hearts.length;i++){
       const h=this.hearts[i];const local=age-i*.105;
       const show=(local>=0 && local<2.25);
       h.mesh.visible=show;
       if(!show)continue;
       const fade=(1-smooth(1.1,2.25,local))*smooth(0,.18,local);
       h.mesh.material.opacity=.88*fade;
       h.mesh.position.set(h.offset+.035*Math.sin(local*2+h.phase),this.data.centerY+local*.19+.04*Math.sin(h.phase),.28+.01*i);
       h.mesh.rotation.set(0,.2*Math.sin(local+h.phase),.13*Math.sin(local*2+h.phase));
       const s=this.data.size*(.8+.3*Math.sin(local*3+h.phase));h.mesh.scale.set(s,s,s);
     }
   },
   remove(){this.el.removeEventListener('fox-greet',this.onGreet);this.el.object3D.remove(this.group);this.geometry.dispose();for(const h of this.hearts)h.mesh.material.dispose();}
 });

 AFRAME.registerComponent('spirit-show', {
   schema:{mode:{type:'string',default:'preview'}},
   init(){
     this.greetAt=-100000;this.lastAuto=-100000;this.first=true;
     this.girl=this.el.querySelector('[data-actor="girl"]');
     this.left=this.el.querySelector('[data-actor="white"]');
     this.right=this.el.querySelector('[data-actor="black"]');
     this.onGreet=()=>{this.greetAt=(this.el.sceneEl.time||0)*.001;this.lastAuto=this.greetAt;};
     this.el.addEventListener('fox-greet',this.onGreet);
   },
   tick(time){
     const t=time*.001;
     if(this.first && time>2800){this.first=false;this.el.emit('fox-greet');}
     if(t-this.lastAuto>14 && !this.first){this.el.emit('fox-greet');}
     const p=t-this.greetAt;
     const walk=smooth(.05,.95,p)*(1-smooth(3.0,4.1,p));
     // Clearly visible 9-degree forward bow during the foxes' greeting.
     // No rig: the entire girl pivots about her feet, not just her torso.
     const bow=smooth(.25,1.15,p)*(1-smooth(2.25,3.90,p));
     const excited=smooth(.0,.15,p)*(1-smooth(2.6,3.6,p));
     const hop=(p>=.4&&p<=1.5)?Math.max(0,Math.sin((p-.4)*Math.PI*3))*Math.sin(Math.PI*smooth(.4,1.5,p))*.046:0;
     const idle=Math.sin(t*2.0)*.006;
     const g=this.girl && this.girl.object3D;
     if(g){
       // Forward tip is large enough to read even on a small phone screen.
       // Positive X leans her toward the camera and the foxes.
       g.position.set(0,.008+idle+walk*.006,.014*bow);
       g.rotation.set(.012+.155*bow,.018*Math.sin(t*.9),.016*Math.sin(t*1.10)+.036*bow);
       const breath=1+.006*Math.sin(t*2.3);
       g.scale.set(1/breath,breath,1/breath);
     }
     const actors=[{el:this.left,side:-1,phase:0},{el:this.right,side:1,phase:1.8}];
     const isAR=this.data.mode==='ar';
     const bx=isAR?.26:.52, by=isAR?0:.02, bz=isAR?.07:.34;
     for(const a of actors){
       if(!a.el)continue;
       const o=a.el.object3D;
       const side=a.side;
       const pulse=Math.sin(t*2.4+a.phase);
       // Walk toward the girl (without sliding feet rapidly) and happy hop.
       const step=walk*(isAR?.095:.19);
       o.position.set(side*bx-side*step, by+.013+hop+.008*pulse, bz+.008*Math.sin(t*.8+a.phase));
       o.rotation.set(.022*Math.sin(t*1.3+a.phase), -side*(.18+.24*walk), side*(.035*Math.sin(t*1.55+a.phase)+.10*walk));
       const squash=1-.025*excited*Math.max(0,Math.sin(p*12+a.phase));
       o.scale.set(1/squash,squash,1/squash);
     }
   },
   remove(){this.el.removeEventListener('fox-greet',this.onGreet);}
 });
})();
