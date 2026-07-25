# Prompt para o backend implementar o subsistema de Risco e Antifraude (consultas)

Você é o responsável por implementar, no backend do Seja Atendido, os endpoints e regras de
negócio do subsistema de **Risco e Antifraude** que reduz fraude de pagamento e
inadimplência associada a consultas. O frontend (PWA) já foi implementado consumindo os
contratos abaixo — este prompt existe para o backend acompanhar exatamente o que a UI espera.

Contexto completo da decisão de arquitetura: `docs/arquitetura.md` (no repositório do
frontend). Este prompt resume apenas o que é necessário para implementar o backend.

## Esclarecimento importante: o endpoint de "repasse imediato" já existe e está especificado

Se ao buscar por "repasse imediato" no repositório do backend você não encontrar nada, isso
**não significa que a funcionalidade não foi especificada** — ela está documentada e já
implementada do lado do frontend desde 2026-07-23/25. Antes de tratar este prompt como
bloqueado por falta de contrato, confira as referências abaixo (todas no repositório do
frontend):

- `docs/decisions/adr-0002-estrategia-repasse-medico.md` — ADR (status `validated`) que
  decide: repasse automático semanal **ou** repasse imediato (antecipação) mediante taxa
  retida pela plataforma.
- `docs/arquitetura.md` (linha ~39 e ADR-02, linhas ~298-311) — janela de retenção
  diferenciada por método de pagamento (PIX vs. cartão) e bloqueio de antecipação quando há
  `RiscoAvaliacao` em faixa `MEDIO`/`ALTO`.
- `docs/arquitetura.md` (linha ~240, tabela de contratos de API) — lista
  `POST /medicos/me/repasses/imediato` como endpoint **estendido**.
- `docs/processes/pagamentos-consulta.md` (linhas ~62-74) — contrato detalhado do endpoint.
- `GO-LIVE-CHECKLIST.md` (linhas ~30-31 e ~67-68) — registra que o contrato foi "confirmado
  com o backend em 2026-07-25".
- `docs/plans/roteiro-testes-producao.md` (linha ~139).
- Implementação no frontend: `src/services/api.ts` (função `solicitarRepasseImediato`,
  interface `RepasseImediatoResult`, campo `taxa_repasse_imediato_percentual` em
  `SaldoMedico`), `src/pages/Earnings.tsx` (`AntecipacaoCard`), `src/mocks/handlers.ts`
  (mock do campo `taxaRepasseImediatoPercentual`).

Contrato exato já assumido pelo frontend (é o que este prompt pede para implementar nas
seções 6 e 7 abaixo):

`POST /medicos/me/repasses/imediato`

- Corpo: `{}` (antecipa saldo integral) ou `{ "valorCentavos": number }` (antecipa parte).
- Resposta esperada: `{ "taxaCentavos": number, "valorLiquidoCentavos": number, "repasse": Repasse }`.
- Erros: 4xx com mensagem legível em `message`/`erro`/`error`/`detail` quando: sem saldo
  disponível, sem dados bancários cadastrados, ou (extensão pedida neste prompt) saldo
  retido por análise antifraude.

Se, mesmo após conferir essas referências, o backend tiver uma implementação divergente ou
dúvidas sobre o contrato, responda apontando exatamente o ponto de divergência para
alinharmos — mas o endpoint e a decisão de negócio **já existem e estão validados**, não é
necessário reabrir a decisão de "se" o repasse imediato deve existir.

## Objetivo

1. Avaliar risco de cada pagamento e permitir bloqueio/retenção quando necessário.
2. Reter repasse imediato (antecipação) de pagamentos por cartão até uma janela de segurança,
   sem afetar o repasse automático semanal já existente (ver ADR 0002).
3. Reconciliar estornos/chargebacks do Mercado Pago via webhook.
4. Dar ao admin uma fila de revisão manual e uma lista de bloqueio (denylist).

## Endpoints que o frontend já consome (implementar exatamente estes contratos)

### 1. `GET /admin/risco/casos?status=PENDENTE`

Lista casos de revisão manual. `status` pode ser `PENDENTE`, `APROVADO`, `BLOQUEADO` ou
omitido (retorna todos).

Resposta esperada:

```json
{
  "casos": [
    {
      "id": "caso-risco-001",
      "status": "PENDENTE",
      "motivo": null,
      "criadoEm": "2026-07-20T10:00:00.000Z",
      "decididoEm": null,
      "pagamento": {
        "id": "pag-001",
        "consultaId": "consulta-001",
        "valorCentavos": 15000,
        "metodo": "cartao"
      },
      "paciente": { "id": "paciente-001", "nome": "Fulano de Tal", "email": "fulano@teste.com" },
      "riscoAvaliacao": { "score": 82, "faixa": "ALTO", "sinais": ["velocity_alta", "dispositivo_novo"] }
    }
  ]
}
```

- `riscoAvaliacao.faixa` deve ser um destes valores: `BAIXO`, `MEDIO`, `ALTO`.
- `pagamento.valorCentavos` em centavos (o frontend converte para reais).
- Requer autenticação Bearer com papel `ADMIN` (401/403 tratados pelo frontend).

### 2. `POST /admin/risco/casos/:id/decisao`

Corpo:

```json
{ "decisao": "APROVAR", "motivo": "opcional para aprovar, obrigatório para bloquear" }
```

`decisao` é `APROVAR` ou `BLOQUEAR`. Ao bloquear, o frontend sempre envia `motivo` preenchido
(validação client-side), mas o backend também deve validar e recusar (400) se `motivo` vier
vazio quando `decisao = BLOQUEAR`.

Resposta esperada: `{ "caso": { ...mesmo shape do item da listagem, com status atualizado... } }`.

Regra de negócio esperada no backend: ao `BLOQUEAR`, o pagamento associado deve ser
recusado/estornado conforme a fase em que estiver, e o repasse correspondente não deve ser
liberado.

### 3. `GET /admin/denylist`

Resposta esperada:

```json
{
  "entradas": [
    {
      "id": "denylist-001",
      "tipo": "EMAIL",
      "valor": "fraude@teste.com",
      "motivo": "Chargeback confirmado",
      "criadoEm": "2026-07-20T10:00:00.000Z",
      "expiraEm": null
    }
  ]
}
```

`tipo` é um destes valores: `CPF`, `EMAIL`, `CARTAO_HASH`, `DEVICE_ID`. Para `CARTAO_HASH`, o
campo `valor` deve ser um hash (nunca o PAN do cartão) — o backend é responsável por gerar
esse hash a partir do identificador que o Mercado Pago fornece.

### 4. `POST /admin/denylist`

Corpo: `{ "tipo": "CPF", "valor": "111.444.777-35", "motivo": "Cartão roubado", "expiraEm": "2026-12-31" }`
(`expiraEm` é opcional).

Validações esperadas no backend: `tipo`, `valor` e `motivo` obrigatórios (400 se faltar
algum); normalizar/validar `valor` conforme o `tipo` (ex.: CPF com 11 dígitos, e-mail válido).

Resposta esperada (201): `{ "entrada": { ...mesmo shape da listagem... } }`.

**Efeito esperado**: qualquer novo agendamento/pagamento cujo CPF, e-mail, hash de cartão ou
device id conste na denylist deve ser recusado (ou enviado direto para revisão manual) antes
de chegar ao checkout do Mercado Pago.

### 5. `DELETE /admin/denylist/:id`

Remove/expira a entrada. Resposta esperada: `{ "ok": true }`.

### 6. Extensão de `GET /medicos/me/saldo`

Adicionar dois campos novos à resposta já existente, sem remover os atuais:

```json
{
  "saldoALiberarCentavos": 10000,
  "saldoPendenteCentavos": 5000,
  "ganhosHojeCentavos": 0,
  "proximoRepasse": "2026-07-27",
  "ganhosSemana": [0,0,0,0,0,0,0],
  "taxaRepasseImediatoPercentual": 5,
  "saldoRetidoCentavos": 500,
  "previsaoLiberacao": "2026-08-01"
}
```

- `saldoRetidoCentavos`: valor de pagamentos por cartão ainda dentro da janela de retenção
  antifraude (não disponível para repasse imediato, mas incluído no ciclo automático semanal
  normalmente).
- `previsaoLiberacao`: data (ISO) prevista para o valor retido ficar disponível para
  antecipação. Pode ser omitido/`null` quando não há valor retido.
- Se o backend ainda não suportar esses campos, pode omiti-los — o frontend já trata a
  ausência sem quebrar (campos opcionais).

### 7. Extensão de `POST /medicos/me/repasses/imediato`

Quando o saldo solicitado para antecipação estiver total ou parcialmente retido por análise
de risco (`RiscoAvaliacao` em faixa `MEDIO`/`ALTO` ainda aberta, ou dentro da janela de
retenção do ADR-02), o backend deve **recusar** a antecipação com um erro 4xx e uma mensagem
de negócio clara em `message` (ou `erro`/`error`/`detail`), por exemplo:

```json
{ "message": "Parte do seu saldo está em análise de segurança e só pode ser antecipada após a liberação." }
```

O frontend já exibe essa mensagem de erro literalmente (via `handleApiError`), então capriche
no texto — ele aparece direto na tela do médico em `Earnings.tsx`.

### 8. Webhook de chargeback do Mercado Pago (novo, não consumido diretamente pelo frontend)

Endpoint sugerido: `POST /webhooks/mercadopago/chargeback`, validando a assinatura do
Mercado Pago. Ao receber um evento de estorno/disputa:

1. Localizar o pagamento pelo identificador do Mercado Pago.
2. Se o valor já tiver sido repassado ao médico (ciclo automático ou antecipação), registrar
   o ajuste a compensar no próximo ciclo de repasse do médico (nunca deixar saldo negativo
   silencioso — deve aparecer de alguma forma auditável).
3. Criar automaticamente um `CasoRisco` (status `PENDENTE`) para o admin revisar, se ainda não
   existir um caso para aquele pagamento.

## Regras de negócio que ficam por conta do backend (não implementadas no frontend)

- Cálculo do score de risco (velocity checks, denylist hit, reputação de conta, sinais de
  device id do Mercado Pago).
- Decisão automática de aprovar/reter/bloquear com base no score (o frontend só exibe o
  resultado e permite decisão manual quando o caso está `PENDENTE`).
- Janela de retenção de repasse por método de pagamento (PIX vs. cartão) — ver ADR-02 em
  `docs/arquitetura.md`.
- Política de no-show/pagamento antecipado obrigatório após N faltas.
- Reverificação periódica de CRM do médico.

## Critério de aceitação

- Um caso de risco `ALTO` criado no backend aparece na tela `/admin/risco` do frontend com
  faixa, score e valor do pagamento corretos.
- Aprovar/bloquear um caso na UI reflete no backend e o caso some da aba "Pendentes".
- Adicionar um CPF/e-mail à denylist via `/admin/denylist` bloqueia de fato uma tentativa
  posterior de agendamento/pagamento com esse mesmo CPF/e-mail.
- Quando há saldo retido, `BalanceCard` e `Earnings` do médico mostram o valor retido e a
  previsão de liberação, sem quebrar quando os campos não existem ainda.
- Uma tentativa de repasse imediato bloqueada por risco retorna mensagem de erro legível, que
  aparece diretamente na tela do médico.
