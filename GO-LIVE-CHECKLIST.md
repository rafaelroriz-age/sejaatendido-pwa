# Go-live Checklist — SejaAtendido PWA

Data: 2026-06-08
Objetivo: liberar produção com segurança para iniciar faturamento.

## 1) Itens que BLOQUEIAM lançamento

- [ ] Produção sem mock
  - Critério: `VITE_MOCK` não pode estar `true` em produção.
  - Risco: app consumir dados mockados e mascarar falhas reais.

- [ ] Backend de produção configurado em HTTPS
  - Critério: `VITE_API_URL` apontando para backend oficial de produção (https).
  - Risco: falhas de autenticação/API e risco de ambiente incorreto.

- [ ] Fluxo de receita validado ponta a ponta em produção
  - Critério: Paciente real consegue: login -> listar médico aprovado -> agendar -> gerar PIX/cartão -> concluir pagamento -> retornar status correto.
  - Risco: você não fatura mesmo com app no ar.

- [ ] PIX aderente ao contrato atual
  - Critério: UI usa `pix.qrCode`, `pix.qrCodeBase64`, `pix.ticketUrl`, `pix.validade`.
  - Risco: QR em branco / pagamento não concluído.

- [ ] Polling de pagamento confirmando status final correto
  - Critério: considerar pago quando `pagamento.status === "PAGO"`.
  - Risco: pagamento aprovado no backend sem confirmação no frontend.

- [ ] Login social Google validado em produção
  - Critério: botão Google autentica via endpoint ativo de produção sem erro 404.
  - **Pendência**: configurar `VITE_GOOGLE_CLIENT_ID` nas variáveis de ambiente de produção e validar OAuth Client ID no Google Cloud Console.
  - Risco: queda de conversão e suporte manual.

- [ ] Médicos aprovados visíveis para agendamento
  - Critério: lista de `/medicos` renderiza médicos aprovados com shape real do backend.
  - Risco: paciente não encontra médico, não agenda, não paga.

- [ ] Estratégia de repasse para médico definida
  - Critério: se o modelo comercial exige repasse automático, integração de repasse não pode ficar “em breve”.
  - Risco: gargalo financeiro/operacional pós-venda.

## 2) Itens que NÃO bloqueiam lançamento (mas devem entrar no backlog)

- [ ] Redução de alertas (`window.alert`) para UX mais fluida.
- [ ] Otimização de bundle/chunks do Vite.
- [ ] Refino visual e microinterações.
- [ ] Testes automatizados completos (recomendado, porém não obrigatório para go-live inicial).

## 3) O que EU consigo fazer por você (no código)

- [x] Corrigir endpoints e contratos frontend/backend.
- [x] Ajustar parsing/normalização de payload para tolerar variações do backend.
- [x] Implementar tratamento de erros e mensagens reais da API.
- [x] Corrigir fluxo de pagamento (PIX/cartão + polling + fallback).
- [x] Corrigir fluxo de agendamento até encaminhar para pagamento.
- [x] Adicionar telemetria temporária DEV para diagnóstico.
- [x] Rodar build, corrigir erros TS e publicar via commit/push.
- [x] Sincronização automática de status no retorno de checkout (PaymentSuccess/Pending/Failure).
- [x] Remover fallback mock silencioso em RepasseDetail — erros reais agora visíveis.
- [x] Login com Google implementado no LoginScreen (requer VITE_GOOGLE_CLIENT_ID configurado).
- [x] Push web-pwa: fallback graceful sem alert — não bloqueia save de preferências.
- [x] window.alert removido dos fluxos críticos (Signup, ResetPassword, ForgotPassword, BankDetails, Profile, Payment, NotificationPreferences).
- [x] Redesign visual da tela de Pagamento com branding consistente.
- [x] Code splitting via lazy import — bundle principal reduzido de 549KB para 260KB (-53%).

## 4) O que VOCÊ precisa fazer (fora do código)

- [ ] Confirmar variáveis de ambiente de produção (Actions/host):
  - `VITE_API_URL`
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_MP_PUBLIC_KEY` (se necessário no frontend)
  - `VITE_MOCK=false`

- [ ] Executar teste real de pagamento (transação controlada) com conta paciente real.
- [ ] Validar operação do lado médico após compra (consulta aparece, status correto, agenda consistente).
- [ ] Definir processo financeiro de repasse (manual/automático) e operação de suporte.
- [ ] Conferir políticas legais/publicação (termos, privacidade, contato, suporte).

## 5) Go / No-Go (decisão rápida)

Marque GO apenas se todos os itens da seção "BLOQUEIAM lançamento" estiverem concluídos.

- GO: [ ] Sim
- NO-GO: [ ] Não
- Data/hora da decisão: __________________
- Responsável: __________________

## 6) Plano de validação mínima (30-60 min)

1. Login paciente (email/senha e Google).
2. Abrir agendamento e confirmar médico aprovado visível.
3. Criar consulta em slot válido.
4. Gerar PIX e validar QR + copia-e-cola.
5. Confirmar mudança de status para pago.
6. Validar dashboard paciente e dashboard médico.
7. Validar cancelamento e mensagens de erro de API.

## 7) Observações

- Se houver qualquer falha em autenticação, listagem de médicos ou pagamento, classificar como NO-GO.
- Após GO, monitorar primeiras transações em janela de observação (ex.: primeiras 24h).
