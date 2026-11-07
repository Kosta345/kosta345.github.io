# Mapa Fácil — Upgrade Premium

Versão baseada no site com textos ajustados. Preserva todas as seções e a imagem original do produto.

## Como publicar

Extraia o ZIP e publique o conteúdo desta pasta no Netlify (ou abra `index.html` localmente). Para atualizar o site existente no Netlify, envie a pasta inteira novamente.

## Links de pagamento

Edite `script.js` e preencha `CHECKOUT_LINKS.basico` e `CHECKOUT_LINKS.completo` com os links reais. Sem eles, os botões de checkout avisam que falta configuração.

## Melhorias

- Produto com animação suave de flutuação, luz ambiente verde/azul e brilho periódico.
- Vitrine da imagem na seção de conteúdo com halo sutil.
- Botões com reflexo e interações.
- Cards e preços com estados de hover em dispositivos compatíveis.
- Respeito à configuração de movimento reduzido para acessibilidade.
- Mantida a tipografia da versão que você aprovou.

Não inclui métricas ou depoimentos inventados. Não garante resultados comerciais.

## Estrutura da etapa 1
A imagem `mapa-facil-produto.jpg` fica na raiz, ao lado do `index.html`.
As duas referências no HTML usam `src="mapa-facil-produto.jpg"`.

## Checkout personalizado (protótipo seguro)
A página `checkout.html` apresenta dados pessoais, Pix e cartão, com resumo dos planos. Os botões do site levam ao checkout local. **Ainda não processa pagamentos reais**: falta verificar os endpoints e a autorização da Cakto e conectar uma integração oficial no servidor. Não coloque `CAKTO_CLIENT_SECRET` em HTML/JS público. As variáveis cadastradas na Vercel só ficam acessíveis a código de servidor, não ao site estático. Para ativar pagamentos, configure checkout hospedado oficial ou funções serverless e webhooks com verificação de assinatura, conforme documentação da Cakto.
