(() => {
  const cover=document.querySelector('#intro'), btn=document.querySelector('#start'), err=document.querySelector('#error');
  const scene=document.querySelector('a-scene'), target=document.querySelector('#target'), scaleRoot=document.querySelector('#scale-root');
  const status=document.querySelector('#status');
  let scale=1;
  document.querySelector('#smaller').addEventListener('click',()=>{scale=Math.max(.55,scale-.10);scaleRoot.object3D.scale.setScalar(scale)});
  document.querySelector('#bigger').addEventListener('click',()=>{scale=Math.min(1.55,scale+.10);scaleRoot.object3D.scale.setScalar(scale)});
  target.addEventListener('targetFound',()=>{status.textContent='✨ Трое рядом!'});
  target.addEventListener('targetLost',()=>{status.textContent='Наведи камеру на карточку'});
  scene.addEventListener('arError',()=>{status.textContent='Не удалось включить камеру. Проверь разрешение.'});
  btn.addEventListener('click',async()=>{
    btn.disabled=true;err.textContent='';
    try{
      if(!window.isSecureContext)throw new Error('Камера требует HTTPS. Открой страницу через GitHub Pages, а не из файлов телефона.');
      const res=await fetch('./targets.mind',{cache:'no-store'});
      if(!res.ok)throw new Error('Нет файла targets.mind! Создай его из card.png в компиляторе MindAR и загрузи в корень сайта.');
      if(!scene.hasLoaded)await new Promise(resolve=>scene.addEventListener('loaded',resolve,{once:true}));
      const system=scene.systems['mindar-image-system'];
      if(!system)throw new Error('Не загрузился MindAR. Проверь доступ к интернету.');
      await system.start();
      cover.style.display='none';
    }catch(e){err.textContent=String(e.message||e);btn.disabled=false;}
  });
})();