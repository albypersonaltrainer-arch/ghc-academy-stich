'use client';

import { useMemo, useRef, useState } from 'react';

const scenes = [
  { id: 1, title: 'INTEGRAR ES DECIDIR', text: 'En entrenamiento profesional, integrar es más difícil que memorizar. La competencia no se demuestra recitando métodos, sino cuando un caso real obliga a decidir: qué información falta, qué riesgo existe, qué merece atención y qué debe esperar. El Sistema GHC parte de una idea sencilla: la respuesta real del cliente tiene que convertirse en la siguiente decisión.', tags: ['INFORMACIÓN','RIESGO','PRIORIDAD','RESPUESTA'] },
  { id: 2, title: 'UN CASO REAL NO LLEGA ORDENADO', text: 'Un caso real rara vez llega ordenado. La misma persona puede querer perder grasa, recuperar fuerza, reducir dolor y sentirse mejor, mientras duerme poco, tiene horarios variables o toma medicación. El trabajo profesional empieza separando hechos, hipótesis y decisiones. Un hecho describe lo observado. Una hipótesis propone una explicación que puede ser falsa. Y una decisión especifica qué haremos ahora y qué dato podría obligarnos a cambiar el plan.', tags: ['HECHO','HIPÓTESIS','DECISIÓN'] },
  { id: 3, title: 'OCHO ETAPAS. UN BUCLE QUE APRENDE.', text: 'Para organizar esa incertidumbre, GHC utiliza ocho etapas: seguridad, contexto, evaluación mínima útil, prioridad, programa, ejecución, respuesta y revisión. No son una receta rígida. Son una arquitectura para evitar que el entrenador salte directamente al ejercicio favorito. Cada etapa puede adaptarse a la persona, pero el sistema debe conservar la trazabilidad: por qué se decidió, qué se hizo y qué ocurrió después.', tags: ['SEGURIDAD','CONTEXTO','EVAL. MÍN.','PRIORIDAD','PROGRAMA','EJECUCIÓN','RESPUESTA','REVISIÓN'] },
];

function split(text:string){const w=text.split(' '),o:string[]=[];for(let i=0;i<w.length;i+=8)o.push(w.slice(i,i+8).join(' '));return o;}

export default function Page(){
  const audio=useRef<HTMLAudioElement>(null);
  const [i,setI]=useState(0); const [t,setT]=useState(0); const [d,setD]=useState(1); const [busy,setBusy]=useState(false);
  const s=scenes[i]; const subs=useMemo(()=>split(s.text),[s.text]); const si=Math.min(subs.length-1,Math.floor((t/d)*subs.length));
  const play=(n=i)=>{setI(n);setT(0);setBusy(true);setTimeout(()=>{if(!audio.current)return; audio.current.src=`/api/gave-v5-h1?scene=${scenes[n].id}&direct=1&x=${Date.now()}`; audio.current.play();},20)};
  return <main>
    <section className="screen">
      <div className="grid"/><div className="top">GHC ACADEMY · GAVE V5 <span>H1 HOMBRE CÁLIDO · 0 €</span></div>
      <div className="head"><small>0{s.id} / DOCUMENTARY ENGINE</small><h1>{s.title}</h1></div>
      <div className={`viz v${s.id}`}>{s.tags.map((x,k)=><div className="tag" style={{animationDelay:`${k*.18}s`}} key={x}>{x}</div>)}<div className="core">{s.id===1?'DECISIÓN':s.id===2?'PERSONA':'GHC'}</div></div>
      <div className="sub">{subs[si]||''}</div>
      <div className="bar"><button onClick={()=>play()}>{busy?'CARGANDO H1…':'REPRODUCIR V5'}</button><div><b style={{width:`${Math.min(100,t/d*100)}%`}}/></div><em>{i+1}/3</em></div>
      <audio ref={audio} onCanPlay={()=>setBusy(false)} onTimeUpdate={e=>setT(e.currentTarget.currentTime)} onDurationChange={e=>setD(e.currentTarget.duration||1)} onEnded={()=>i<2?play(i+1):setBusy(false)}/>
    </section>
    <p>Preview técnico · Qwen3-TTS VoiceDesign H1 · Production intacto</p>
    <style jsx>{`
      main{min-height:100vh;background:#050706;padding:18px;color:#f2f4f1;font-family:Arial,sans-serif}.screen{position:relative;max-width:1600px;aspect-ratio:16/9;margin:auto;overflow:hidden;background:#080b0a;border:1px solid #1e3828;border-radius:16px}.grid{position:absolute;inset:0;background-image:linear-gradient(#17302355 1px,transparent 1px),linear-gradient(90deg,#17302355 1px,transparent 1px);background-size:70px 70px;animation:g 12s linear infinite}.top{position:absolute;top:4%;left:4%;right:4%;font-size:12px;letter-spacing:.12em;color:#4bd779}.top span{float:right;color:#aab9ae}.head{position:absolute;top:13%;left:6%;right:6%}.head small{color:#45d77b;letter-spacing:.13em}.head h1{font-size:clamp(27px,3vw,56px);max-width:85%;margin:.35em 0}.viz{position:absolute;left:9%;right:9%;top:36%;bottom:24%;display:flex;gap:2%;align-items:center;justify-content:center;flex-wrap:wrap}.tag{padding:15px 22px;border:1px solid #3b8053;background:#0d1c14cc;font-weight:800;letter-spacing:.05em;animation:p 2.6s ease-in-out infinite}.core{padding:25px 34px;border:2px solid #22d65b;background:#0e2c1a;color:#70ef98;font-size:clamp(18px,2vw,34px);font-weight:900;animation:c 2.4s ease-in-out infinite}.sub{position:absolute;bottom:3.1%;left:8%;right:8%;text-align:center;font-size:clamp(17px,1.42vw,27px);font-weight:700;line-height:1.25;text-shadow:0 2px 6px #000,0 0 12px #000}.bar{position:absolute;bottom:9%;left:5%;right:5%;display:flex;align-items:center;gap:12px}.bar button{background:#10261a;border:1px solid #3b8354;color:#fff;padding:9px 13px;border-radius:8px;font-weight:800}.bar>div{height:4px;flex:1;background:#29332d}.bar b{display:block;height:100%;background:#22d65b}.bar em{font-size:11px;color:#91a398}p{text-align:center;color:#6e7b73;font-size:11px}@keyframes g{to{background-position:70px 70px,70px 70px}}@keyframes p{50%{transform:translateY(-8px);border-color:#22d65b}}@keyframes c{50%{transform:scale(1.04);box-shadow:0 0 45px #22d65b33}}`}</style>
  </main>
}
