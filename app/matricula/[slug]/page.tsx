'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './checkout.module.css'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
type AnyRecord = Record<string, any>

const COUNTRIES = [
  ['ES','España'],['PT','Portugal'],['FR','Francia'],['DE','Alemania'],['IT','Italia'],['IE','Irlanda'],['NL','Países Bajos'],['BE','Bélgica'],['LU','Luxemburgo'],['AT','Austria'],['DK','Dinamarca'],['SE','Suecia'],['FI','Finlandia'],['PL','Polonia'],['CZ','Chequia'],['SK','Eslovaquia'],['SI','Eslovenia'],['HR','Croacia'],['GR','Grecia'],['CY','Chipre'],['MT','Malta'],['HU','Hungría'],['RO','Rumanía'],['BG','Bulgaria'],['EE','Estonia'],['LV','Letonia'],['LT','Lituania'],['IS','Islandia'],['LI','Liechtenstein'],['NO','Noruega'],['GB','Reino Unido'],
  ['AR','Argentina'],['BO','Bolivia'],['BR','Brasil'],['CL','Chile'],['CO','Colombia'],['CR','Costa Rica'],['CU','Cuba'],['DO','República Dominicana'],['EC','Ecuador'],['SV','El Salvador'],['GT','Guatemala'],['HN','Honduras'],['MX','México'],['NI','Nicaragua'],['PA','Panamá'],['PY','Paraguay'],['PE','Perú'],['PR','Puerto Rico'],['UY','Uruguay'],['VE','Venezuela'],
  ['US','Estados Unidos'],['CA','Canadá'],['AU','Australia'],['NZ','Nueva Zelanda'],['CH','Suiza'],['AE','Emiratos Árabes Unidos'],['SG','Singapur'],['JP','Japón'],['KR','Corea del Sur'],['ZA','Sudáfrica'],['GH','Ghana'],['ZZ','Otro país / territorio']
] as const

function routeParam(value: unknown) { return Array.isArray(value) ? String(value[0] || '') : String(value || '') }
function money(cents: unknown, currency = 'EUR') { return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(Number(cents || 0) / 100) }

export default function AcademyCheckoutPage() {
  const params = useParams(); const slug = routeParam(params?.slug)
  const [options,setOptions]=useState<AnyRecord|null>(null); const [user,setUser]=useState<any>(null)
  const [selectedCount,setSelectedCount]=useState(1); const [countryCode,setCountryCode]=useState('ES')
  const [terms,setTerms]=useState(false); const [privacy,setPrivacy]=useState(false); const [startNow,setStartNow]=useState(true); const [lossAck,setLossAck]=useState(false)
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [prepared,setPrepared]=useState<AnyRecord|null>(null)

  const load=useCallback(async()=>{ if(!slug)return; const [{data,error:optionsError},{data:userData}]=await Promise.all([supabase.rpc('ghc_public_get_course_payment_options',{p_course_slug:slug}),supabase.auth.getUser()]); if(optionsError)throw new Error(optionsError.message); setOptions(data||null); setUser(userData?.user||null) },[slug])
  useEffect(()=>{load().catch((e)=>setError(e?.message||'No se pudo preparar la matrícula.'))},[load])
  const plans=useMemo(()=>Array.isArray(options?.plans)?options.plans:[],[options]); const selectedPlan=plans.find((p:AnyRecord)=>Number(p.installment_count)===selectedCount)||plans[0]
  const deliveryType=String(options?.delivery_type||'digital_content'); const digitalImmediate=startNow&&['digital_content','hybrid'].includes(deliveryType)
  useEffect(()=>{if(plans.length&&!plans.some((p:AnyRecord)=>Number(p.installment_count)===selectedCount))setSelectedCount(Number(plans[0]?.installment_count||1))},[plans,selectedCount])

  const prepareOrder=async()=>{
    if(!options?.course_id||!selectedPlan)return
    if(!user){setError('Inicia sesión antes de preparar tu matrícula.');return}
    if(!countryCode){setError('Selecciona tu país de residencia.');return}
    if(!terms||!privacy){setError('Debes aceptar las condiciones de contratación y la política de privacidad.');return}
    if(digitalImmediate&&!lossAck){setError('Para comenzar ahora debes confirmar el reconocimiento relativo al desistimiento del contenido digital.');return}
    setBusy(true);setError('')
    try{
      const {data,error:rpcError}=await supabase.rpc('ghc_student_prepare_academy_order',{
        p_course_id:options.course_id,p_installment_count:selectedCount,p_start_now:startNow,p_withdrawal_loss_ack:digitalImmediate?lossAck:false,
        p_country_code:countryCode,p_customer_type:'consumer',p_terms_accepted:terms,p_privacy_accepted:privacy,p_terms_version:options.legal_version,p_privacy_version:options.legal_version
      })
      if(rpcError)throw new Error(rpcError.message);setPrepared(data||{})
    }catch(e:any){setError(e?.message||'No se pudo preparar la matrícula.')}finally{setBusy(false)}
  }

  if(options&&options.available===false)return <main className={styles.page}><section className={styles.stateCard}><GHCLogo size="md" showText tagline={false}/><h1>Esta matrícula no está disponible</h1><p>El curso no está publicado para nuevas matrículas.</p><Link href="/">Volver</Link></section></main>

  return <main className={styles.page}>
    <header className={styles.topbar}><GHCLogo size="md" showText tagline={false}/><Link href={slug?`/cursos/${slug}`:'/'}>Volver al curso</Link></header>
    <div className={styles.shell}>
      <section className={styles.hero}><p>GHC Academy · matrícula</p><h1>{options?.course_title||'Preparando tu matrícula'}</h1><span>Elige la modalidad por su importe final. El fraccionamiento interno disponible actualmente no añade coste financiero.</span></section>
      {error?<div className={styles.error}>{error}</div>:null}
      {prepared?<section className={styles.successCard}>
        <span className={styles.successPill}>Pedido preparado</span><h2>{prepared.order_reference}</h2>
        <p>Tu elección, país declarado, importes, cuotas y consentimientos han quedado registrados. El proveedor de pago todavía no está conectado, por lo que <strong>no se ha realizado ningún cobro</strong>.</p>
        <div className={styles.summaryGrid}><div><small>Total</small><strong>{money(prepared.total_cents,options?.currency)}</strong></div><div><small>Modalidad</small><strong>{prepared.installment_count} pago{Number(prepared.installment_count)===1?'':'s'}</strong></div><div><small>País / régimen</small><strong>{prepared.country_code} · {prepared.legal_regime_code}</strong></div></div>
        <p className={styles.legalNote}>{prepared.start_now?'Has solicitado comenzar al confirmarse el primer pago. La consecuencia sobre el desistimiento se aplicará únicamente en la medida permitida por la ley territorial registrada.':'El acceso se programará según el periodo de desistimiento/retracto aplicable registrado para tu pedido.'}</p>
        <Link className={styles.primaryLink} href="/alumno/pagos">Ver mis pagos y avisos</Link>
      </section>:<div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><small>1. Residencia y modalidad</small><h2>¿Dónde resides y cómo quieres pagar?</h2></div><strong>{money(options?.base_price_cents,options?.currency)}</strong></div>
          <label style={{display:'grid',gap:8,marginBottom:18}}><strong>País de residencia habitual</strong><select value={countryCode} onChange={(e)=>setCountryCode(e.target.value)} style={{minHeight:46,borderRadius:10,padding:'0 12px'}}>{COUNTRIES.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select><small>Se guarda con el pedido para aplicar el régimen territorial y los derechos imperativos que correspondan. Si eliges «Otro país», las solicitudes dudosas no se denegarán automáticamente.</small></label>
          <div className={styles.plans}>{plans.map((plan:AnyRecord)=>{const count=Number(plan.installment_count||1);const amounts=Array.isArray(plan.installment_amounts_cents)?plan.installment_amounts_cents:[];const selected=count===selectedCount;return <button key={count} type="button" onClick={()=>setSelectedCount(count)} className={selected?styles.planSelected:styles.plan}><div><strong>{count===1?'Pago único':`${count} pagos`}</strong><span>{count===1?money(plan.total_cents,options?.currency):amounts.map((a:number)=>money(a,options?.currency)).join(' + ')}</span></div><em>Total {money(plan.total_cents,options?.currency)}</em></button>})}</div>
          {selectedPlan?<div className={styles.installmentInfo}><strong>Importe final: {money(selectedPlan.total_cents,options?.currency)}</strong>{Number(selectedPlan.installment_count)>1?<span>Cuotas cada {Number(selectedPlan.interval_days||30)} días.</span>:<span>Un único pago.</span>}<span>Coste financiero del fraccionamiento interno: 0 €.</span></div>:null}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><small>2. Acceso</small><h2>¿Cuándo quieres empezar?</h2></div></div>
          <label className={styles.checkRow}><input type="checkbox" checked={startNow} onChange={(e)=>{setStartNow(e.target.checked);if(!e.target.checked)setLossAck(false)}}/><span><strong>Quiero comenzar ahora.</strong> Solicito que el contenido o servicio correspondiente empiece cuando se confirme mi primer pago.</span></label>
          {!startNow?<div className={styles.infoBox}>El pago podrá formalizarse normalmente, pero el acceso se programará conforme al periodo de desistimiento/retracto que corresponda al país registrado.</div>:null}
          {digitalImmediate?<label className={styles.checkRow}><input type="checkbox" checked={lossAck} onChange={(e)=>setLossAck(e.target.checked)}/><span>Entiendo que el inicio inmediato puede producir la pérdida del derecho de desistimiento ordinario <strong>solo cuando la legislación aplicable lo permita</strong>. Si mi legislación reconoce un derecho irrenunciable o diferente, ese derecho permanece.</span></label>:null}
          <p className={styles.legalNote}>La política base GHC es de 14 días y nunca elimina derechos imperativos por falta de conformidad, cobros indebidos, incumplimiento u otras causas legalmente protegidas. <Link href="/legal#desistimiento">Ver desistimiento y venta internacional</Link>.</p>
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><small>3. Confirmación</small><h2>Condiciones</h2></div></div>
          <label className={styles.checkRow}><input type="checkbox" checked={terms} onChange={(e)=>setTerms(e.target.checked)}/><span>Acepto las <Link href="/legal#contratacion">condiciones de contratación</Link>, la modalidad de pago elegida y las reglas territoriales aplicables.</span></label>
          <label className={styles.checkRow}><input type="checkbox" checked={privacy} onChange={(e)=>setPrivacy(e.target.checked)}/><span>He leído y acepto la <Link href="/legal#privacidad">política de privacidad</Link> para gestionar mi matrícula.</span></label>
          {!user?<div className={styles.loginBox}><strong>Necesitas iniciar sesión para continuar.</strong><p>Las opciones de precio son públicas, pero el pedido y los consentimientos deben quedar ligados a tu cuenta.</p><Link className={styles.primaryLink} href="/acceso">Iniciar sesión</Link></div>:<button className={styles.primaryButton} type="button" disabled={busy||!selectedPlan} onClick={prepareOrder}>{busy?'Registrando…':'Preparar matrícula'}</button>}
          <p className={styles.providerNote}>Fase actual: preparación y reglas listas. SumUp y Stripe se conectarán y probarán más adelante. Este botón no cobra.</p>
        </section>
      </div>}
    </div>
  </main>
}
