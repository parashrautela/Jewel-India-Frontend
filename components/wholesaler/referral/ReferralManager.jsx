'use client';
import { useState,useRef,useEffect,useCallback } from 'react';
import Link from 'next/link';
import { useCredits } from '../../../context/CreditsContext';
import styles from './referralManager.module.css';
const asset = name => `/invitations/${name}`;
async function responseData(res) {
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw new Error(data?.error || ([404,405].includes(res.status)?'The invitation service hasn’t been updated yet. Please try again after the service update.':'Could not load invitations. Please try again.'));
 if(!data)throw new Error('The invitation service returned an invalid response. Please try again.');
 return data;
}
async function request(method='GET',body,page=0) {
 const res=await fetch(`/api/referral/manage?page=${page}`,{method,cache:'no-store',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 return responseData(res);
}
export default function ReferralManager({home=false,accountId=''}) {
 const dialog=useRef(null);
 const {refresh}=useCredits();
 const [settings,setSettings]=useState(null);
 const [guide,setGuide]=useState(true);
 const [skip,setSkip]=useState(true);
 const [gift,setGift]=useState(1000);
 const [ready,setReady]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const [page,setPage]=useState(0);
 const pending=useRef(null);
 const storageKey=`jewel.invitation.intent.${accountId}`;
 const guideKey=`jewel.invitation.guide.${accountId}`;
 const load=useCallback(async(nextPage=0,initial=false)=>{
  setBusy(true);setError('');
  try {
   const data=await request('GET',null,nextPage);setSettings(data);setPage(nextPage);
   setReady(current=>current?(data.links.find(link=>link.id===current.id)||current):null);
   if(initial) {
    setGuide(!data.skip_guide);
    try {localStorage.setItem(guideKey,JSON.stringify(data.skip_guide));}catch{}
    try {pending.current=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{pending.current=null;}
    if(pending.current) {
     setGift(pending.current.gift_credits);
     const recovered=data.links.find(l=>l.generation_key===pending.current.idempotency_key);
     if(recovered){setReady(recovered);pending.current=null;sessionStorage.removeItem(storageKey);setGuide(false);}
    }
   }
  }catch(err){setError(err.message);}finally{setBusy(false);}
 },[storageKey,guideKey]);
 async function open() {
  let skipped=false;try {skipped=JSON.parse(localStorage.getItem(guideKey)||'false')===true;}catch{}
  setGuide(!skipped);setSkip(true);setSettings(null);
  dialog.current.showModal();await load(0,true);
 }
 async function continueGuide() {
  setBusy(true);setError('');
  try {
   const loaded=settings || await request();
   const data=await request('POST',{skip_guide:skip});setSettings({...loaded,...data});
   try {localStorage.setItem(guideKey,JSON.stringify(skip));}catch{}
   setGuide(false);
  }
  catch(err){setError(err.message);}finally{setBusy(false);}
 }
 async function generate() {
  setBusy(true);setError('');
  if(!pending.current) {
   pending.current={gift_credits:gift,idempotency_key:crypto.randomUUID(),source:'web'};
   sessionStorage.setItem(storageKey,JSON.stringify(pending.current));
  }
  try {
   const res=await fetch('/api/referral/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current)});
   const data=await res.json().catch(()=>null);if(!res.ok){if([400,403,409].includes(res.status)&&data?.code!=='IDEMPOTENCY_CONFLICT'){pending.current=null;sessionStorage.removeItem(storageKey);}throw new Error(data?.error || ([404,405].includes(res.status)?'The invitation service hasn’t been updated yet. Please try again after the service update.':'Could not generate invitation. Retry to recover your link.'));}
   if(!data)throw new Error('The invitation service returned an invalid response. Retry to recover your link.');
   setReady(data);pending.current=null;sessionStorage.removeItem(storageKey);setCopied(false);
   await refresh();await load();
  }catch(err){setError(err.message);}finally{setBusy(false);}
 }
 async function copy(link) {
  try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setError('Copy unavailable. Select the link below or use Share.');}
 }
 async function share(link) {
  if(navigator.share){try{await navigator.share({title:'Join Jewel India',url:link});}catch(err){if(err.name!=='AbortError')setError('Sharing unavailable. Copy the invitation link.');}}
  else window.open(`https://wa.me/?text=${encodeURIComponent(`Join Jewel India using my invitation: ${link}`)}`,'_blank','noopener,noreferrer');
 }
 async function cancel(id) {
  setBusy(true);setError('');
  try{await request('DELETE',{id});if(ready?.id===id)setReady(null);await refresh();await load(page);}catch(err){setError(err.message);}finally{setBusy(false);}
 }
 useEffect(()=>{if(!home)void load(0,true);},[home,load]); // account changes reload the server preference
 const content=<>
  {guide?<div className={styles.guide}>
   <h2>How it works</h2>
   <div className={styles.steps}>
    {[['link.png','1. Share the link','Send a unique invitation to a retailer.'],['signup.png','2. Signup','They use your code and complete onboarding.'],['store.png','3. Admin verification','They get your gift. You earn 1,000 credits once approved.']].map(([icon,title,body])=><div className={styles.step} key={icon}><img src={asset(icon)} alt="" width="60" height="60"/><div><h3>{title}</h3><p>{body}</p></div></div>)}
   </div>
   <label className={styles.checkbox}><input type="checkbox" checked={skip} onChange={e=>setSkip(e.target.checked)}/><span aria-hidden="true">{skip?<img src={asset('checked.svg')} alt=""/>:null}</span>Don’t show me again</label>
   <button className={styles.primary} disabled={busy} onClick={continueGuide}>{busy?'Saving…':'Invite a retailer'}</button>
  </div>:busy&&!settings?<p role="status">Loading invitations…</p>:!settings?<button onClick={()=>load(0,true)}>Load invitations</button>:<div className={styles.giftForm}>
   <div className={styles.reward}><img className={styles.necklace} src={asset('necklace.png')} alt=""/><div className={styles.rewardCopy}><span>Earn 1,000 credits</span><h2>Grow your network.<br/>Get rewarded.</h2><p>For each retailer approved by Jewel India</p></div></div>
   {ready?<div className={styles.ready}>
    <h3>Your invitation is ready</h3><strong>{ready.code}</strong><p>Gift: {ready.gift_credits.toLocaleString()} credits · Extra reserved: {ready.extra_credits.toLocaleString()}</p><p>One retailer · {ready.status==='unclaimed'?'Valid for 7 days from creation':ready.status}</p>
    <input aria-label="Invitation link" readOnly value={ready.link} onFocus={e=>e.target.select()}/>
    <button className={styles.primary} disabled={ready.status!=='unclaimed'} onClick={()=>copy(ready.link)}>{copied?'Copied!':'Copy invitation link'}<img src={asset('copy.svg')} alt=""/></button>
    <button className={styles.secondary} disabled={ready.status!=='unclaimed'} onClick={()=>share(ready.link)}>Share invitation</button>
    <button className={styles.textButton} disabled={busy} onClick={()=>{setReady(null);setCopied(false);}}>Create another invitation</button>
   </div>:<>
    <h3>Help a retailer discover a better way to do jewellery business.</h3>
    <div className={styles.stepper}><button aria-label="Reduce gift" disabled={busy||!!pending.current||gift<=settings.minimum} onClick={()=>setGift(gift-settings.step)}><img src={asset('minus.svg')} alt=""/></button><img src={asset('step-divider.svg')} alt=""/><output aria-label="Retailer gift credits">{gift.toLocaleString()}</output><img src={asset('step-divider.svg')} alt=""/><button aria-label="Increase gift" disabled={busy||!!pending.current||gift>=settings.maximum} onClick={()=>setGift(gift+settings.step)}><img src={asset('plus.svg')} alt=""/></button></div>
    <p className={styles.terms}>1,000 free · Reserve {gift-1000} now<br/>Available: {settings.available.toLocaleString()} daily + bonus credits{gift>1000&&<><br/>Cancel unused links to reclaim credits that haven’t expired.</>}</p>
    {!settings.enabled&&<p className={styles.terms}>Reward invitations will open soon.</p>}
    <button className={styles.primary} disabled={busy||!settings.enabled||(!pending.current&&gift-1000>settings.available)} onClick={generate}>{busy?'Creating…':pending.current?'Retry invitation':'Generate invitation link'}<img src={asset('copy.svg')} alt=""/></button>
    {!!pending.current&&<p className={styles.terms}>Retry uses the same request, so you won’t be charged twice.</p>}
   </>}
  </div>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {!settings&&!busy&&error&&<button className={styles.textButton} onClick={()=>load(0,true)}>Retry invitation service</button>}
  {settings&&<footer className={styles.footer}><button onClick={()=>setGuide(true)}>How it works</button><Link href="/dashboard/wholesaler/add-retailer">Your invitations</Link></footer>}
 </>;
 const history=settings&&!home?<section className={styles.history}><h2>Your invitations</h2>{!settings.links.length&&<p>No invitations yet.</p>}{settings.links.map(l=><article key={l.id}><div><strong>{l.retailer_name||l.code}</strong><p>{l.status} · {new Date(l.created_at).toLocaleDateString('en-IN')}</p><p>{l.policy_version===1?`Gift: ${l.gift_credits} · Extra reserved: ${l.extra_credits}`:'Original invitation terms'}</p>{l.funding_state==='released'&&<p>Returned: {l.refunded_credits ?? 0} unexpired credits</p>}</div>{l.status==='unclaimed'&&<div><button onClick={()=>share(l.link)}>Share</button>{l.policy_version===1&&<button disabled={busy} onClick={()=>cancel(l.id)}>Cancel</button>}</div>}</article>)}<nav className={styles.footer}><button disabled={busy||page===0} onClick={()=>load(page-1)}>Previous</button><span>{page+1}</span><button disabled={busy||(page+1)*20>=settings.count} onClick={()=>load(page+1)}>Next</button></nav></section>:null;
 return <>
  {home?<button className={styles.homeCard} onClick={open}><img className={styles.cardArt} src={asset('card-art.png')} alt=""/><img src={asset('user-plus.svg')} alt=""/><span><strong>Invite retailers</strong><small>Invite Retailer to join your network on JewelIndia</small></span></button>:<div className={styles.page}><div className={styles.panel}>{content}</div>{history}</div>}
  {home&&<dialog ref={dialog} className={styles.dialog}><button className={styles.close} aria-label="Close invitation" onClick={()=>dialog.current.close()}>×</button>{content}</dialog>}
 </>;
}
