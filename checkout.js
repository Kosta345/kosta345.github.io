const params=new URLSearchParams(location.search);
const plan=params.get('plano')==='completo'?'completo':'basico';
const plans={basico:{title:'Mapa Fácil da Reforma Tributária',description:'Plano Básico • Material digital em PDF',price:'R$ 27,90'},completo:{title:'Mapa Fácil da Reforma Tributária + 8 bônus',description:'Plano Completo • Material digital e 8 bônus',price:'R$ 37,90'}};
const chosen=plans[plan];
for(const [id,value] of Object.entries({planTitle:chosen.title,planDesc:chosen.description,subtotal:chosen.price,total:chosen.price}))document.getElementById(id).textContent=value;
const form=document.getElementById('purchase'),feedback=document.getElementById('feedback'),button=form.querySelector('button[type=submit]'),pixResult=document.getElementById('pixResult'),cardFields=document.getElementById('cardFields');
const digits=s=>String(s||'').replace(/\D/g,'');
let config=null,sdk=null,attempt=null,attemptSignature=null,poll=null;
let fingerprint=sessionStorage.getItem('mapa_fp');if(!fingerprint){fingerprint=crypto.randomUUID();sessionStorage.setItem('mapa_fp',fingerprint)}
const methods=document.querySelectorAll('.method');
function setMethod(){const method=form.elements.method.value;methods.forEach(x=>x.classList.toggle('selected',x.querySelector('input').checked));cardFields.hidden=method!=='card';document.getElementById('paymentNote').textContent=method==='pix'?'O QR Code Pix será exibido aqui após gerar a cobrança.':'O cartão será tokenizado pelo SDK da Cakto antes do processamento.';attempt=null;attemptSignature=null;pixResult.hidden=true;if(poll)clearInterval(poll)}
methods.forEach(el=>el.addEventListener('change',setMethod));
fetch('/api/config').then(r=>r.json()).then(data=>{config=data;if(data.cardClientId&&window.Cakto?.CaktoSDK&&data.cardEnabled){sdk=new Cakto.CaktoSDK({client_id:data.cardClientId});sdk.initAntifraud().catch(()=>{});}if(!data.cardEnabled){const cardRadio=form.querySelector('input[value=card]');cardRadio.disabled=true;cardRadio.closest('.method').title='Cartão em configuração';cardRadio.closest('.method').style.opacity='.55';cardRadio.closest('.method').querySelector('small').textContent='Em configuração — disponível em breve';}}).catch(()=>{feedback.textContent='Não foi possível verificar o servidor de pagamentos. Tente novamente mais tarde.'});
function getAttempt(signature){if(signature!==attemptSignature){attempt=crypto.randomUUID();attemptSignature=signature}return attempt}
async function request(url,options){const r=await fetch(url,options);const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Não foi possível processar sua solicitação.');return data}
async function startStatus(id){const status=document.getElementById('pixStatus');async function check(){try{const order=await request(`/api/order?id=${encodeURIComponent(id)}`);if(order.paid){status.textContent='Pagamento aprovado! A entrega do PDF será disponibilizada após a configuração da entrega.';clearInterval(poll)}else status.textContent='Aguardando confirmação do Pix pelo banco...'}catch{status.textContent='Não foi possível consultar agora. Confira seu pedido mais tarde.'}}await check();poll=setInterval(check,10000)}
function luhn(number){let sum=0,alternate=false;for(let i=number.length-1;i>=0;i--){let n=Number(number[i]);if(alternate){n*=2;if(n>9)n-=9}sum+=n;alternate=!alternate}return sum%10===0}
form.addEventListener('submit',async e=>{
 e.preventDefault();feedback.textContent='';if(!form.reportValidity())return;
 const name=form.elements.name.value.trim(),email=form.elements.email.value.trim(),docDigits=digits(form.elements.document.value),phone=digits(form.elements.phone.value),method=form.elements.method.value;
 if(![11,14].includes(docDigits.length)||![10,11].includes(phone.length)){feedback.textContent='Confira o CPF/CNPJ e o WhatsApp com DDD.';return}
 if(!config||(plan==='basico'?!config.basicoReady:!config.completoReady)){feedback.textContent='Esta oferta ainda não foi configurada no servidor. Nenhuma cobrança foi realizada.';return}
 button.disabled=true;button.textContent='Processando...';
 try{
 const payload={plan,method,name,email,document:docDigits,phone,fingerprint};
 if(method==='card'){
  if(!sdk)throw new Error('O cartão ainda não está disponível. Selecione Pix.');
  const number=digits(document.getElementById('cardNumber').value),exp=document.getElementById('cardExpiry').value.trim().split('/');const cvv=digits(document.getElementById('cardCvv').value);
  if(number.length<13||!luhn(number)||exp.length!==2||!/^\d{1,2}$/.test(exp[0])||!/^\d{2,4}$/.test(exp[1])||Number(exp[0])<1||Number(exp[0])>12||cvv.length<3||cvv.length>4)throw new Error('Confira os dados do cartão.');
  await sdk.completeAntifraudProfile();const antifraudReference=sdk.getAntifraudReference();const result=await sdk.createToken({holderName:document.getElementById('holderName').value.trim(),cardNumber:number,cvv,expMonth:exp[0].padStart(2,'0'),expYear:exp[1]});
  payload.cardToken=result.cardToken;payload.antifraudReference=antifraudReference;
 }
 const signature=JSON.stringify({plan,method,name,email,document:docDigits,phone});payload.idempotencyKey=getAttempt(signature);
 const result=await request('/api/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(method==='pix'){
  if(!result.pix?.qrCode)throw new Error('A Cakto não retornou um código Pix. Confira o pedido no painel.');
  pixResult.hidden=false;document.getElementById('pixCode').value=result.pix.qrCode;
  if(window.QRCode?.toDataURL)document.getElementById('pixQr').src=await QRCode.toDataURL(result.pix.qrCode,{width:240,margin:2});else document.getElementById('pixQr').hidden=true;
  document.getElementById('paymentNote').textContent=`Pedido ${result.refId||''} · Valor: R$ ${Number(result.amount).toFixed(2).replace('.',',')}`;
  await startStatus(result.id);
 }else{
  feedback.textContent=result.status==='paid'?'Pagamento aprovado! Aguarde a disponibilização do material.':`Situação do cartão: ${result.status||'em análise'}.`;
  document.getElementById('cardNumber').value='';document.getElementById('cardCvv').value='';
 }
 }catch(err){feedback.textContent=err.message||'Falha no pagamento.'}finally{button.disabled=false;button.textContent='Continuar para pagamento →'}
});
document.getElementById('copyPix').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(document.getElementById('pixCode').value);document.getElementById('copyPix').textContent='Copiado!'}catch{document.getElementById('pixCode').select();document.execCommand('copy')}});
