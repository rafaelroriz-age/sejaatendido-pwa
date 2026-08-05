# Prompt para implementar frontend de conexao paciente-medico (consulta efetiva)

Voce e responsavel por implementar no frontend (PWA React + Vite) melhorias para aumentar a taxa de paciente e medico conectados na consulta no horario correto.

## Contexto obrigatorio

Leia antes de codar:

1. `docs/arquitetura.md`
2. `docs/processes/agendamento-consulta.md`
3. `docs/processes/notificacoes-e-preferencias.md`
4. `docs/plans/2026-08-05-conexao-paciente-medico-consulta-efetiva.md`

Nao quebrar contratos existentes de pagamento pos-atendimento e nem os fluxos antifraude ja documentados.

## Objetivo de produto

1. Tornar o estado da consulta claro para paciente e medico.
2. Garantir CTA unificado de entrada quando o link estiver disponivel.
3. Reduzir friccao pre-consulta com lembretes e orientacoes.
4. Melhorar tratativa de erro operacional sem tela silenciosa.

## Escopo tecnico (frontend)

### 1. Estados e UX no Dashboard do paciente

Atualizar a logica para exibir estados claros da consulta:

- `PENDENTE`: "Aguardando aceite do medico".
- `ACEITA`: "Consulta confirmada. Entre no horario marcado".
- `EM_ANDAMENTO`: "Consulta em andamento".
- `CONCLUIDA`: manter comportamento atual de pagamento pos-consulta.

Acoes:

1. Exibir botao primario "Entrar na consulta" quando houver `meetLink` valido.
2. Exibir contagem regressiva para consultas que acontecem nas proximas 24h.
3. Exibir bloco de preparacao (internet, ambiente, documento).

### 2. Estados e UX no Dashboard do medico

1. Exibir paciente com nome real quando backend fornecer o campo.
2. Exibir CTA "Entrar na consulta" assim que status virar `ACEITA` e `meetLink` existir.
3. Exibir alerta operacional quando status exigir link e ele nao vier.

### 3. Tratamento de erros padronizado

1. Usar o mecanismo de erro global ja existente e garantir exibicao visual (toast/banner).
2. Mapear erros de conexao em mensagens amigaveis:
   - link indisponivel
   - acesso negado
   - consulta ainda nao aceita
3. Incluir codigo de erro curto para suporte (`CONSULTA_LINK_INDISPONIVEL`, etc.).

### 4. Notificacoes e janela de consulta

1. Exibir no frontend os lembretes recebidos e o proximo lembrete programado.
2. Mostrar card "Sua consulta hoje" com horario, medico e acao primaria.

### 5. Telemetria de uso (frontend)

Disparar eventos de analytics para:

1. visualizacao do botao entrar
2. clique em entrar
3. falha ao abrir link
4. retorno bem sucedido apos abrir link

## Requisitos de implementacao

1. Preservar convencoes de codigo existentes.
2. Criar/atualizar testes unitarios e de integracao para os novos estados e CTAs.
3. Evitar regressao nos fluxos atuais (`BookAppointment`, `Dashboard`, `DoctorDashboard`, `Payment`).
4. Garantir acessibilidade basica (labels, foco, feedback de erro).

## Arquivos candidatos (ajuste conforme necessidade real)

1. `src/pages/Dashboard.tsx`
2. `src/pages/DoctorDashboard.tsx`
3. `src/services/api.ts`
4. `src/components/*` (novos badges/cards de estado)
5. `src/pages/*.test.tsx` relacionados

## Criterios de aceite

1. Paciente e medico conseguem identificar claramente quando e como entrar na consulta.
2. CTA de entrada aparece apenas quando o link e valido.
3. Erros de conexao deixam de ser silenciosos.
4. Testes cobrindo os novos cenarios passam em `npm test`.
5. Build e typecheck passam sem erros.

## Entrega esperada

1. PR com mudancas objetivas e testes.
2. Resumo dos fluxos alterados.
3. Evidencia de validacao (tests/build).
