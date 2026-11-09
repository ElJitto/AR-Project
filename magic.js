/* Fox Spirits v12 — looped motion without bones.
   A GPU vertex-shader tail sway effect; does not add skeletons/true individual tail rigs. */
AFRAME.registerComponent('fox-tail-wave', {
  schema: {
    amplitude: {type: 'number', default: 0.015},
    speed: {type: 'number', default: 1.6},
    phase: {type: 'number', default: 0}
  },
  init: function() {
    this.animatedShaders = [];
    this.onModelLoaded = () => {
      this.animatedShaders = [];
      const root = this.el.getObject3D('mesh');
      if (!root) return;
      root.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        const originalMaterials = Array.isArray(node.material) ? node.material : [node.material];
        const fixedMaterials = originalMaterials.map((m) => {
          // Clone, rather than modify a shared glTF material.
          const copy = m.clone();
          const uniforms = {uFoxTime: {value: 0}};
          copy.onBeforeCompile = (shader) => {
            shader.uniforms.uFoxTime = uniforms.uFoxTime;
            shader.vertexShader = 'uniform float uFoxTime;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
              // Limit deformation to the rear/fan section, leaving eyes, ears, and paws stable.
              float behind = 1.0 - smoothstep(-0.10, 0.09, position.z);
              float sideTail = smoothstep(0.17, 0.29, abs(position.x));
              float upperTail = smoothstep(0.30, 0.67, position.y);
              float tailWeight = behind * max(sideTail, upperTail * 0.75);
              float wave = uFoxTime * 1.55 + position.x * 12.0 + position.y * 4.3;
              transformed.x += tailWeight * 0.010 * sin(wave);
              transformed.y += tailWeight * 0.006 * sin(wave * 0.79 + 1.2);
              `
            );
            this.animatedShaders.push(shader);
          };
          // Required to keep the modified program separate from standard materials.
          copy.customProgramCacheKey = () => 'fox-tail-sway-1';
          copy.needsUpdate = true;
          return copy;
        });
        node.material = Array.isArray(node.material) ? fixedMaterials : fixedMaterials[0];
      });
    };
    this.el.addEventListener('model-loaded', this.onModelLoaded);
    if (this.el.getObject3D('mesh')) this.onModelLoaded();
  },
  tick: function(time) {
    const t = time * 0.001 * this.data.speed + this.data.phase;
    for (const shader of this.animatedShaders) shader.uniforms.uFoxTime.value = t;
  },
  remove: function() { this.el.removeEventListener('model-loaded', this.onModelLoaded); }
});

// Floating sakura petals, purely three.js objects (no extra image files required).
AFRAME.registerComponent('sakura-petals', {
  schema: {count:{type:'int', default:10}, spread:{type:'number', default:1}, speed:{type:'number', default:1}},
  init: function() {
    const THREE = AFRAME.THREE;
    this.pieces=[];
    this.group = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(0.042, 0.024);
    const colors=['#ffd0dc','#f3a7bb','#fff3ee'];
    const materials=colors.map(color=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:0.8,depthWrite:false}));
    for (let i=0;i<this.data.count;i++) {
      const mesh = new THREE.Mesh(geometry, materials[i%materials.length]);
      const seed=(i*0.6180339)%1;
      const phase=i*1.71;
      const x=(seed-.5)*1.5*this.data.spread;
      const y=((i*0.173)%1)*1.0;
      const z=.12+((i*0.31)%1)*.24;
      mesh.position.set(x,y,z);
      mesh.rotation.set(0,0,phase);
      this.group.add(mesh);
      this.pieces.push({mesh,x,y,z,phase});
    }
    this.el.object3D.add(this.group);
  },
  tick: function(time) {
    const t=time*0.001*this.data.speed;
    for (const p of this.pieces){
      const v=(p.y + t*0.11 + p.phase*0.07)%1.15;
      p.mesh.position.set(p.x+0.09*Math.sin(t*.8+p.phase),v,p.z);
      p.mesh.rotation.z=t*.6+p.phase;
      p.mesh.rotation.y=Math.sin(t*.9+p.phase)*.25;
    }
  },
  remove: function(){
    this.el.object3D.remove(this.group);
    this.group.traverse(x=>{if(x.isMesh)x.geometry.dispose()});
  }
});
