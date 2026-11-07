const API='https://api.cakto.com.br/public_api';
let cache=null;
export async function token(){
 if(cache && cache.until>Date.now()+60000)return cache.value;
 if(!process.env.CAKTO_CLIENT_ID||!process.env.CAKTO_CLIENT_SECRET)throw new Error('Credenciais Cakto ausentes no servidor.');
 const response=await fetch(`${API}/token/`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.CAKTO_CLIENT_ID,client_secret:process.env.CAKTO_CLIENT_SECRET})});
 if(!response.ok)throw new Error(`Autenticação Cakto indisponível (${response.status}).`);
 const data=await response.json();cache={value:data.access_token,until:Date.now()+(Number(data.expires_in)||1800)*1000};return cache.value;
}
export async function cakto(path,opts={}){
 const access=await token();const r=await fetch(`${API}${path}`,{...opts,headers:{Authorization:`Bearer ${access}`,...opts.headers}});
 const body=await r.json().catch(()=>({}));return {ok:r.ok,status:r.status,body};
}
export function send(res,status,obj){res.setHeader('Cache-Control','no-store');return res.status(status).json(obj)}
export function digits(s){return String(s||'').replace(/\D/g,'')}
export function validDoc(value){const d=digits(value);if(d.length===11){if(/^(\d)\1+$/.test(d))return false;for(let n=9;n<=10;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(d[i])*(n+1-i);let v=(sum*10)%11;if(v===10)v=0;if(v!==Number(d[n]))return false;}return true;}if(d.length===14){if(/^(\d)\1+$/.test(d))return false;for(const len of [12,13]){const w=len===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];let sum=0;for(let i=0;i<len;i++)sum+=Number(d[i])*w[i];const v=sum%11<2?0:11-sum%11;if(v!==Number(d[len]))return false;}return true;}return false;}
export function offerFor(plan){return plan==='basico'?process.env.CAKTO_OFFER_ID_BASICO:plan==='completo'?process.env.CAKTO_OFFER_ID_COMPLETO:null}
export function priceFor(plan){return plan==='basico'?27.9:plan==='completo'?37.9:null}
