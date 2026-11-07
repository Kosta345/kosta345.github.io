import {send} from '../lib/cakto.js';
export default function handler(req,res){if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});return send(res,200,{cardClientId:process.env.CAKTO_CLIENT_ID||null,basicoReady:!!process.env.CAKTO_OFFER_ID_BASICO,completoReady:!!process.env.CAKTO_OFFER_ID_COMPLETO,cardEnabled:process.env.CAKTO_ENABLE_CARD==='true'});}
