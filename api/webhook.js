import crypto from 'node:crypto';
import {send} from '../lib/cakto.js';
export const config={api:{bodyParser:false}};
export default async function handler(req,res){if(req.method!=='POST')return send(res,405,{error:'Método não permitido'});const secret=process.env.CAKTO_WEBHOOK_SECRET;if(!secret)return send(res,503,{error:'Webhook não configurado'});
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks);if(raw.length>1024*1024)return send(res,413,{error:'Payload muito grande'});
 const ts=String(req.headers['x-cakto-timestamp']||'');const sig=String(req.headers['x-cakto-signature']||'');if(!/^\d{10,}$/.test(ts)||Math.abs(Date.now()/1000-Number(ts))>300)return send(res,401,{error:'Assinatura inválida'});
 const expected='v1='+crypto.createHmac('sha256',secret).update(`${ts}.`).update(raw).digest('hex');const a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return send(res,401,{error:'Assinatura inválida'});
 let payload;try{payload=JSON.parse(raw.toString('utf8'))}catch{return send(res,400,{error:'JSON inválido'})}
 const records=Array.isArray(payload.data)?payload.data:[payload.data];for(const data of records){if(!data||typeof data!=='object')continue;if(payload.event==='purchase_approved'&&data.status==='paid')console.info('Pagamento aprovado, integração de entrega pendente:',{id:data.id,offer:data.offer?.id});}
 // ATENÇÃO: nenhum PDF é liberado aqui. Implementar persistência, deduplicação e entrega autenticada antes de ativar entrega automática.
 return send(res,200,{received:true});}
