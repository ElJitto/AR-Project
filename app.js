/* Fox Spirits: lightweight 3D cartoon demo using A-Frame primitives.
   These are intentionally TEMPORARY 3D characters; swap for rigged .glb models later.
   No 2D sprite is being used as the AR scene. */
(function () {
  'use strict';
  const C = {
    white: '#fff5ef', charcoal: '#24202b', red: '#ed3850', darkRed: '#b71932',
    rose: '#ff9aaa', skin: '#ffcea8', hair: '#623c31', darkHair: '#392724',
    glasses: '#141827', shiny: '#465772', cream: '#fff6de', gold: '#ffda8a'
  };
  function ent(parent, type, attrs = {}) {
    const el = document.createElement(type);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    parent.appendChild(el);
    return el;
  }
  function sphere(parent, color, pos, size, extra = {}) {
    return ent(parent, 'a-sphere', { color, radius: 1, position: pos.join(' '), scale: size.join(' '), ...extra });
  }
  function cone(parent, color, pos, rTop, rBottom, height, rot = [0, 0, 0]) {
    return ent(parent, 'a-cone', {color, 'radius-top': rTop, 'radius-bottom':rBottom, height,
      position:pos.join(' '), rotation:rot.join(' ')});
  }
  function cyl(parent, color, pos, radius, height, rot=[0,0,0]) {
    return ent(parent,'a-cylinder',{color,radius,height,position:pos.join(' '),rotation:rot.join(' ')});
  }
  function fox(parent, black, pos) {
    const bodyColor = black ? C.charcoal : C.white;
    const accent = black ? '#fc4d5b' : '#ee3855';
    const f = ent(parent,'a-entity',{position:pos.join(' '), scale:'.88 .88 .88'});
    // Nine separate bushy 3D tails, arranged in a fan behind the body.
    for (let i=0;i<9;i++) {
      const a=-85 + i*21.25;
      const pivot=ent(f,'a-entity',{position:'0 0.10 0.10',rotation:`0 0 ${a}`,
        [`animation__wag`]:`property: rotation; from: 0 0 ${a-4}; to: 0 0 ${a+4}; dur: ${1050+i*85}; dir: alternate; loop: true; easing: easeInOutSine`});
      sphere(pivot, bodyColor, [0,.24,.012], [.075,.235,.063]);
      sphere(pivot, accent, [0,.419,.016], [.078,.090,.069]);
    }
    sphere(f,bodyColor,[0,.115,-.018],[.17,.16,.13]);
    sphere(f,bodyColor,[0,.266,-.115],[.158,.139,.127]);
    // ears and ear interiors
    for(const side of [-1,1]) {
      cone(f,bodyColor,[side*.105,.423,-.118],.006,.068,.189,[0,0,-side*13]);
      cone(f,accent,[side*.105,.428,-.159],.003,.039,.127,[0,0,-side*13]);
      sphere(f,black ? C.rose:C.darkRed,[side*.057,.277,-.238],[.024,.013,.013]);
      sphere(f,bodyColor,[side*.098,.040,-.129],[.061,.061,.066]);
    }
    // cheeks, nose and expressive closed smiling eyes
    sphere(f,bodyColor,[0,.225,-.229],[.079,.056,.046]);
    sphere(f,C.darkHair,[0,.242,-.270],[.016,.013,.011]);
    for(const side of [-1,1]){
      sphere(f,accent,[side*.067,.305,-.227],[.026,.010,.010]);
      sphere(f,accent,[side*.034,.375,-.231],[.014,.014,.011]);
    }
    sphere(f,accent,[0,.375,-.227],[.013,.013,.01]);
    // bob like an excited pet
    f.setAttribute('animation__bounce',`property: position; from: ${pos[0]} ${pos[1]} ${pos[2]}; to: ${pos[0]} ${pos[1]+.024} ${pos[2]}; dur: ${black?1050:1330}; dir: alternate; loop: true; easing: easeInOutSine`);
    return f;
  }
  function girl(parent){
    const g=ent(parent,'a-entity',{position:'0 0.01 0.045',
      animation:'property: rotation; from: 0 -4 0; to: 0 4 0; dur: 3200; loop: true; dir: alternate; easing: easeInOutSine'});
    // Hair strands behind head and shoulders
    sphere(g,C.darkHair,[0,.324,.050],[.151,.285,.095]);
    sphere(g,C.hair,[-.096,.33,.035],[.072,.243,.066]);
    sphere(g,C.hair,[.095,.33,.035],[.066,.255,.060]);
    // Sporty red-and-white upper body and dark pleated skirt
    sphere(g,C.cream,[0,.202,-.001],[.145,.161,.082]);
    sphere(g,C.red,[0,.215,-.049],[.110,.147,.074]);
    cone(g,'#26202b',[0,.054,.005],.079,.180,.185);
    for (const side of [-1,1]) {
      sphere(g,C.skin,[side*.161,.207,-.016],[.043,.129,.044],{rotation:`0 0 ${side*25}`});
      sphere(g,C.skin,[side*.192,.108,-.090],[.048,.050,.046]);
    }
    sphere(g,C.skin,[0,.453,-.057],[.121,.152,.109]);
    sphere(g,C.hair,[0,.571,-.025],[.126,.067,.108]);
    // oversized black sunglasses as in the photo/card
    for(const side of [-1,1]) {
      sphere(g,C.glasses,[side*.054,.475,-.161],[.054,.040,.015]);
      sphere(g,C.shiny,[side*.050,.486,-.177],[.024,.009,.003]);
    }
    cyl(g,C.glasses,[0,.476,-.170],.008,.047,[90,0,0]);
    // small smile
    sphere(g,C.darkRed,[0,.391,-.169],[.023,.005,.004]);
    return g;
  }
  AFRAME.registerComponent('cast-builder', {
    init: function(){
      const root=this.el;
      // A luminous round platform emphasizes that this is a volumetric AR scene.
      cyl(root,C.cream,[0,-.060,.035],.424,.030);
      cyl(root,C.gold,[0,-.055,.035],.401,.018);
      girl(root);
      fox(root,false,[-.245,-.025,-.104]);
      fox(root,true,[.245,-.030,-.119]);
      for(let i=0;i<12;i++){
        const angle=i*Math.PI*2/12;
        const x=.39*Math.cos(angle), z=.18*Math.sin(angle);
        const petal=sphere(root,i%2?C.rose:C.gold,[x,.18+(i%3)*.13,z],[.018,.031,.010],{
          rotation:`0 ${i*30} ${i*24}`});
        petal.setAttribute('animation',`property: position; from: ${x} ${.18+(i%3)*.13} ${z}; to: ${x+.025} ${.25+(i%3)*.13} ${z}; dur:${900+i*95}; dir:alternate; loop:true; easing:easeInOutSine`);
      }
    }
  });
  const startScreen=document.getElementById('start-screen');
  const button=document.getElementById('start');
  const error=document.getElementById('error');
  const status=document.getElementById('status');
  const scene=document.querySelector('a-scene');
  const target=document.getElementById('target');
  scene.addEventListener('arReady',()=>{status.textContent='Наведите камеру на карточку 🦊';});
  scene.addEventListener('arError',()=>{status.textContent='Не удалось запустить камеру'; error.textContent='Проверьте разрешения камеры, HTTPS и наличие файла targets.mind.'; startScreen.style.display='flex';button.disabled=false;});
  target.addEventListener('targetFound',()=>{status.textContent='✨ Лисята появились!';});
  target.addEventListener('targetLost',()=>{status.textContent='Наведите камеру на карточку 🦊';});
  button.addEventListener('click',async()=>{
    button.disabled=true; error.textContent='';
    try {
      if(!scene.hasLoaded){await new Promise(resolve=>scene.addEventListener('loaded',resolve,{once:true}));}
      await scene.systems['mindar-image-system'].start();
      startScreen.style.display='none';
    } catch(e){
      console.error(e);
      error.textContent='Ошибка запуска: '+(e?.message||String(e))+'\nУбедитесь, что вы добавили targets.mind и открыли сайт через HTTPS.';
      button.disabled=false;
    }
  });
})();
