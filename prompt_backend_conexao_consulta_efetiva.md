# Prompt para implementar backend de conexao paciente-medico (consulta efetiva)

Voce e responsavel por implementar no backend as garantias de contrato e confiabilidade para que paciente e medico consigam entrar na consulta com previsibilidade.

## Contexto obrigatorio

Use como referencia funcional:

1. `docs/arquitetura.md`
2. `docs/processes/agendamento-consulta.md`
3. `docs/processes/notificacoes-e-preferencias.md`
4. `docs/systems/api-backend-e-contratos.md`
5. `docs/plans/2026-08-05-conexao-paciente-medico-consulta-efetiva.md`

## Objetivo de produto

1. Eliminar casos em que consulta aceita nao tem link de atendimento.
2. Garantir consistencia de status entre paciente e medico.
3. Orquestrar lembretes de consulta por janela de tempo.
4. Expor observabilidade para diagnostico de no-show tecnico.

## Escopo tecnico (backend)

### 1. Contrato robusto de aceite de consulta

Endpoint: `PATCH /medicos/me/consultas/:id`

Regras:

1. Aceitar payload canonico atual com `status` (`ACEITA`, `RECUSADA`, `CONCLUIDA`, etc.).
2. Ao transicionar para `ACEITA`, gerar e persistir `meetLink` na mesma transacao.
3. Se nao conseguir gerar `meetLink`, nao concluir a transicao (rollback).
4. Garantir idempotencia para chamadas repetidas.

Resposta esperada (exemplo):

```json
{
  "consulta": {
    "id": "consulta-123",
    "status": "ACEITA",
    "meetLink": "https://...",
    "updatedAt": "2026-08-05T10:00:00.000Z"
  }
}
```

### 2. Leitura consistente de consultas

Endpoints afetados:

1. `GET /pacientes/me/consultas`
2. `GET /medicos/me/consultas`

Garantias:

1. Quando `status` for `ACEITA` ou `EM_ANDAMENTO`, `meetLink` deve estar presente.
2. Incluir campos de apoio para UX:
   - `inicioPrevistoEm`
   - `entradaPacienteEm` (opcional)
   - `entradaMedicoEm` (opcional)
3. Nao retornar estados regressivos apos aceite confirmado.

### 3. Janela de notificacoes pre-consulta

Criar job/scheduler com disparos:

1. T-60 min
2. T-10 min
3. T+0 min

Cada disparo deve registrar:

```json
{
  "consultaId": "...",
  "usuarioId": "...",
  "canal": "push|email|whatsapp",
  "status": "enviado|falhou|reentregue",
  "timestamp": "..."
}
```

### 4. Endpoint de timeline operacional

Criar endpoint admin para suporte:

`GET /admin/consultas/:id/timeline`

Resposta esperada:

```json
{
  "consultaId": "consulta-123",
  "eventos": [
    { "tipo": "consulta_aceita", "at": "...", "ator": "medico-1" },
    { "tipo": "consulta_link_gerado", "at": "..." },
    { "tipo": "notificacao_t_10_enviada", "at": "..." },
    { "tipo": "consulta_entrada_paciente", "at": "..." },
    { "tipo": "consulta_entrada_medico", "at": "..." }
  ]
}
```

Objetivo: acelerar diagnostico de "nao consegui entrar na consulta".

### 5. Eventos de observabilidade

Persistir ou publicar eventos:

1. `consulta_link_gerado`
2. `consulta_link_visualizado_paciente`
3. `consulta_link_visualizado_medico`
4. `consulta_entrada_paciente`
5. `consulta_entrada_medico`
6. `consulta_iniciada`
7. `consulta_no_show_tecnico`

## Requisitos nao funcionais

1. Auditoria de transicoes de status (quem, quando, de/para).
2. p95 de leitura de consultas dentro de limite aceitavel para polling de frontend.
3. Logs estruturados para erros de geracao de link e envio de notificacao.
4. Respostas de erro padronizadas com mensagem amigavel e codigo estavel.

## Criterios de aceite

1. Nao existe consulta `ACEITA` sem `meetLink`.
2. Paciente e medico veem o mesmo status de consulta em ate 30s.
3. Notificacoes de T-10 e T+0 disparam com rastreabilidade.
4. Time de suporte consegue diagnosticar um incidente por `consultaId` via timeline.

## Entrega esperada

1. Implementacao dos endpoints/jobs.
2. Testes de integracao para transicao de status + geracao de link.
3. Testes dos contratos de leitura e timeline.
4. Resumo de deploy e flags necessarias.
