---
title: Processo de Pagamento da Consulta
type: process
status: review
confidence: 0.80
owner: frontend
related:
  - agendamento-consulta.md
  - ../systems/api-backend-e-contratos.md
  - ../plans/divergencias.md
  - ../decisions/adr-0002-estrategia-repasse-medico.md
tags: [pagamento, pix, cartao, asaas, repasse]
last_updated: 2026-08-05
---

<!-- ai-summary
System: pagamento de consulta via PIX ou cartao (tokenizacao client-side + cartao salvo) usando endpoints /v1/pagamentos.
Flow: consulta precisa estar CONCLUIDA (regra pos-atendimento, 2026-08) -> Dashboard exibe "Pagar consulta" -> tela de selecao de forma de pagamento (Pix/Cartao/Dinheiro em breve) -> criar pagamento ou tokenizar cartao -> polling sync (Pix) ou resposta imediata (cartao) -> confirmar status final.
Owner: frontend.
Systems: src/pages/Payment.tsx, src/pages/Dashboard.tsx, src/pages/BookAppointment.tsx, src/components/CreditCardForm.tsx, src/services/api.ts, src/services/asaas.ts, src/pages/PaymentSuccess.tsx, src/pages/PaymentPending.tsx, src/pages/PaymentFailure.tsx.
Status: review.
-->

# Processo de Pagamento da Consulta

## Origem e evidencias

- Evidencia principal: src/pages/Payment.tsx
- Evidencia principal: src/pages/Dashboard.tsx
- Evidencia principal: src/services/api.ts
- Evidencia complementar: GO-LIVE-CHECKLIST.md

> Migrado e reconciliado de GO-LIVE-CHECKLIST.md (itens de fluxo de receita e polling).

## Regra de negocio: pagamento pos-atendimento (2026-08-05)

- **Mudanca no contrato do backend**: pagamento so pode ser criado quando `consulta.status === 'CONCLUIDA'`.
  Antes, o pagamento era criado logo apos o agendamento (pre-pagamento); agora o paciente agenda,
  participa da consulta, e so entao paga.
- `BookAppointment.tsx` **nao** redireciona mais para `/payment` apos confirmar o agendamento —
  vai para `/dashboard` (o backend rejeitaria a criacao do pagamento nesse momento).
- Um job/cron no backend marca a consulta como `CONCLUIDA` (~10 min apos o horario marcado,
  cobrindo tanto encerramento manual do medico quanto o caso do medico esquecer de finalizar).
- `Dashboard.tsx` exibe o botao **"Pagar consulta"** somente quando a consulta esta `CONCLUIDA`
  (`isConsultaConcluida`), levando para `/payment` com o `consultaId`.
- Se a tela de pagamento for aberta antes da conclusao (ex.: link direto/refresh), a API responde
  `400`/`403` com mensagem contendo "conclu"/"finaliz"; `Payment.tsx` trata isso como o estado
  bloqueado `consulta_nao_concluida` e exibe uma mensagem clara em vez de erro generico.
- **Pendente de validacao real**: essa trava nao e reproduzida pelos mocks MSW por padrao (apenas
  por um teste unitario dedicado em `Payment.test.tsx`); precisa ser confirmada contra o backend
  real em staging/producao antes do go-live.

## Fluxo PIX

1. Tela Payment recebe consultaId (state, query ou sessionStorage) — chega aqui via botao
   "Pagar consulta" do Dashboard, so disponivel apos a consulta ser CONCLUIDA.
2. criarPagamento({ consultaId, metodoPagamento: 'pix' }) chama POST /v1/pagamentos/pix.
3. UI exibe QR (qrCode/qrCodeBase64/ticketUrl) e validade.
4. Polling chama syncPagamento(consultaId) em intervalo de 5s.
5. Quando status vira PAGO, redireciona para /dashboard.

## Fluxo Cartao

1. Tela Payment carrega os cartoes salvos do paciente (fetchCartoesSalvos) ao abrir a aba "Cartao".
2. Se houver cartoes salvos, a UI lista cada um (bandeira + ultimos digitos) com acoes "Pagar" e
   "Remover"; um item "Adicionar novo cartao" abre/fecha o formulario de cartao novo.
3. Cartao novo: CreditCardForm tokeniza os dados diretamente no Asaas (`tokenizeCreditCard`,
   `POST /v3/creditCard/tokenizeCreditCard` com a chave restrita de tokenizacao) — numero e CVV
   nunca passam pelo backend proprio.
4. `pagarComCartaoToken({ consultaId, token, ... })` ou `pagarComCartaoToken({ consultaId, cartaoId })`
   chama `POST /v1/pagamentos/cartao/token` com o token (cartao novo) ou o id do cartao salvo.
5. Resposta traz `cartao.aprovado` e `pagamento.status`; se aprovado, redireciona para /dashboard.
   Se recusado, exibe o motivo (`cartao.statusDetail`) e oferece pagar com Pix.

- "Dinheiro" e exibido na tela de selecao de forma de pagamento como opcao desabilitada
  ("Em breve"): o backend (Asaas) ainda nao tem um contrato de pagamento presencial/em dinheiro
  para consultas — ver observacao na secao de migracao de gateway abaixo.

## Regras e contratos

- Endpoints de pagamento usam prefixo /v1.
- Campo canonico de confirmacao e pagamento.status.
- Polling para em status final nao pendente.

## Repasse ao medico

> Decisao de negocio: ver [ADR 0002 - Estrategia de Repasse ao Medico](../decisions/adr-0002-estrategia-repasse-medico.md).

- O valor liquido das consultas pagas se acumula em `saldo_a_liberar` (GET /medicos/me/saldo).
- Repasse padrao e **automatico**: ocorre no ciclo semanal (toda segunda-feira), sem acao
  manual do medico ou da operacao.
- O medico pode solicitar **repasse imediato** (antecipacao) do saldo disponivel antes do
  proximo ciclo. Essa solicitacao **cobra uma taxa**, retida integralmente pela plataforma e
  descontada do valor antecipado. A UI exibe o valor da taxa e o valor liquido antes da
  confirmacao (src/pages/Earnings.tsx).
- Contrato do endpoint de repasse imediato (enquanto o backend nao confirma um contrato
  definitivo, o frontend assume e documenta este formato):
  - `POST /medicos/me/repasses/imediato`
  - Corpo: `{}` (usa o saldo disponivel integral) ou `{ "valorCentavos": number }` para
    antecipar parte do saldo.
  - Resposta esperada: `{ "taxaCentavos": number, "valorLiquidoCentavos": number, "repasse": Repasse }`.
  - Erros: se o medico nao tiver saldo disponivel ou dados bancarios cadastrados, a API deve
    retornar erro 4xx com mensagem tratavel pela UI.

## Nota de reconciliacao

- O gap de sincronizacao no retorno de checkout foi resolvido em 2026-06-17 com sync imediato nas telas de retorno.
- Estrategia de repasse ao medico definida em 2026-07-23 (ver ADR 0002) — deixa de ser um item "em breve" do go-live.

## Migracao de gateway: Mercado Pago -> Asaas (2026-07-30)

- Backend trocou o provedor de pagamento de **Mercado Pago** para **Asaas**.
- Frontend foi desacoplado do contrato do Mercado Pago:
  - Removida a dependencia `@mercadopago/sdk-react` e a inicializacao em `main.tsx`.
  - `services/api.ts` (`PagamentoResponse`, `normalizePagamentoResponse`) agora usa um objeto `asaas` (`paymentId`, `invoiceUrl`, `checkoutUrl`, `billingType`) e mantem os campos genericos ja existentes (`linkPagamento`, `paymentUrl`) como fonte de verdade para o redirecionamento do checkout de cartao, tolerando tanto `invoiceUrl` quanto `checkoutUrl`.
  - `Payment.tsx` nao le mais campos especificos de gateway diretamente: usa `data.linkPagamento`/`data.paymentUrl` (ja normalizados), com fallback para `data.asaas.invoiceUrl`/`data.asaas.checkoutUrl`.
  - Mocks MSW (`src/mocks/handlers.ts`) e testes (`Payment.test.tsx`) atualizados para o novo contrato.
- Contrato de PIX (`pix.qrCode`, `pix.qrCodeBase64`, `pix.ticketUrl`, `pix.validade`) ja era agnostico de gateway e nao precisou mudar.
- **Pendente**: confirmar em ambiente real (staging/producao) que o backend efetivamente retorna os nomes de campo assumidos acima (`asaas.invoiceUrl`/`asaas.checkoutUrl`, ou o generico `linkPagamento`/`paymentUrl`/`checkoutUrl`/`invoiceUrl` no nivel raiz). Se o backend usar nomes diferentes, ajustar `normalizePagamentoResponse` em `services/api.ts`.
- Ver [GO-LIVE-CHECKLIST.md](../../GO-LIVE-CHECKLIST.md), secao 8.
- **Superado em rodada posterior**: o fluxo de cartao descrito acima (redirect para checkout hospedado, `invoiceUrl`/`checkoutUrl`) foi substituido pela tokenizacao client-side com cartao salvo (ver secao "Fluxo Cartao" no topo deste documento e [docs/plans/2026-07-30-passo-validacao-asaas-frontend.md](../plans/2026-07-30-passo-validacao-asaas-frontend.md), que registrava "cartao salvo desativado" como decisao daquela rodada — decisao revertida quando a tokenizacao client-side (`tokenizeCreditCard`) foi implementada).

## Redesenho da tela de selecao de forma de pagamento (2026-08-05)

- Objetivo: tornar a escolha de forma de pagamento mais clara e profissional, substituindo as
  abas simples "PIX"/"Cartao" por cards com icone + descricao (estilo checkout de mercado).
- `src/pages/Payment.tsx`: secao "Forma de pagamento" lista Pix e Cartao de credito como opcoes
  selecionaveis (`PAYMENT_METHOD_OPTIONS`) e uma opcao **Dinheiro** desabilitada com selo
  "Em breve" — visivel para comunicar o roadmap, mas sem chamada ao backend (Asaas nao tem
  contrato de pagamento presencial/em dinheiro; ver nota acima).
- Cartoes salvos passaram a ser exibidos como linhas de selecao (icone + bandeira + ultimos
  digitos) com acoes "Pagar"/"Remover", e um item "Adicionar novo cartao" (com icone de
  "+") alterna a exibicao do formulario de cartao novo — em vez do link de texto anterior
  ("Pagar com outro cartao").
- Novos icones adicionados a `src/components/Icon.tsx`: `credit-card`, `qr-code`, `banknote`,
  `plus-circle`, `check-circle-filled`.
- Cobertura de teste: `src/pages/Payment.test.tsx` ("seletor de forma de pagamento (redesenho)"
  e "abre o formulario de novo cartao ao clicar em 'Adicionar novo cartao'").
- Fora de escopo: implementar pagamento em dinheiro de fato (requer endpoint novo no backend,
  fora deste repositorio) e uma tela dedicada separada de "Payment" para selecao de metodo —
  o redesenho manteve a mesma pagina, apenas com uma etapa visual de selecao mais rica.
