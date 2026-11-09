(() => {
  const turn=document.querySelector('#turn');
  let pressed=false,x=0,y=0;
  const reset=()=>{turn.object3D.rotation.set(0,0,0)};
  document.querySelector('#reset').addEventListener('click',reset);
  document.addEventListener('pointerdown',e=>{if(e.target.closest('a,button'))return; pressed=true; x=e.clientX;y=e.clientY});
  document.addEventListener('pointermove',e=>{if(!pressed)return;
    const dx=e.clientX-x,dy=e.clientY-y;x=e.clientX;y=e.clientY;
    turn.object3D.rotation.y+=dx*0.007;
    turn.object3D.rotation.x=Math.max(-.28,Math.min(.28,turn.object3D.rotation.x+dy*.003));
  });
  ['pointercancel','pointerup'].forEach(t=>document.addEventListener(t,()=>pressed=false));
})();