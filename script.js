// Insira seus links reais de checkout abaixo. Sem links configurados, os botões levam à seção de planos.
const CHECKOUT_LINKS = { basico: 'checkout.html?plano=basico', completo: 'checkout.html?plano=completo' };
window.addEventListener('DOMContentLoaded', () => {
  if(window.lucide) lucide.createIcons();
  const nodes = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);} }); }, {threshold:.08,rootMargin:'0px 0px -20px 0px'});
    nodes.forEach(n=>observer.observe(n));
  } else nodes.forEach(n=>n.classList.add('visible'));
  document.querySelectorAll('.checkout').forEach(link => {
    const url = CHECKOUT_LINKS[link.dataset.plan];
    if(url){link.href=url;link.rel='noopener noreferrer';}
    else link.addEventListener('click',e=>{e.preventDefault();alert('Configure o link de checkout deste plano no arquivo script.js.');});
  });
});