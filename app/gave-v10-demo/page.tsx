'use client';

import {useEffect,useRef,useState} from 'react';

const AUDIO='/api/gave-v5-h1?scene=1&direct=1';
const V1='https://d34w7g4gy10iej.cloudfront.net/video/2503/DOD_110894111/DOD_110894111.mp4';
const V2='https://d34w7g4gy10iej.cloudfront.net/video/2508/DOD_111246696/DOD_111246696.mp4';
const caps=[
'En entrenamiento profesional, integrar es más difícil que memorizar.',
'La competencia no se demuestra recitando métodos, sino cuando un caso real obliga a decidir:',
'qué información falta, qué riesgo existe, qué merece atención y qué debe esperar.',
'El Sistema GHC parte de una idea sencilla:',
'la respuesta real del cliente tiene que convertirse en la siguiente decisión.'
];
const shots=[
 {src:V1,t:2.5,k:'ENTRENAMIENTO PROFESIONAL',h:'INTEGRAR ES DECIDIR',tags:['OBSERVAR','INTERPRETAR','DECIDIR']},
 {src:V1,t:13,k:'COMPETENCIA PROFESIONAL',h:'NO ES MEMORIZAR MÉTODOS',tags:['CRITERIO','CONTEXTO','DECISIÓN']},
 {src:V1,t:22,k:'CASO REAL',h:'LA REALIDAD OBLIGA A PRIORIZAR',tags:['PERSONA','OBJETIVO','LIMITACIONES']},
 {src:V2,t:8,k:'INFORMACIÓN ÚTIL',h:'¿QUÉ DATO CAMBIA EL PLAN?',tags:['INFORMACIÓN','RIESGO','PRIORIDAD']},
 {src:V1,t:36,k:'SISTEMA GHC',h:'LA RESPUESTA GENERA LA SIGUIENTE DECISIÓN',tags:['RESPUESTA REAL','REVISIÓN','SIGUIENTE DECISIÓN']}
];

export default function Page(){
 const a=useRef<HTMLAudioElement>(null),v0=useRef<HTMLVideoElement>(null),v1=useRef<HTMLVideoElement>(null);
 const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[cc,setCc]=useState(false),[idx,setIdx]=useState(0),[pct,setPct]=useState(0),[front,setFront]=useState(0),[status,setStatus]=useState('Preparando H1…');
 useEffect(()=>{setCc(localStorage.getItem('gave_cc')==='on'); if(a.current){a.current.src=AUDIO;a.current.load()}},[]);
 const applyShot=(n:number)=>{
   if(n===idx&&playing)return; const back=front?0:1; const el=back?v1.current:v0.current; if(!el)return;
   const s=shots[n]; if(el.src!==s.src){el.src=s.src;el.load()}
   const show=()=>{try{el.currentTime=s.t}catch{};el.play().catch(()=>{});setTimeout(()=>{setIdx(n);setFront(back)},120)};
   if(el.readyState>=1)show(); else el.addEventListener('loadedmetadata',show,{once:true});
 };
 const play=async()=>{if(!a.current)return;if(a.current.paused){try{await a.current.play();setPlaying(true);setStatus('H1 en reproducción');applyShot(idx)}catch{setStatus('No se pudo iniciar H1')}}else{a.current.pause();v0.current?.pause();v1.current?.pause();setPlaying(false)}};
 const tick=()=>{if(!a.current)return;const d=a.current.duration||1,p=a.current.currentTime/d;setPct(p*100);let n=Math.min(4,Math.floor(p*5));if(n!==idx)applyShot(n)};
 const s=shots[idx];
 return <main><section className="screen">
   <video ref={v0} muted playsInline preload="metadata" className={front===0?'vid on':'vid'}/><video ref={v1} muted playsInline preload="metadata" className={front===1?'vid on':'vid'}/>
   <div className="grade"/><div className="top">GHC ACADEMY · GAVE V10 <span>DOCUMENTARY CROSSFADE · 0 €</span></div>
   <div className="copy"><small>{`0${idx+1} · ${s.k}`}</small><h1>{s.h}</h1></div>
   <div className="tags">{s.tags.map((x,k)=><b key={x} className={k===s.tags.length-1?'last':''}>{x}</b>)}</div>
   {cc&&<div className="sub">{caps[idx]}</div>}
   <div className="bar"><button onClick={play}>{playing?'PAUSA':ready?'REPRODUCIR V10':'PREPARANDO H1…'}</button><button className={cc?'cc on':'cc'} onClick={()=>{const n=!cc;setCc(n);localStorage.setItem('gave_cc',n?'on':'off')}}>{cc?'CC ON':'CC OFF'}</button><div><i style={{width:`${pct}%`}}/></div><em>{idx+1}/5</em></div>
   <div className="status">{status}</div>
   <audio ref={a} onCanPlay={()=>{setReady(true);setStatus('H1 preparada · Play disponible')}} onTimeUpdate={tick} onEnded={()=>setPlaying(false)}/>
 </section><p>Preview técnico · crossfade entre planos · voz H1 same-origin · Production intacto</p>
 <style jsx>{`
 main{min-height:100vh;background:#050706;padding:18px;color:#f2f4f1;font-family:Arial,sans-serif}.screen{position:relative;max-width:1600px;aspect-ratio:16/9;margin:auto;overflow:hidden;background:#080b0a;border:1px solid #1e3828;border-radius:16px}.vid{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;opacity:0;transition:opacity .8s ease;filter:saturate(.78) contrast(1.1) brightness(.72)}.vid.on{opacity:1}.grade{position:absolute;inset:0;background:linear-gradient(90deg,#040604ef 0%,#0406049c 30%,transparent 68%,#04060470 100%),linear-gradient(0deg,#040604ed 0%,transparent 42%,#04060475 100%)}.top{position:absolute;top:4%;left:4%;right:4%;font-size:11px;letter-spacing:.14em;color:#69df8c}.top span{float:right}.copy{position:absolute;left:6%;top:14%;width:72%;text-shadow:0 4px 24px #000}.copy small{color:#79e49b;letter-spacing:.14em}.copy h1{font-size:clamp(30px,3.5vw,64px);line-height:1.02;margin:.35em 0}.tags{position:absolute;left:7%;right:7%;bottom:24%;display:flex;gap:10px;flex-wrap:wrap}.tags b{padding:10px 14px;background:#08130fd9;border:1px solid #526b5a;font-size:clamp(10px,.95vw,15px)}.tags .last{border-color:#22d65b;color:#8af0aa}.sub{position:absolute;bottom:3.6%;left:8%;right:8%;text-align:center;font-size:clamp(18px,1.35vw,26px);font-weight:700;text-shadow:0 2px 8px #000,0 0 16px #000}.bar{position:absolute;bottom:11%;left:5%;right:5%;display:flex;align-items:center;gap:10px}.bar button{background:#0a1510e8;border:1px solid #53675a;color:#fff;padding:9px 13px;border-radius:8px;font-weight:800}.bar .on{border-color:#22d65b;color:#8af0aa}.bar>div{height:4px;flex:1;background:#29342d}.bar i{display:block;height:100%;background:#22d65b}.bar em{font-size:11px;color:#a5b1aa}.status{position:absolute;left:2.4%;bottom:1%;font-size:8px;color:#91a097}p{text-align:center;color:#758178;font-size:11px}
 `}</style></main>
}
