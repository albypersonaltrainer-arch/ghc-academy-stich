'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './support.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>

const STATUS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En revisión',
  waiting_user: 'Esperando tu respuesta',
  resolved: 'Resuelto',
  closed: 'Cerrado'
}

export default function StudentSupportPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<AnyRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')

  const selected = useMemo(
    () => tickets.find((ticket) => String(ticket.id) === selectedId) || tickets[0] || null,
    [tickets, selectedId]
  )

  const loadTickets = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.replace('/acceso')
      return
    }
    const { data, error: rpcError } = await supabase.rpc('ghc_student_list_support_tickets')
    if (rpcError) throw new Error(rpcError.message)
    const next = Array.isArray(data) ? data : []
    setTickets(next)
    setSelectedId((current) => current || String(next[0]?.id || ''))
  }

  useEffect(() => {
    loadTickets()
      .catch((loadError) => setError(loadError?.message || 'No se pudo cargar soporte.'))
      .finally(() => setLoading(false))
  }, [])

  const createTicket = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('ghc_student_create_support_ticket', {
        p_subject: subject,
        p_category: category,
        p_message: message
      })
      if (rpcError) throw new Error(rpcError.message)
      setSubject('')
      setMessage('')
      await loadTickets()
      if (data?.id) setSelectedId(String(data.id))
    } catch (createError: any) {
      setError(createError?.message || 'No se pudo crear el ticket.')
    } finally {
      setBusy(false)
    }
  }

  const sendReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected?.id) return
    setBusy(true)
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('ghc_student_reply_support_ticket', {
        p_ticket_id: selected.id,
        p_message: reply
      })
      if (rpcError) throw new Error(rpcError.message)
      setReply('')
      await loadTickets()
      setSelectedId(String(selected.id))
    } catch (replyError: any) {
      setError(replyError?.message || 'No se pudo enviar la respuesta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/alumno" className={styles.brand}><GHCLogo size="md" showText tagline={false} /></Link>
        <Link href="/alumno" className={styles.back}>← Volver a mi área</Link>
      </header>

      <section className={styles.hero}>
        <p>Centro de ayuda · GHC Academy</p>
        <h1>Soporte</h1>
        <span>Consultas técnicas, contenido, acceso y pagos con historial asociado a tu cuenta.</span>
      </section>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sideHead}>
            <div><small>Tus consultas</small><strong>{tickets.length}</strong></div>
          </div>
          <div className={styles.ticketList}>
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className={String(ticket.id) === String(selected?.id) ? styles.ticketActive : styles.ticket}
                onClick={() => setSelectedId(String(ticket.id))}
              >
                <strong>{ticket.subject}</strong>
                <span>{STATUS[ticket.status] || ticket.status}</span>
                <small>{new Date(ticket.last_message_at || ticket.created_at).toLocaleDateString('es-ES')}</small>
              </button>
            ))}
            {!loading && !tickets.length ? <p className={styles.empty}>Todavía no has abierto ninguna consulta.</p> : null}
          </div>
        </aside>

        <section className={styles.main}>
          {selected ? (
            <article className={styles.thread}>
              <header className={styles.threadHead}>
                <div>
                  <small>{selected.category}</small>
                  <h2>{selected.subject}</h2>
                </div>
                <span data-status={selected.status}>{STATUS[selected.status] || selected.status}</span>
              </header>

              <div className={styles.messages}>
                {(selected.messages || []).map((item: AnyRecord) => (
                  <div key={item.id} className={item.sender_role === 'admin' ? styles.adminMessage : styles.studentMessage}>
                    <small>{item.sender_role === 'admin' ? 'Soporte GHC' : 'Tú'}</small>
                    <p>{item.body}</p>
                    <time>{new Date(item.created_at).toLocaleString('es-ES')}</time>
                  </div>
                ))}
              </div>

              {selected.status !== 'closed' ? (
                <form className={styles.replyForm} onSubmit={sendReply}>
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Escribe tu respuesta…" required maxLength={8000} />
                  <button type="submit" disabled={busy || !reply.trim()}>{busy ? 'Enviando…' : 'Enviar respuesta'}</button>
                </form>
              ) : <p className={styles.closed}>Este ticket está cerrado.</p>}
            </article>
          ) : (
            <article className={styles.welcome}>
              <h2>¿Necesitas ayuda?</h2>
              <p>Abre una consulta y quedará vinculada a tu cuenta para que puedas seguir la respuesta desde aquí.</p>
            </article>
          )}

          <article className={styles.newTicket}>
            <div><small>Nueva consulta</small><h2>Abrir ticket</h2></div>
            <form onSubmit={createTicket}>
              <label>Asunto<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={160} required placeholder="Describe brevemente el problema" /></label>
              <label>Categoría<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="general">General</option><option value="tecnico">Técnico</option><option value="contenido">Contenido</option><option value="acceso">Acceso</option><option value="pagos">Pagos</option></select></label>
              <label className={styles.full}>Mensaje<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={8000} required placeholder="Cuéntanos qué ha ocurrido y qué necesitas." /></label>
              <button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Abrir consulta'}</button>
            </form>
          </article>
        </section>
      </div>
    </main>
  )
}
