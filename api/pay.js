import {randomUUID} from 'node:crypto';
import {cakto,send,digits,validDoc,offerFor,priceFor} from '../lib/cakto.js';
export default async function handler(req,res){
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
