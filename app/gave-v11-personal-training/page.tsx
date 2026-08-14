'use client';

import { useMemo, useRef, useState } from 'react';

const VIDEO='https://upload.wikimedia.org/wikipedia/commons/transcoded/a/ae/New_York_Personal_Trainer_Joshua_Bailey_Circuit_Training.webm/New_York_Personal_Trainer_Joshua_Bailey_Circuit_Training.webm.720p.vp9.webm';

const caps=[
 'El entrenamiento personal no consiste en elegir ejercicios al azar.',
 'Empieza entendiendo a la persona: qué quiere conseguir, qué puede hacer hoy y qué factores pueden limitar su progreso.',
 'Después se evalúa lo mínimo útil, se seleccionan patrones de movimiento, se ajusta la carga y se observa la respuesta.',
 'Una técnica correcta no es una postura congelada: es una ejecución segura, eficiente y adecuada para esa persona.',
 'El entrenador decide, aplica, observa y corrige.',
 'Eso es lo que diferencia acompañar una sesión de construir un proceso de entrenamiento.',
 'En el sistema G, H, C, cada sesión debe dejar información para tomar una mejor decisión en la siguiente.'
];

const shots=[
 {at:4,title:'ENTRENAMIENTO PERSONAL',ey:'01 · ENTENDER ANTES DE ENTRENAR',tags:['PERSONA','OBJETIVO','CONTEXTO']},
 {at:18,title:'EL CASO REAL MANDA',ey:'02 · NO HAY DOS CLIENTES IGUALES',tags:['CAPACIDAD ACTUAL','LIMITACIONES','ADHERENCIA']},
 {at:34,title:'EVALUAR LO MÍNIMO ÚTIL',ey:'03 · MEDIR PARA DECIDIR',tags:['MOVIMIENTO','CARGA','RESPUESTA']},
 {at:50,title:'TÉCNICA QUE SIRVE A LA PERSONA',ey:'04 · SEGURA · EFICIENTE · ADECUADA',tags:['CONTROL','EJECUCIÓN','INDIVIDUALIZACIÓN']},
 {at:65,title:'DECIDIR · APLICAR · OBSERVAR',ey:'05 · EL ENTRENADOR NO SOLO ACOMPAÑA',tags:['CRITERIO','AJUSTE','FEEDBACK']},
 {at:80,title:'CONSTRUIR UN PROCESO',ey:'06 · MÁS ALLÁ DE UNA SESIÓN',tags:['PROGRESIÓN','COHERENCIA','CONTINUIDAD']},
 {at:96,title:'GHC · LA SIGUIENTE DECISIÓN',ey:'07 · CADA SESIÓN DEJA INFORMACIÓN',tags:['RESPUESTA REAL','REVISIÓN','SIGUIENTE PASO']},
];

const weights=caps.map(x=>x.split(/\s+/).length+(x.match(/[,:;]/g)?.length||0)*1.6+(x.match(/[.?!]/g)?.length||0)*2.7);
const total=weights.reduce((a,b)=>a+b,0);
const cuts=weights.reduce((a,w)=>{a.push((a.at(-1)||0)+w/total);return a},[] as number[]);

export default function Page(){
 const audio=useRef<HTMLAudioElement>(null);
 const va=useRef<HTMLVideoElement>(null); const vb=useRef<HTMLVideoElement>(null);
 const active=useRef(0); const current=useRef(-1); const switching=useRef(false);
 const [t,setT]=useState(0); const [d,setD]=useState(1); const [playing,setPlaying]=useState(false); const [busy,setBusy]=useState(false);
 const [cc,setCc]=useState(false); const [idx,setIdx]=useState(0);
 const p=Math.max(0,Math.min(1,t/d));
 const ci=useMemo(()=>{const x=cuts.findIndex(c=>p<c);return x<0?caps.length-1:x},[p]);
 const shot=shots[idx];

 const crossfade=async(n:number)=>{
   if(n===current.current||switching.current)return;
   switching.current=true;
   const front=active.current===0?va.current:vb.current;
   const back=active.current===0?vb.current:va.current;
   if(!back){switching.current=false;return}
   try{
     if(!back.src){back.src=VIDEO;back.load()}
     const go=()=>{try{back.currentTime=shots[n].at}catch{}};
     if(back.readyState>=1)go();else await new Promise<void>(r=>back.addEventListener('loadedmetadata',()=>{go();r()},{once:true}));
     await new Promise<void>(r=>{if(back.readyState>=2)r();else{const done=()=>r();back.addEventListener('canplay',done,{once:true});setTimeout(done,1400)}});
     if(playing) back.play().catch(()=>{});
     back.classList.add('show'); front?.classList.remove('show'); front?.pause();
     active.current=active.current===0?1:0; current.current=n; setIdx(n);
   }finally{switching.current=false}
 };

 const start=()=>{
   if(!audio.current)return;
   if(playing){audio.current.pause();va.current?.pause();vb.current?.pause();setPlaying(false);return}
   if(!audio.current.src){setBusy(true);audio.current.src=`/api/gave-v5-h1?scene=4&direct=1&x=${Date.now()}`;}
   audio.current.play().then(()=>{setPlaying(true);setBusy(false);crossfade(ci)}).catch(()=>setBusy(false));
 };

 return <main>
  <section className="screen">
   <video ref={va} className="clip show" muted playsInline preload="metadata" src={VIDEO}/>
   <video ref={vb} className="clip" muted playsInline preload="metadata" src={VIDEO}/>
   <div className="grade"/><div className="grain"/>
   <div className="top">GHC ACADEMY · GAVE V11 <span>PERSONAL TRAINING DOCUMENTARY · 0 €</span></div>
   <div className="head"><small>{shot.ey}</small><h1>{shot.title}</h1></div>
   <div className="tags">{shot.tags.map((x,k)=>k===shot.tags.length-1?<b key={x}>{x}</b>:<span key={x}>{x}</span>)}</div>
   {cc&&<div className="sub">{caps[ci]}</div>}
   <div className="bar"><button onClick={start}>{busy?'GENERANDO H1…':playing?'PAUSA':'REPRODUCIR V11'}</button><button className={cc?'cc on':'cc'} onClick={()=>setCc(v=>!v)}>{cc?'CC ON':'CC OFF'}</button><div><b style={{width:`${p*100}%`}}/></div><em>{idx+1}/7</em></div>
   <div className="credit">Joshua Bailey Circuit Training · Dallas J Plummer · CC BY-SA 4.0 · Wikimedia Commons</div>
   <audio ref={audio} onTimeUpdate={e=>{const a=e.currentTarget;setT(a.currentTime);setD(a.duration||1);const q=Math.max(0,Math.min(1,a.currentTime/(a.duration||1)));const n=cuts.findIndex(c=>q<c);crossfade(n<0?6:n)}} onEnded={()=>{setPlaying(false);va.current?.pause();vb.current?.pause()}}/>
  </section>
  <p>V11 · entrenamiento personal · voz H1 · G, H, C separado · 7 planos · crossfade · CC opcional</p>
  <style jsx>{`
   main{min-height:100vh;background:#050706;padding:18px;color:#f2f4f1;font-family:Arial,sans-serif}.screen{position:relative;max-width:1600px;aspect-ratio:16/9;margin:auto;overflow:hidden;background:#080b0a;border:1px solid #1d3828;border-radius:16px;box-shadow:0 30px 90px #0009}.clip{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;opacity:0;transition:opacity .9s ease;filter:saturate(.78) contrast(1.08) brightness(.72)}.clip.show{opacity:1}.grade{position:absolute;inset:0;background:linear-gradient(90deg,#050706ef 0%,#050706a5 30%,transparent 67%,#05070655 100%),linear-gradient(0deg,#050706ef 0%,transparent 38%,#05070675 100%)}.grain{position:absolute;inset:0;opacity:.055;background-image:radial-gradient(#fff .6px,transparent .8px);background-size:4px 4px;mix-blend-mode:soft-light}.top{position:absolute;top:4%;left:4%;right:4%;font-size:11px;letter-spacing:.14em;color:#65df8a}.top span{float:right;color:#aab8ae}.head{position:absolute;top:14%;left:6%;right:6%;text-shadow:0 4px 22px #000}.head small{color:#7be69d;letter-spacing:.13em}.head h1{font-size:clamp(30px,3.55vw,64px);line-height:1.02;margin:.35em 0}.tags{position:absolute;left:7%;right:7%;bottom:24%;display:flex;gap:10px;flex-wrap:wrap}.tags span,.tags b{padding:10px 15px;background:#08130fd9;border:1px solid #526b5a;font-size:clamp(10px,.95vw,15px);letter-spacing:.05em}.tags b{border-color:#22d65b;color:#8cf0aa}.sub{position:absolute;bottom:3.5%;left:7%;right:7%;text-align:center;font-size:clamp(18px,1.34vw,26px);font-weight:700;line-height:1.28;text-shadow:0 2px 8px #000,0 0 18px #000}.bar{position:absolute;bottom:10.8%;left:5%;right:5%;display:flex;align-items:center;gap:10px}.bar button{background:#0a1510ea;border:1px solid #52675a;color:#fff;padding:9px 13px;border-radius:8px;font-weight:800}.bar .cc.on{border-color:#22d65b;color:#8cf0aa}.bar>div{height:4px;flex:1;background:#29342d}.bar>div b{display:block;height:100%;background:#22d65b}.bar em{font-size:10px;color:#a5b2aa}.credit{position:absolute;right:2.3%;bottom:.8%;font-size:8px;color:#95a198}p{text-align:center;color:#758178;font-size:11px}@media(max-width:700px){.top{font-size:8px}.head{right:10%}.sub{bottom:5%}.bar{bottom:13%}}`}</style>
 </main>
}
