---
title: Plano de Conexao Paciente-Medico para Consulta Efetiva
type: plan
status: draft
confidence: 0.73
owner: produto-e-engenharia
related:
  - ../arquitetura.md
  - ../processes/agendamento-consulta.md
  - ../processes/notificacoes-e-preferencias.md
  - ../processes/pagamentos-consulta.md
  - ../systems/api-backend-e-contratos.md
tags: [consulta, conexao, telemedicina, ux, backend, frontend]
last_updated: 2026-08-05
---

<!-- ai-summary
System: plano de produto e tecnico para aumentar a efetividade de conexao entre paciente e medico no fluxo de consulta.
Flow: diagnostico de friccao -> plano em fases -> entregas frontend/backend -> metricas e criterios de aceite.
Owner: produto-e-engenharia.
Systems: Dashboard paciente, DoctorDashboard, NotificationPreferences, API de consultas, notificacoes e links de atendimento.
Status: draft.
-->

# Plano de Conexao Paciente-Medico para Consulta Efetiva

## 1. Problema foco

A plataforma consegue agendar e pagar, mas ainda existe friccao para paciente e medico efetivamente entrarem na consulta no horario certo. Pelas evidencias atuais, os principais riscos sao:

1. Consulta aceita sem link de atendimento confiavel (ou com sincronizacao tardia).
2. Falta de estado unico e claro para ambos os lados (paciente e medico) sobre o momento de entrar.
3. Notificacoes sem orquestracao forte por janela de tempo (antes e no inicio da consulta).
4. Falta de trilha de auditoria operacional para identificar no-show tecnico vs no-show humano.

## 2. Objetivo

Elevar a taxa de consultas iniciadas no horario com os dois lados conectados e reduzir perdas por friccao operacional.

## 3. Metricas de sucesso

1. Taxa de consultas iniciadas ate 5 min do horario: meta >= 92%.
2. Tempo medio entre horario marcado e primeiro evento de entrada na sala: meta <= 3 min.
3. Taxa de consultas ACEITA sem link valido: meta = 0%.
4. Taxa de no-show por falha tecnica (sem link/erro de acesso): meta <= 1%.

## 4. Escopo

### Em escopo

1. Jornada de pre-consulta e entrada na sala.
2. Estados de consulta e exibicao sincronizada para paciente e medico.
3. Notificacoes transacionais orientadas por janela de tempo.
4. Observabilidade de eventos de conexao e diagnostico de falhas.

### Fora de escopo

1. Troca de gateway de pagamento.
2. Mudanca de modelo comercial de repasse.
3. Video stack totalmente nova (a menos que o link atual seja inviavel).

## 5. Estrategia por fases

## Fase 1 - Confiabilidade do "Entrar na consulta" (prioridade maxima)

Objetivo: garantir que consulta ACEITA sempre tenha link funcional e acessivel para ambos.

Entregas backend:

1. Tornar transicao para `ACEITA` atomica com geracao/persistencia de `meetLink`.
2. Retornar sempre `meetLink` em `GET /pacientes/me/consultas` e `GET /medicos/me/consultas` quando status for `ACEITA` ou `CONCLUIDA`.
3. Adicionar idempotencia em `PATCH /medicos/me/consultas/:id` para evitar regressao de status.
4. Registrar auditoria minima: `consultaId`, `statusAnterior`, `statusNovo`, `ator`, `timestamp`.

Entregas frontend:

1. Dashboard paciente e medico com estado explicito da consulta:
   - `PENDENTE`: aguardando aceite do medico.
   - `ACEITA`: pronto para entrar.
   - `EM_ANDAMENTO`: consulta iniciada.
   - `CONCLUIDA`: consulta finalizada.
2. CTA primario unico: "Entrar na consulta" quando houver `meetLink` valido.
3. Fallback controlado quando `meetLink` ausente em status que exige link (banner de erro operacional + acao de suporte).
4. Polling curto e resiliente para sincronizar aceite/link sem recarregar pagina.

Criterio de aceite fase 1:

1. 100% das consultas ACEITA exibem CTA funcional para ambos os papeis.
2. Nenhum caso de retorno para `PENDENTE` apos aceite bem sucedido.

## Fase 2 - Orquestracao de lembretes e janela de entrada

Objetivo: reduzir faltas por esquecimento e alinhar os dois lados no mesmo horario.

Entregas backend:

1. Scheduler de notificacoes por consulta:
   - T-60min: lembrete de preparacao.
   - T-10min: lembrete de entrada.
   - T+0: consulta iniciando agora.
2. Endpoints de registro de entrega por canal (`push`, `email`, `whatsapp`) com status (`enviado`, `falhou`, `reentregue`).
3. Controle de preferencia por usuario com fallback de canal se o principal falhar.

Entregas frontend:

1. Tela de preferencias com resumo de canais ativos e estado de validacao.
2. Bloco "Sua consulta hoje" no dashboard com contagem regressiva e CTA contextual.
3. Mensagens padronizadas de pre-consulta (internet, local silencioso, documento em maos).

Criterio de aceite fase 2:

1. Entrega de pelo menos 1 notificacao efetiva por consulta em >= 98% dos casos.
2. Reducao de no-show operacional em >= 30% comparado a baseline.

## Fase 3 - Telemetria de efetividade e operacao assistida

Objetivo: distinguir rapidamente falha de produto, operacao e comportamento do usuario.

Entregas backend:

1. Eventos obrigatorios:
   - `consulta_link_gerado`
   - `consulta_link_visualizado_paciente`
   - `consulta_link_visualizado_medico`
   - `consulta_entrada_paciente`
   - `consulta_entrada_medico`
   - `consulta_iniciada`
   - `consulta_no_show_tecnico`
2. Endpoint de diagnostico admin por `consultaId` consolidando linha do tempo.

Entregas frontend:

1. Instrumentacao de eventos de clique e tentativa de entrada.
2. Estado de erro com codigo amigavel para suporte (ex.: `CONSULTA_LINK_INDISPONIVEL`).
3. Fluxo de autoajuda rapido (tentar novamente, abrir suporte, trocar navegador).

Criterio de aceite fase 3:

1. 100% das consultas do periodo com trilha minima de eventos.
2. Tempo de diagnostico de incidente operacional <= 10 min.

## 6. Dependencias e riscos

1. Dependencia do backend para estabilizar contrato de transicao de status e `meetLink`.
2. Dependencia de canais de notificacao externos (WhatsApp/Push/Email) com monitoramento de falha.
3. Risco de sobrecarga de polling: mitigar com intervalo adaptativo e eventos de foco/visibilidade da aba.

## 7. Rollout recomendado

1. Semana 1: liberar Fase 1 para 10% dos medicos (feature flag).
2. Semana 2: expandir para 50% com monitoramento diario.
3. Semana 3: 100% + iniciar Fase 2.

## 8. Checklist de pronto para producao

1. Testes E2E paciente e medico cobrindo aceite -> entrada -> conclusao.
2. Testes de regressao para `PATCH` de status e persistencia de `meetLink`.
3. Alarmes operacionais para queda de taxa de entrada no horario.
4. Runbook de suporte com codigos de erro e acoes de contorno.

## 9. Backlog executavel (ordem, estimativa e dono)

Estimativa em dias uteis, considerando time com 1 dev frontend, 1 dev backend e 1 QA.

1. BE-01 - Aceite atomico com `meetLink` (backend, 2d)
   - Implementar transacao unica para mudar status para `ACEITA` e gerar `meetLink`.
   - Incluir idempotencia para evitar regressao de status.
   - Dependencias: nenhuma.

2. BE-02 - Leitura consistente de consultas (backend, 1d)
   - Garantir `meetLink` obrigatorio em `ACEITA` e `EM_ANDAMENTO`.
   - Expor `inicioPrevistoEm`, `entradaPacienteEm`, `entradaMedicoEm` (opcionais).
   - Dependencias: BE-01.

3. FE-01 - Estados unificados no Dashboard do paciente (frontend, 2d)
   - Estados visiveis: `PENDENTE`, `ACEITA`, `EM_ANDAMENTO`, `CONCLUIDA`.
   - CTA unico "Entrar na consulta" apenas com link valido.
   - Dependencias: BE-02.

4. FE-02 - Estados unificados no Dashboard do medico (frontend, 2d)
   - Exibir nome real do paciente quando backend entregar.
   - Exibir alerta operacional quando status exigir link e ele estiver ausente.
   - Dependencias: BE-02.

5. FE-03 - Erro global visivel + codigos de suporte (frontend, 1.5d)
   - Implementar listener visual para `app:error` (toast/banner global).
   - Mapear erros de conexao e incluir codigo curto de suporte.
   - Dependencias: nenhuma.

6. BE-03 - Scheduler de lembretes T-60, T-10, T+0 (backend, 2d)
   - Orquestrar disparos por canal com fallback e rastreio de entrega.
   - Dependencias: BE-02.

7. FE-04 - Card "Sua consulta hoje" + contagem regressiva (frontend, 1.5d)
   - Mostrar horario, medico e CTA contextual de entrada.
   - Dependencias: FE-01, FE-02.

8. BE-04 - Timeline operacional admin por `consultaId` (backend, 1.5d)
   - Endpoint `GET /admin/consultas/:id/timeline` com eventos de ponta a ponta.
   - Dependencias: BE-03.

9. FE-05 - Telemetria de clique e falha de entrada (frontend, 1d)
   - Eventos de visualizacao, clique, falha e sucesso de entrada.
   - Dependencias: FE-01, FE-02.

10. QA-01 - E2E e regressao por papel (qa+dev, 2d)
   - Fluxos paciente e medico: aceite -> entrada -> conclusao -> pagamento.
   - Regressao de pagamento pos-atendimento e anti-fraude.
   - Dependencias: BE-01..04 e FE-01..05.

## 10. Sequencia recomendada de execucao

1. Sprint A (confiabilidade de conexao): BE-01, BE-02, FE-01, FE-02, FE-03, QA parcial.
2. Sprint B (orquestracao): BE-03, FE-04, QA parcial.
3. Sprint C (operacao e observabilidade): BE-04, FE-05, QA final + go/no-go.

Lead time estimado total: 13 a 15 dias uteis, com paralelismo.

## 11. Definicao de pronto por item

1. Codigo com testes unitarios/integracao atualizados.
2. Sem regressao em `npm test`, `npm run typecheck` e `npm run build`.
3. Evidencia funcional em ambiente de homologacao (capturas ou logs).
4. Atualizacao de documentacao em `docs/processes` quando houver mudanca de contrato.
