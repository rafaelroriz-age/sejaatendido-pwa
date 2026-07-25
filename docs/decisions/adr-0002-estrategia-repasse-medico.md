---
title: ADR 0002 - Estrategia de Repasse ao Medico
type: decision
status: validated
confidence: 0.90
owner: produto
related:
  - ../processes/pagamentos-consulta.md
  - ../systems/api-backend-e-contratos.md
  - ../plans/duvidas-abertas.md
  - ../../GO-LIVE-CHECKLIST.md
tags: [adr, repasse, pagamento, financeiro]
last_updated: 2026-07-25
---

<!-- ai-summary
System: decisao de negocio sobre como o medico recebe o valor das consultas pagas.
Flow: consulta paga -> saldo a liberar -> repasse automatico semanal OU repasse imediato mediante taxa.
Owner: produto.
Systems: src/services/api.ts, src/pages/Earnings.tsx, src/components/BalanceCard.tsx.
Status: validated.
-->

# ADR 0002 - Estrategia de Repasse ao Medico

## Contexto

O GO-LIVE-CHECKLIST.md e o roteiro de testes em producao bloqueavam o lancamento com o item
"Estrategia de repasse para medico definida", pois o modelo comercial depende de repasse
financeiro ao medico e a integracao nao podia ficar como "em breve".

## Decisao

- O repasse ao medico e **automatico**: os valores das consultas pagas se acumulam em
  `saldo_a_liberar` e sao repassados no ciclo padrao (semanal, toda segunda-feira), sem
  necessidade de acao manual do medico ou de operacao humana.
- O medico tem a opcao de solicitar **repasse imediato** (antecipacao) do saldo disponivel
  antes do proximo ciclo automatico.
- O repasse imediato **cobra uma taxa**, retida integralmente pela plataforma (SejaAtendido),
  descontada do valor solicitado. O medico visualiza o valor da taxa e o valor liquido antes
  de confirmar o pedido.
- Sem solicitacao explicita de repasse imediato, o fluxo padrao (automatico, sem taxa) e
  mantido como esta hoje.

## Consequencias

Positivas:

- desbloqueia o item critico do GO-LIVE-CHECKLIST.md sem exigir operacao manual continua;
- cria uma fonte de receita adicional (taxa de antecipacao) alinhada ao modelo de negocio;
- medico ganha flexibilidade de fluxo de caixa sem custo para quem aceita esperar o ciclo padrao.

Negativas/riscos:

- ~~depende de endpoint de backend ainda nao confirmado para processar a antecipacao~~
  resolvido em 2026-07-25: contrato do endpoint confirmado com o backend (ver acoes de
  acompanhamento);
- a UI precisa deixar clara a taxa antes da confirmacao, para evitar reclamacao/chargeback
  de expectativa financeira.

## Acoes de acompanhamento

- [x] Confirmar com o backend o contrato definitivo do endpoint de repasse imediato
  (rota, percentual/valor da taxa retornado pela API, e se o percentual e configuravel
  por medico ou fixo globalmente). Confirmado em 2026-07-25: repasse automatico semanal
  (toda segunda-feira) OU repasse imediato mediante taxa retida pela plataforma
  (fica para a conta do aplicativo).
- [x] Atualizar `docs/plans/roteiro-testes-producao.md` e `GO-LIVE-CHECKLIST.md` (feito nesta
  entrega) para remover o bloqueio de "em breve".
