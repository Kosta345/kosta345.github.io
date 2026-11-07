# Mapa Fácil — integração Cakto (etapa técnica)

Esta versão mantém a página de vendas e o checkout personalizado. Inclui rotas serverless da Vercel para criar cobrança Pix e cartão, consultar pedido e validar a assinatura de webhooks.

## Antes de ativar cobranças

1. Na Cakto, abra **Produtos > sua oferta de R$ 27,90** e copie o **ID/short_id da oferta**. O endereço `https://pay.cakto.com.br/3eidzea_1292287` identifica um checkout, mas NÃO confirma por si só qual é o `offerId` aceito pela API. Não invente nem copie o sufixo do URL como se fosse o ID da oferta.
2. Na Vercel > Settings > Environment Variables, configure em **Production**:
   - `CAKTO_CLIENT_ID` (já cadastrada)
   - `CAKTO_CLIENT_SECRET` (já cadastrada)
   - `CAKTO_OFFER_ID_BASICO` = ID da oferta de R$ 27,90 (a confirmar)
   - `CAKTO_WEBHOOK_SECRET` = segredo do webhook criado na Cakto (a configurar)
   - `CAKTO_ENABLE_CARD` = `true` **somente depois de testar o SDK e o antifraude**. Sem isso o cartão fica desabilitado de propósito.
   - `CAKTO_OFFER_ID_COMPLETO` = ID da oferta de R$ 37,90, **somente se existir e estiver ativa**. Até lá o plano completo não cobra.
3. Crie um webhook na Cakto para `https://SEU-DOMINIO.vercel.app/api/webhook`, evento `purchase_approved`, e use o segredo gerado na variável acima. A assinatura HMAC e o timestamp são validados no servidor.
4. Faça um **novo deploy** após cadastrar as variáveis. Teste primeiro com a sua própria compra e confira o valor, QR Code, pedido, status e recebimento do webhook.
5. **A entrega automática do PDF ainda não está implementada.** O webhook apenas valida e registra o ID do pedido no log. Não coloque o PDF pago na pasta pública; para entrega segura será necessário armazenamento privado + banco de dados + deduplicação de eventos + envio autenticado por e-mail ou link temporário. O checkout avisa que a entrega depende da configuração.

## Observações importantes

- Pix usa `POST /public_api/payments/`, OAuth2 e `X-Idempotency-Key`. QR Code gerado no navegador a partir do BR Code devolvido pela Cakto.
- Cartão usa SDK oficial para tokenização no navegador, antifraude e `cardToken` no backend; **não** armazene nem registre número ou CVV no servidor. Para produção, considere fluxo 3DS e testes de risco/chargeback.
- O preço é conferido **no backend** contra R$ 27,90 para básico e R$ 37,90 para completo. A oferta precisa ter o valor correto na Cakto.
- O endpoint de consulta de pedido usa ID não previsível; em produção, associe a consulta a uma sessão de compra para impedir acesso não autorizado a estados de pedidos.
- O checkout hospedado Cakto não é usado para redirecionar o cliente.
- Se a conta Cakto ainda estiver em validação cadastral, cobranças diretas podem ser bloqueadas.

Documentação: https://docs.cakto.com.br/authentication.md · https://docs.cakto.com.br/api-reference/payments/create-pix.md · https://docs.cakto.com.br/api-reference/payments/create-card.md · https://docs.cakto.com.br/conceitos/webhooks.md


## Versão para GitHub mobile — tudo na raiz
Envie todos os arquivos diretamente na raiz do repositório. O backend está concentrado em `backend.js`; `vercel.json` faz as rotas `/api/*` apontarem para ele. Esta versão usa o sistema de builds legados da Vercel (`@vercel/node` + `@vercel/static`). Não envie as pastas antigas `api/` ou `lib/`.

Ainda é necessário configurar `CAKTO_OFFER_ID_BASICO` com o ID da oferta (não apenas URL), `CAKTO_WEBHOOK_SECRET` para notificações e testar o deploy antes de vender. O webhook ainda não entrega o PDF automaticamente.
