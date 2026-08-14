'use client';

import { useEffect,useRef,useState } from 'react';

const VIDEO='https://upload.wikimedia.org/wikipedia/commons/transcoded/a/ae/New_York_Personal_Trainer_Joshua_Bailey_Circuit_Training.webm/New_York_Personal_Trainer_Joshua_Bailey_Circuit_Training.webm.720p.vp9.webm';
const caps=[
 'El entrenamiento personal empieza antes del primer ejercicio.',
 'El entrenador observa a la persona, evalúa lo necesario y decide qué movimiento y qué carga tienen sentido hoy.',
 'Durante la sesión, la técnica, el esfuerzo y la respuesta del cliente aportan información.',
 'El plan se ajusta con esa información, no con recetas.',
 'En el sistema GHC, cada sesión debe mejorar la siguiente decisión.'
];
const shots=[
 {at:6,ey:'01 · ANTES DEL PRIMER EJERCICIO',title:'ENTENDER A LA PERSONA',tags:['OBJETIVO','CONTEXTO','CAPACIDAD ACTUAL']},
 {at:25,ey:'02 · EVALUAR PARA DECIDIR',title:'MOVIMIENTO Y CARGA CON SENTIDO',tags:['EVALUACIÓN','SELECCIÓN','DOSIFICACIÓN']},
 {at:45,ey:'03 · LA SESIÓN GENERA DATOS',title:'TÉCNICA · ESFUERZO · RESPUESTA',tags:['EJECUCIÓN','FEEDBACK','RESPUESTA REAL']},
 {at:68,ey:'04 · EL PLAN NO ES UNA RECETA',title:'AJUSTAR CON INFORMACIÓN',tags:['CRITERIO','AJUSTE','PROGRESIÓN']},
 {at:91,ey:'05 · SISTEMA GHC',title:'CADA SESIÓN MEJORA LA SIGUIENTE DECISIÓN',tags:['OBSERVAR','REVISAR','DECIDIR']}
];
const words=caps.map(x=>x.split(/\s+/).length);const sum=words.reduce((a,b)=>a+b,0);let a=0;const expected=words.slice(0,-1).map(w=>(a+=w)/sum);

function findBoundaries(buf:AudioBuffer){
 const ch=buf.getChannelData(0),sr=buf.sampleRate,d=buf.duration,win=Math.max(1,Math.floor(sr*.045));
 return expected.map((r,i)=>{
  const target=r*d,lo=Math.max(.45,target-1.8),hi=Math.min(d-.35,target+1.8);let best=target,bestScore=Infinity;
  for(let t=lo;t<=hi;t+=.025){const s=Math.floor(t*sr);let q=0,n=0;for(let k=s;k<Math.min(ch.length,s+win);k+=4){q+=ch[k]*ch[k];n++}const rms=Math.sqrt(q/Math.max(1,n));const score=rms+Math.abs(t-target)*.0015;if(score<bestScore){bestScore=score;best=t}}
  const min=i?0:0; return Math.max(min,best);
 });
}

export default function Page(){
 const audio=useRef<HTMLAudioElement>(null),va=useRef<HTMLVideoElement>(null),vb=useRef<HTMLVideoElement>(null);const active=useRef(0),current=useRef(0),switching=useRef(false);
 const [bounds,setBounds]=useState<number[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(false),[cc,setCc]=useState(true),[idx,setIdx]=useState(0),[p,setP]=useState(0),[status,setStatus]=useState('PREPARADO PARA GENERAR H1');

 useEffect(()=>{const v=va.current;if(v){v.currentTime=shots[0].at;v.play().then(()=>v.pause()).catch(()=>{})}},[]);

 async function prepare(){if(ready)return true;setBusy(true);setStatus('GENERANDO H1 Y MIDIENDO PAUSAS REALES…');
  try{const r=await fetch(`/api/gave-v12-h1?x=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('audio');const blob=await r.blob();const ab=await blob.arrayBuffer();const ctx=new AudioContext();const decoded=await ctx.decodeAudioData(ab.slice(0));const b=findBoundaries(decoded);await ctx.close();const url=URL.createObjectURL(blob);if(audio.current){audio.current.src=url;audio.current.load()}setBounds(b);setReady(true);setStatus('H1 LISTA · SUBTÍTULOS ANCLADOS A PAUSAS REALES');return true}catch{setStatus('NO SE PUDO GENERAR H1 · REINTENTAR');return false}finally{setBusy(false)}}

 async function crossfade(n:number){if(n===current.current||switching.current)return;switching.current=true;const front=active.current===0?va.current:vb.current,back=active.current===0?vb.current:va.current;if(!back){switching.current=false;return}
  try{back.currentTime=shots[n].at;await new Promise<void>(r=>{if(back.readyState>=2)return r();const done=()=>r();back.addEventListener('canplay',done,{once:true});setTimeout(done,900)});if(playing)back.play().catch(()=>{});back.classList.add('show');front?.classList.remove('show');front?.pause();active.current=active.current?0:1;current.current=n;setIdx(n)}finally{switching.current=false}}

 async function toggle(){if(!audio.current)return;if(!ready){const ok=await prepare();if(!ok)return;await new Promise(r=>setTimeout(r,80))}if(audio.current.paused){await audio.current.play();(active.current===0?va.current:vb.current)?.play().catch(()=>{});setPlaying(true)}else{audio.current.pause();va.current?.pause();vb.current?.pause();setPlaying(false)}}

 function tick(){const x=audio.current;if(!x)return;const t=x.currentTime,d=x.duration||1;setP(t/d);let n=0;while(n<bounds.length&&t>=bounds[n])n++;if(n!==current.current)crossfade(n);setIdx(n)}
 const s=shots[idx];
 return <main><section className="screen"><video ref={va} className="clip show" muted playsInline preload="auto" src={VIDEO}/><video ref={vb} className="clip" muted playsInline preload="auto" src={VIDEO}/><div className="grade"/><div className="top">GHC ACADEMY · GAVE V12 <span>PERSONAL TRAINING · FINAL PASS</span></div><div className="head"><small>{s.ey}</small><h1>{s.title}</h1></div><div className="tags">{s.tags.map((x,k)=>k===2?<b key={x}>{x}</b>:<span key={x}>{x}</span>)}</div>{cc&&<div className="sub">{caps[idx]}</div>}<div className="bar"><button onClick={toggle} disabled={busy}>{busy?'GENERANDO H1…':playing?'PAUSA':'REPRODUCIR V12'}</button><button className={cc?'on':''} onClick={()=>setCc(x=>!x)}>{cc?'CC ON':'CC OFF'}</button><div><b style={{width:`${p*100}%`}}/></div><em>{idx+1}/5</em></div><div className="status">{status}</div><div className="credit">Joshua Bailey Circuit Training · Dallas J Plummer · CC BY-SA 4.0 · Wikimedia Commons</div><audio ref={audio} onTimeUpdate={tick} onEnded={()=>{setPlaying(false);va.current?.pause();vb.current?.pause()}}/></section><p>V12 · H1 completa · GHC pronunciado “ge, hache, ce” · cues derivados del WAV real · crossfade 0,85 s</p><style jsx>{`
 main{min-height:100vh;background:#050706;padding:18px;color:#f2f4f1;font-family:Arial,sans-serif}.screen{position:relative;max-width:1600px;aspect-ratio:16/9;margin:auto;overflow:hidden;background:#080b0a;border:1px solid #1d3828;border-radius:16px;box-shadow:0 30px 90px #0009}.clip{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;opacity:0;transition:opacity .85s ease;filter:saturate(.8) contrast(1.08) brightness(.73)}.clip.show{opacity:1}.grade{position:absolute;inset:0;background:linear-gradient(90deg,#050706f0 0%,#050706a5 30%,transparent 67%,#05070655 100%),linear-gradient(0deg,#050706f0 0%,transparent 38%,#05070675 100%)}.top{position:absolute;top:4%;left:4%;right:4%;font-size:11px;letter-spacing:.14em;color:#65df8a}.top span{float:right;color:#aab8ae}.head{position:absolute;top:14%;left:6%;right:6%;text-shadow:0 4px 22px #000}.head small{color:#7be69d;letter-spacing:.13em}.head h1{font-size:clamp(30px,3.55vw,64px);line-height:1.02;margin:.35em 0}.tags{position:absolute;left:7%;right:7%;bottom:24%;display:flex;gap:10px;flex-wrap:wrap}.tags span,.tags b{padding:10px 15px;background:#08130fd9;border:1px solid #526b5a;font-size:clamp(10px,.95vw,15px);letter-spacing:.05em}.tags b{border-color:#22d65b;color:#8cf0aa}.sub{position:absolute;bottom:3.5%;left:7%;right:7%;text-align:center;font-size:clamp(18px,1.34vw,26px);font-weight:700;line-height:1.28;text-shadow:0 2px 8px #000,0 0 18px #000}.bar{position:absolute;bottom:10.8%;left:5%;right:5%;display:flex;align-items:center;gap:10px}.bar button{background:#0a1510ea;border:1px solid #52675a;color:#fff;padding:9px 13px;border-radius:8px;font-weight:800}.bar button.on{border-color:#22d65b;color:#8cf0aa}.bar>div{height:4px;flex:1;background:#29342d}.bar>div b{display:block;height:100%;background:#22d65b}.bar em{font-size:10px;color:#a5b2aa}.status{position:absolute;left:2.3%;bottom:.8%;font-size:8px;color:#8fe0a7}.credit{position:absolute;right:2.3%;bottom:.8%;font-size:8px;color:#95a198}p{text-align:center;color:#758178;font-size:11px}@media(max-width:700px){.top{font-size:8px}.sub{bottom:5%}.bar{bottom:13%}}`}</style></main>
}
