import crypto, {randomUUID} from 'node:crypto';
const API='https://api.cakto.com.br/public_api';
let cache=null;
async function token(){
 if(cache && cache.until>Date.now()+60000)return cache.value;
 if(!process.env.CAKTO_CLIENT_ID||!process.env.CAKTO_CLIENT_SECRET)throw new Error('Credenciais Cakto ausentes no servidor.');
 const response=await fetch(`${API}/token/`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.CAKTO_CLIENT_ID,client_secret:process.env.CAKTO_CLIENT_SECRET})});
 if(!response.ok)throw new Error(`Autenticação Cakto indisponível (${response.status}).`);
 const data=await response.json();cache={value:data.access_token,until:Date.now()+(Number(data.expires_in)||1800)*1000};return cache.value;
}
async function cakto(path,opts={}){
 const access=await token();const r=await fetch(`${API}${path}`,{...opts,headers:{Authorization:`Bearer ${access}`,...opts.headers}});
 const body=await r.json().catch(()=>({}));return {ok:r.ok,status:r.status,body};
}
function send(res,status,obj){res.setHeader('Cache-Control','no-store');return res.status(status).json(obj)}
function digits(s){return String(s||'').replace(/\D/g,'')}
function validDoc(value){const d=digits(value);if(d.length===11){if(/^(\d)\1+$/.test(d))return false;for(let n=9;n<=10;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(d[i])*(n+1-i);let v=(sum*10)%11;if(v===10)v=0;if(v!==Number(d[n]))return false;}return true;}if(d.length===14){if(/^(\d)\1+$/.test(d))return false;for(const len of [12,13]){const w=len===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];let sum=0;for(let i=0;i<len;i++)sum+=Number(d[i])*w[i];const v=sum%11<2?0:11-sum%11;if(v!==Number(d[len]))return false;}return true;}return false;}
function offerFor(plan){return plan==='basico'?process.env.CAKTO_OFFER_ID_BASICO:plan==='completo'?process.env.CAKTO_OFFER_ID_COMPLETO:null}
function priceFor(plan){return plan==='basico'?27.9:plan==='completo'?37.9:null}

async function payHandler(req,res){
 if(req.method!=='POST')return send(res,405,{error:'Método não permitido'});
 try{
 const {plan,method,name,email,phone,document,fingerprint,cardToken,antifraudReference,idempotencyKey}=req.body||{};
 const offerId=offerFor(plan),expected=priceFor(plan);
 if(!offerId||!expected)return send(res,503,{error:'Esta oferta ainda não foi configurada no servidor.'});
 const doc=digits(document),tel=digits(phone);
 if(typeof name!=='string'||name.trim().length<3||name.length>255||typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!validDoc(doc)||!(tel.length===10||tel.length===11)||typeof fingerprint!=='string'||fingerprint.length<8||fingerprint.length>128)return send(res,400,{error:'Confira nome, e-mail, CPF/CNPJ e WhatsApp.'});
 if(!['pix','card'].includes(method))return send(res,400,{error:'Forma de pagamento inválida.'});
 if(typeof idempotencyKey!=='string'||!/^[a-f0-9-]{36}$/i.test(idempotencyKey))return send(res,400,{error:'Identificador da tentativa inválido.'});
 const payload={paymentMethod:method==='pix'?'pix':'credit_card',customer:{name:name.trim(),email:email.trim(),phone:`55${tel}`,fingerprint,docType:doc.length===11?'cpf':'cnpj',docNumber:doc},items:[{offerId,quantity:1,offerType:'main'}]};
 if(method==='card'){
  if(process.env.CAKTO_ENABLE_CARD!=='true')return send(res,503,{error:'Pagamento por cartão ainda não habilitado.'});
  if(typeof cardToken!=='string'||cardToken.length<8||typeof antifraudReference!=='string'||antifraudReference.length<8)return send(res,400,{error:'Tokenização e antifraude do cartão são obrigatórios.'});
  payload.card={token:cardToken};payload.installments=1;payload.antifraud_profiling_attempt_reference=antifraudReference;
 }
 const result=await cakto('/payments/',{method:'POST',headers:{'Content-Type':'application/json','X-Idempotency-Key':idempotencyKey},body:JSON.stringify(payload)});
 if(!result.ok){console.error('Cakto cobrança erro HTTP',result.status);return send(res,result.status===403?403:502,{error:result.status===403?'Chave Cakto sem permissão de pagamento.':'Não foi possível criar a cobrança. Confira a oferta e tente novamente.',code:result.status});}
 const p=result.body;
 if(p.offer?.id && p.offer.id!==offerId)return send(res,502,{error:'Oferta retornada não corresponde à configurada.'});
 if(!Number.isFinite(Number(p.amount))||Math.abs(Number(p.amount)-expected)>0.009)return send(res,502,{error:'Valor da oferta diverge do valor anunciado. Cobrança não deve ser utilizada; procure o suporte.',orderId:p.id});
 return send(res,200,{id:p.id,refId:p.refId,status:p.status,amount:p.amount,pix:method==='pix'?{qrCode:p.pix?.qrCode||null,expirationDate:p.pix?.expirationDate||null}:null});
 }catch(e){console.error('Erro no pagamento:',e.message);return send(res,502,{error:'Serviço de pagamento temporariamente indisponível.'})}
}

function configHandler(req,res){if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});return send(res,200,{cardClientId:process.env.CAKTO_CLIENT_ID||null,basicoReady:!!process.env.CAKTO_OFFER_ID_BASICO,completoReady:!!process.env.CAKTO_OFFER_ID_COMPLETO,cardEnabled:process.env.CAKTO_ENABLE_CARD==='true'});}

async function orderHandler(req,res){if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});const id=String(req.query?.id||'');if(!/^[a-f\d-]{36}$/i.test(id))return send(res,400,{error:'Pedido inválido'});try{const result=await cakto(`/orders/${encodeURIComponent(id)}/`);if(!result.ok)return send(res,502,{error:'Não foi possível consultar o pedido'});return send(res,200,{status:result.body.status,paid:result.body.status==='paid'});}catch(e){return send(res,502,{error:'Falha ao consultar pedido'})}}


async function webhookHandler(req,res){if(req.method!=='POST')return send(res,405,{error:'Método não permitido'});const secret=process.env.CAKTO_WEBHOOK_SECRET;if(!secret)return send(res,503,{error:'Webhook não configurado'});
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks);if(raw.length>1024*1024)return send(res,413,{error:'Payload muito grande'});
 const ts=String(req.headers['x-cakto-timestamp']||'');const sig=String(req.headers['x-cakto-signature']||'');if(!/^\d{10,}$/.test(ts)||Math.abs(Date.now()/1000-Number(ts))>300)return send(res,401,{error:'Assinatura inválida'});
 const expected='v1='+crypto.createHmac('sha256',secret).update(`${ts}.`).update(raw).digest('hex');const a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return send(res,401,{error:'Assinatura inválida'});
 let payload;try{payload=JSON.parse(raw.toString('utf8'))}catch{return send(res,400,{error:'JSON inválido'})}
 const records=Array.isArray(payload.data)?payload.data:[payload.data];for(const data of records){if(!data||typeof data!=='object')continue;if(payload.event==='purchase_approved'&&data.status==='paid')console.info('Pagamento aprovado, integração de entrega pendente:',{id:data.id,offer:data.offer?.id});}
 // ATENÇÃO: nenhum PDF é liberado aqui. Implementar persistência, deduplicação e entrega autenticada antes de ativar entrega automática.
 return send(res,200,{received:true});}


export const config = { api: { bodyParser: false } };
export default async function handler(req,res) {
 const path = (req.url || '').split('?')[0].replace(/\/$/, '');
 if (path === '/api/webhook') return webhookHandler(req,res);
 // With bodyParser disabled, manually parse JSON for payment requests.
 if (path === '/api/pay') {
  if (req.method === 'POST') {
   let raw = ''; for await (const chunk of req) { raw += chunk.toString('utf8'); if (raw.length > 16384) return send(res,413,{error:'Requisição muito grande'}); }
   try { req.body = JSON.parse(raw || '{}'); } catch { return send(res,400,{error:'JSON inválido'}); }
  }
  return payHandler(req,res);
 }
 if (path === '/api/config') return configHandler(req,res);
 if (path === '/api/order') {
  req.query = Object.fromEntries(new URL(req.url,'https://localhost').searchParams.entries());
  return orderHandler(req,res);
 }
 return send(res,404,{error:'Rota não encontrada'});
}
