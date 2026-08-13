'use client';

import { useMemo, useRef, useState } from 'react';

const text='En entrenamiento profesional, integrar es más difícil que memorizar. La competencia no se demuestra recitando métodos, sino cuando un caso real obliga a decidir: qué información falta, qué riesgo existe, qué merece atención y qué debe esperar. El Sistema GHC parte de una idea sencilla: la respuesta real del cliente tiene que convertirse en la siguiente decisión.';
const caps=[
 'En entrenamiento profesional, integrar es más difícil que memorizar.',
 'La competencia no se demuestra recitando métodos.',
 'Un caso real obliga a decidir con información incompleta.',
 'Qué información falta, qué riesgo existe y qué merece atención.',
 'La respuesta real del cliente tiene que convertirse en la siguiente decisión.'
];
const weights=caps.map(x=>x.split(/\s+/).length+(x.match(/[,:;]/g)?.length||0)*1.6+(x.match(/[.?!]/g)?.length||0)*2.4);
const total=weights.reduce((a,b)=>a+b,0);
const cuts=weights.reduce((a,w)=>{a.push((a.at(-1)||0)+w/total);return a},[] as number[]);

export default function Page(){
 const audio=useRef<HTMLAudioElement>(null); const [t,setT]=useState(0); const [d,setD]=useState(1); const [busy,setBusy]=useState(false);
 const p=Math.max(0,Math.min(1,(t-.22)/d));
 const ci=Math.min(caps.length-1,cuts.findIndex(x=>p<x)===-1?caps.length-1:cuts.findIndex(x=>p<x));
 const shot=Math.min(4,Math.floor((t/d)*5));
 const pct=Math.min(100,t/d*100);
 const play=()=>{if(!audio.current)return;setBusy(true);setT(0);audio.current.src=`/api/gave-v5-h1?scene=1&direct=1&x=${Date.now()}`;audio.current.play()};
 return <main><section className="screen"><div className="grid"/><div className="top">GHC ACADEMY · GAVE V6 <span>H1 · 0 € · SINGLE VOICE</span></div><div className="head"><small>DOCUMENTARY ENGINE / MOTION PASS</small><h1>INTEGRAR ES DECIDIR</h1></div><div className={`viz shot${shot}`}>
  <div className="s0"><i>INFORMACIÓN</i><i>RIESGO</i><i>PRIORIDAD</i><i>RESPUESTA</i><b>DECISIÓN</b></div>
  <div className="s1"><b>CASO REAL</b><i>OBJETIVO</i><i>DOLOR</i><i>SUEÑO</i><i>CONTEXTO</i><i>ADHERENCIA</i></div>
  <div className="s2"><i>HECHO</i><strong>→</strong><i>HIPÓTESIS</i><strong>→</strong><b>DECISIÓN</b></div>
  <div className="s3"><b>PRIORIDAD</b><div><i>RIESGO</i><i>IMPACTO</i><i>URGENCIA</i></div></div>
  <div className="s4"><i>OBSERVAR</i><strong>→</strong><i>DECIDIR</i><strong>→</strong><i>APLICAR</i><strong>→</strong><b>REVISAR</b></div>
 </div><div className="sub">{caps[ci]}</div><div className="bar"><button onClick={play}>{busy?'CARGANDO H1…':'REPRODUCIR V6'}</button><div><b style={{width:`${pct}%`}}/></div><em>{shot+1}/5</em></div><audio ref={audio} onCanPlay={()=>setBusy(false)} onTimeUpdate={e=>setT(e.currentTarget.currentTime)} onDurationChange={e=>setD(e.currentTarget.duration||1)} onEnded={()=>setBusy(false)}/></section><p>Una generación H1 · cinco estados visuales · subtítulos ponderados por frase · Production intacto</p><style jsx>{`
 main{min-height:100vh;background:#050706;padding:18px;color:#f2f4f1;font-family:Arial,sans-serif}.screen{position:relative;max-width:1600px;aspect-ratio:16/9;margin:auto;overflow:hidden;background:#080b0a;border:1px solid #1e3828;border-radius:16px}.grid{position:absolute;inset:0;background-image:linear-gradient(#17302355 1px,transparent 1px),linear-gradient(90deg,#17302355 1px,transparent 1px);background-size:70px 70px;animation:g 12s linear infinite}.top{position:absolute;top:4%;left:4%;right:4%;font-size:12px;letter-spacing:.12em;color:#4bd779}.top span{float:right;color:#aab9ae}.head{position:absolute;top:13%;left:6%;right:6%}.head small{color:#45d77b;letter-spacing:.13em}.head h1{font-size:clamp(27px,3vw,56px);margin:.35em 0}.viz{position:absolute;left:8%;right:8%;top:34%;bottom:22%;display:grid;place-items:center}.viz>div{display:none;width:100%;height:100%;align-items:center;justify-content:center;gap:2%;animation:in .65s ease}.shot0 .s0,.shot1 .s1,.shot2 .s2,.shot3 .s3,.shot4 .s4{display:flex}.viz i,.viz b{font-style:normal;padding:14px 20px;border:1px solid #3b8053;background:#0d1c14dd;font-weight:800;letter-spacing:.04em}.viz b{border:2px solid #22d65b;color:#76ef9b;font-size:1.25em}.s0{flex-wrap:wrap}.s0 i{animation:p 2.4s ease-in-out infinite}.s1{position:relative}.s1 b{position:absolute}.s1 i{position:absolute}.s1 i:nth-of-type(1){transform:translate(-260px,-90px)}.s1 i:nth-of-type(2){transform:translate(250px,-70px)}.s1 i:nth-of-type(3){transform:translate(-250px,100px)}.s1 i:nth-of-type(4){transform:translate(230px,100px)}.s1 i:nth-of-type(5){transform:translate(0,145px)}.s2 strong,.s4 strong{color:#22d65b;font-size:32px}.s3{flex-direction:column}.s3>div{display:flex;gap:16px}.s4{flex-wrap:wrap}.sub{position:absolute;bottom:2.35%;left:7%;right:7%;text-align:center;font-size:clamp(18px,1.35vw,26px);font-weight:700;line-height:1.28;color:#f7faf7;text-shadow:0 2px 8px #000,0 0 16px #000}.bar{position:absolute;bottom:8.3%;left:5%;right:5%;display:flex;align-items:center;gap:12px}.bar button{background:#10261a;border:1px solid #3b8354;color:#fff;padding:9px 13px;border-radius:8px;font-weight:800}.bar>div{height:4px;flex:1;background:#29332d}.bar b{display:block;height:100%;background:#22d65b}.bar em{font-size:11px;color:#91a398}p{text-align:center;color:#6e7b73;font-size:11px}@keyframes g{to{background-position:70px 70px,70px 70px}}@keyframes in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes p{50%{transform:translateY(-7px);border-color:#22d65b}}`}</style></main>
}
