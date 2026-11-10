(()=>{
'use strict';
const dict={
 es:{ eyebrow:'UN PEQUEÑO REGALO', heading:'Un poquito de magia para ti ✨', subtitle:'Dos zorritos, un abrazo y un mundo que cobra vida solo para ti.',
   start:'✨ Dar vida a la tarjeta',preview:'Ver en 3D sin cámara',arLink:'📷 Abrir en AR',foot:'Para una mejor experiencia, busca un lugar bien iluminado.',
   assets:'Preparando a los personajes: {n} de 3',waiting:'Los zorritos se están preparando…',loading:'Cargando los modelos 3D…',camera:'Encendiendo la cámara…',ready:'¡Todo listo! ✨',slow:'Está tardando un poquito. Comprueba tu conexión a internet.',
   errorModel:'No se ha podido cargar {name}. Comprueba la conexión y vuelve a abrir la página.',errorCamera:'No se pudo abrir la cámara. Revisa los permisos de Safari o Chrome.',
   errorSecure:'La cámara necesita una conexión HTTPS. Abre el enlace de GitHub Pages.',errorMindar:'No se ha podido iniciar AR. Revisa la conexión e inténtalo otra vez.',retry:'Volver a intentar',
   scan:'Apunta la cámara hacia la tarjeta 🦊',found:'✨ ¡Ya estamos juntitos!',lost:'Vuelve a apuntar hacia la tarjeta',
   hug:'♡ Juntitos',pet:'🐾 Acariciar',jump:'🦊 Saltar',smaller:'− Tamaño',bigger:'+ Tamaño',
   topTitle:'🦊 Nuestra pequeña magia ♡',topDesc:'Ella y dos zorritos, en un mundo 3D',
   hint:'Toca un zorrito: ¡dará un gran salto! 🌸 Los pétalos de cerezo flotan a su alrededor.',
   help:'❔ Cómo jugar',helpText:'«♡ Juntitos» es un abrazo suave; «🐾 Acariciar» acaricia a cada zorrito. Tócalos para que parpadeen y salten. Los pétalos de cerezo caen a su alrededor.',
   white:'🤍 Blanco',black:'🖤 Negro',center:'Centrar',blinkOn:'👁 Parpadeo: sí',blinkOff:'👁 Parpadeo: no',
   jumpJoy:'🦊 ¡Los zorritos saltan de alegría!',whiteJoy:'🤍 ¡El zorrito blanco está feliz!',blackJoy:'🖤 ¡El zorrito negro está feliz!',
   modelGirl:'la chica',modelWhite:'el zorrito blanco',modelBlack:'el zorrito negro',press:'Toca la tarjeta para empezar',
 },
 ru:{ eyebrow:'МАЛЕНЬКИЙ ПОДАРОК',heading:'Немного волшебства для тебя ✨',subtitle:'Два лисёнка, одно объятие и маленький мир, который оживает только для тебя.',
   start:'✨ Оживить карточку',preview:'Смотреть 3D без камеры',arLink:'📷 Открыть AR',foot:'Лучше всего работает при хорошем освещении.',
   assets:'Подготовка персонажей: {n} из 3',waiting:'Лисята готовятся к встрече…',loading:'Загружаются 3D-модели…',camera:'Включаем камеру…',ready:'Всё готово! ✨',slow:'Загрузка занимает больше времени. Проверь интернет.',
   errorModel:'Не удалось загрузить {name}. Проверь интернет и открой страницу заново.',errorCamera:'Не удалось включить камеру. Проверь разрешения в Safari или Chrome.',
   errorSecure:'Камера работает только через HTTPS. Открой ссылку GitHub Pages.',errorMindar:'Не удалось запустить AR. Проверь соединение и попробуй ещё раз.',retry:'Попробовать снова',
   scan:'Наведи камеру на карточку 🦊',found:'✨ Все трое вместе!',lost:'Снова наведи камеру на карточку',
   hug:'♡ Рядом',pet:'🐾 Погладить',jump:'🦊 Прыжок',smaller:'− Размер',bigger:'+ Размер',
   topTitle:'🦊 Наша маленькая магия ♡',topDesc:'Девушка и два лисёнка в мире 3D',
   hint:'Нажми на лисёнка — он высоко подпрыгнет! 🌸 Лепестки сакуры кружатся вокруг.',
   help:'❔ Как играть',helpText:'«♡ Рядом» — мягкое полуобъятие, «🐾 Погладить» — по очереди каждого лисёнка. Нажми на лисёнка, чтобы он моргнул и подпрыгнул. Вокруг падают лепестки сакуры.',
   white:'🤍 Белый',black:'🖤 Чёрный',center:'По центру',blinkOn:'👁 Моргание: вкл',blinkOff:'👁 Моргание: выкл',
   jumpJoy:'🦊 Лисята подпрыгивают от радости!',whiteJoy:'🤍 Белый лисёнок радуется!',blackJoy:'🖤 Чёрный лисёнок радуется!',
   modelGirl:'девушку',modelWhite:'белого лисёнка',modelBlack:'чёрного лисёнка',press:'Нажми, чтобы начать',
 }
};
const params=new URLSearchParams(location.search);let lang=params.get('lang')==='ru'?'ru':'es';
const t=(key,values={})=>(dict[lang][key]||dict.es[key]||key).replace(/\{(\w+)\}/g,(_,k)=>String(values[k]??''));
window.foxLocale={t,get language(){return lang;}};
const $=(sel)=>document.querySelector(sel), $$=(sel)=>[...document.querySelectorAll(sel)];
function translate(){document.documentElement.lang=lang;
  $$('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
  $$('[data-i18n-alt]').forEach(el=>{el.alt=t(el.dataset.i18nAlt)});
  $('#language').textContent=lang==='es'?'ES / RU':'RU / ES';
  $$('a[data-local-link]').forEach(a=>{const u=new URL(a.getAttribute('href').split('?')[0],document.baseURI);if(lang==='ru')u.searchParams.set('lang','ru');a.href=u.href});
}
const mode=document.body.dataset.mode;
let phase='waiting',loaded=0, allReady=false,cameraReady=false,started=false,failed=false,blink=true;
function setPhase(value){phase=value;render();}
function render(){const text=$('#load-line'), detail=$('#load-detail'),status=$('#status'),report=$('#loadreport');
  if(text){text.textContent=failed?t('retry'):(phase==='camera'?t('camera'):allReady?(mode==='preview'||cameraReady?t('ready'):t('camera')):t('assets',{n:loaded}));}
  if(detail&&!failed){detail.textContent=phase==='slow'?t('slow'):((mode==='ar'&&!started)?t('waiting'):(allReady?t('ready'):t('loading')));}
  const cells=$$('.load-steps span');cells.forEach((cell,i)=>cell.classList.toggle('ok',i<loaded));
  if(report)report.textContent=allReady?t('ready'):t('assets',{n:loaded});
}
function hideCover(){const intro=$('#intro');if(!intro||intro.classList.contains('dismissed'))return;intro.classList.add('dismissed');setTimeout(()=>intro.hidden=true,490);}
function updateCurrentHint(){if(mode==='preview'){const hint=$('#hint');if(hint && !hint.dataset.changed) hint.textContent=t('hint');}}
function showError(message){failed=true;const el=$('#error');if(el)el.textContent=message;const btn=$('#start');if(btn){btn.disabled=false;btn.textContent=t('retry');}setPhase('error');}
function setupModels(){const models=$$('[data-gltf-label]');const ready=new Set();
  const mapName=(label)=>label==='Девушка'?t('modelGirl'):label==='Белый лисёнок'?t('modelWhite'):t('modelBlack');
  function good(el){if(ready.has(el))return;ready.add(el);loaded=ready.size;allReady=loaded===models.length;render();maybeFinish();}
  for(const el of models){el.addEventListener('model-loaded',()=>good(el));el.addEventListener('model-error',(e)=>{console.error('Fox model load error',el.getAttribute('data-gltf-label'),e.detail);showError(t('errorModel',{name:mapName(el.getAttribute('data-gltf-label'))}));});if(el.getObject3D('mesh'))good(el);}
  if(!models.length)showError(t('errorMindar'));
}
function maybeFinish(){if(failed||!allReady)return;if(mode==='preview'||(started&&cameraReady)){render();hideCover();if(mode==='ar')setStatus('scan');}}
function setStatus(k){const s=$('#status');if(s)s.textContent=t(k);if(s)s.dataset.statusKey=k;}
async function startAR(){if(started)return;
  failed=false;$('#error').textContent='';started=true;$('#start').disabled=true;const scene=$('a-scene');
  setPhase('camera');try{
    if(!window.isSecureContext)throw Error(t('errorSecure'));
    if(!scene.hasLoaded) await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(t('errorMindar'))),30000);scene.addEventListener('loaded',()=>{clearTimeout(timer);resolve();},{once:true});});
    const system=scene.systems['mindar-image-system'];
    if(!system)throw Error(t('errorMindar'));
    await system.start();cameraReady=true;setPhase(allReady?'ready':'loading');maybeFinish();
  }catch(e){started=false;showError(e.message||t('errorCamera'));}
}
function setupAR(){const scaleRoot=$('#scale-root'),target=$('#target'),scene=$('a-scene');let scale=1;
  $('#smaller').addEventListener('click',()=>{scale=Math.max(.55,scale-.1);scaleRoot.object3D.scale.setScalar(scale)});
  $('#bigger').addEventListener('click',()=>{scale=Math.min(1.55,scale+.1);scaleRoot.object3D.scale.setScalar(scale)});
  target.addEventListener('targetFound',()=>{setStatus('found');scaleRoot.emit('fox-story')});
  target.addEventListener('targetLost',()=>setStatus('lost'));
  scene.addEventListener('arError',e=>{console.error('AR error',e);if(!cameraReady)showError(t('errorCamera'));else setStatus('lost');});
  $('#start').addEventListener('click',startAR);
  $('#story').addEventListener('click',()=>scaleRoot.emit('fox-story'));
  $('#care').addEventListener('click',()=>scaleRoot.emit('fox-care'));
  $('#jump').addEventListener('click',()=>scaleRoot.emit('fox-jump-all'));
  setStatus('scan');
}
function setupPreview(){const turn=$('#turn');
  $('#story').addEventListener('click',()=>turn.emit('fox-story'));
  $('#care').addEventListener('click',()=>turn.emit('fox-care'));
  $('#jump').addEventListener('click',()=>turn.emit('fox-jump-all'));
  for(const [name,side] of [['white-react',-1],['black-react',1]])$('#'+name).addEventListener('click',()=>turn.components['fox-touch-picker']?.react(side));
  $('#blink').addEventListener('click',()=>{blink=!blink;$$('[fox-face-reaction]').forEach(e=>e.setAttribute('fox-face-reaction','enabled',blink));$('#blink').textContent=t(blink?'blinkOn':'blinkOff')});
}
$('#language').addEventListener('click',()=>{lang=lang==='es'?'ru':'es';translate();render();if($('#status')?.dataset.statusKey)setStatus($('#status').dataset.statusKey);if($('#blink'))$('#blink').textContent=t(blink?'blinkOn':'blinkOff');updateCurrentHint();});
translate();mode==='ar'?setupAR():setupPreview();setupModels();render();
setTimeout(()=>{if(!allReady&&!failed){setPhase('slow');}},20000);
})();