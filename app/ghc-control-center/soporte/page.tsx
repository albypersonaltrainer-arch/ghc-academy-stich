'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './support-admin.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>
const STATUS: Record<string,string> = { open:'Abierto',in_progress:'En revisión',waiting_user:'Esperando alumno',resolved:'Resuelto',closed:'Cerrado' }

export default function AdminSupportPage(){
  const router=useRouter()
  const [tickets,setTickets]=useState<AnyRecord[]>([])
  const [selectedId,setSelectedId]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [reply,setReply]=useState('')
  const [replyStatus,setReplyStatus]=useState('waiting_user')
  const [filter,setFilter]=useState('open')

  const load=async()=>{
    const {data:userData}=await supabase.auth.getUser()
    if(!userData.user){router.replace('/acceso');return}
    const {data,error:rpcError}=await supabase.rpc('ghc_admin_list_support_tickets')
    if(rpcError) throw new Error(rpcError.message)
    const next=Array.isArray(data)?data:[]
    setTickets(next)
    setSelectedId((current)=>current||String(next[0]?.id||''))
  }

  useEffect(()=>{load().catch((e)=>setError(e?.message||'No se pudo cargar soporte.')).finally(()=>setLoading(false))},[])

  const filtered=useMemo(()=>filter==='all'?tickets:tickets.filter((ticket)=>filter==='open'?['open','in_progress','waiting_user'].includes(ticket.status):ticket.status===filter),[tickets,filter])
  const selected=useMemo(()=>tickets.find((ticket)=>String(ticket.id)===selectedId)||filtered[0]||tickets[0]||null,[tickets,filtered,selectedId])

  const sendReply=async(event:FormEvent)=>{
    event.preventDefault(); if(!selected?.id)return
    setBusy(true);setError('');setMessage('')
    try{
      const {error:rpcError}=await supabase.rpc('ghc_admin_reply_support_ticket',{p_ticket_id:selected.id,p_message:reply,p_status:replyStatus})
      if(rpcError) throw new Error(rpcError.message)
      setReply('');setMessage('Respuesta enviada.');await load();setSelectedId(String(selected.id))
    }catch(e:any){setError(e?.message||'No se pudo responder.')}finally{setBusy(false)}
  }

  const updateTicket=async(status:string,priority?:string)=>{
    if(!selected?.id)return
    setBusy(true);setError('');setMessage('')
    try{
      const {error:rpcError}=await supabase.rpc('ghc_admin_update_support_ticket',{p_ticket_id:selected.id,p_status:status,p_priority:priority||selected.priority||'normal'})
      if(rpcError) throw new Error(rpcError.message)
      setMessage('Ticket actualizado.');await load();setSelectedId(String(selected.id))
    }catch(e:any){setError(e?.message||'No se pudo actualizar.')}finally{setBusy(false)}
  }

  const activeCount=tickets.filter((t)=>['open','in_progress','waiting_user'].includes(t.status)).length
  const urgent=tickets.filter((t)=>t.priority==='urgent'&&t.status!=='closed').length

  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/ghc-control-center" className={styles.brand}><GHCLogo size="md" showText tagline={false}/></Link><div className={styles.actions}><Link href="/ghc-control-center">← Control Center</Link><Link href="/ghc-control-center/accesos">Pagos y accesos</Link></div></header>
    <section className={styles.hero}><p>Atención al alumno · GHC Academy</p><h1>Soporte</h1><span>Tickets reales con conversación, prioridad y trazabilidad.</span></section>
    {loading?<div className={styles.notice}>Cargando tickets…</div>:null}{message?<div className={styles.success}>{message}</div>:null}{error?<div className={styles.error}>{error}</div>:null}
    <section className={styles.stats}><article><small>Activos</small><strong>{activeCount}</strong></article><article><small>Urgentes</small><strong>{urgent}</strong></article><article><small>Totales</small><strong>{tickets.length}</strong></article><article><small>Resueltos</small><strong>{tickets.filter((t)=>t.status==='resolved'||t.status==='closed').length}</strong></article></section>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.filters}>{['open','resolved','closed','all'].map((value)=><button key={value} data-active={filter===value} onClick={()=>setFilter(value)}>{value==='open'?'Activos':value==='resolved'?'Resueltos':value==='closed'?'Cerrados':'Todos'}</button>)}</div>
        <div className={styles.ticketList}>{filtered.map((ticket)=><button key={ticket.id} className={String(ticket.id)===String(selected?.id)?styles.ticketActive:styles.ticket} onClick={()=>setSelectedId(String(ticket.id))}><div><strong>{ticket.name||ticket.email||'Alumno'}</strong><span data-priority={ticket.priority}>{ticket.priority}</span></div><p>{ticket.subject}</p><small>{STATUS[ticket.status]||ticket.status} · {new Date(ticket.last_message_at||ticket.created_at).toLocaleDateString('es-ES')}</small></button>)}{!filtered.length&&!loading?<p className={styles.empty}>No hay tickets en este filtro.</p>:null}</div>
      </aside>
      <section className={styles.main}>
        {selected?<article className={styles.thread}>
          <header className={styles.threadHead}><div><small>{selected.category} · {selected.email}</small><h2>{selected.subject}</h2></div><div className={styles.stateTools}><select value={selected.priority||'normal'} onChange={(event)=>updateTicket(selected.status,event.target.value)} disabled={busy}><option value="normal">Prioridad normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><select value={selected.status} onChange={(event)=>updateTicket(event.target.value)} disabled={busy}><option value="open">Abierto</option><option value="in_progress">En revisión</option><option value="waiting_user">Esperando alumno</option><option value="resolved">Resuelto</option><option value="closed">Cerrado</option></select></div></header>
          <div className={styles.messages}>{(selected.messages||[]).map((item:AnyRecord)=><div key={item.id} className={item.sender_role==='admin'?styles.adminMessage:styles.studentMessage}><small>{item.sender_role==='admin'?'GHC':'Alumno'}</small><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString('es-ES')}</time></div>)}</div>
          {selected.status!=='closed'?<form className={styles.replyForm} onSubmit={sendReply}><textarea value={reply} onChange={(event)=>setReply(event.target.value)} required maxLength={8000} placeholder="Responder al alumno…"/><select value={replyStatus} onChange={(event)=>setReplyStatus(event.target.value)}><option value="waiting_user">Responder y esperar alumno</option><option value="in_progress">Responder y mantener en revisión</option><option value="resolved">Responder y marcar resuelto</option></select><button disabled={busy||!reply.trim()}>{busy?'Enviando…':'Enviar respuesta'}</button></form>:<div className={styles.closed}>Ticket cerrado.</div>}
        </article>:<div className={styles.emptyPanel}><h2>Sin ticket seleccionado</h2><p>Cuando un alumno abra una consulta aparecerá aquí.</p></div>}
      </section>
    </div>
  </main>
}
