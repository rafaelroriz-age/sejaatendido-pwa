# Passo de Validação — ASAAS funciona para Pagamento e Repasse (Frontend)

Data: 2026-07-30
Escopo: **apenas** confirmar, do lado do app (paciente e médico), se o fluxo de pagamento da
consulta e de visualização/solicitação de repasse funcionam contra o backend com ASAAS ativo.
Não cobre telas de cartão salvo (ainda não suportado pelo ASAAS, ver observações abaixo) nem
redesenho de UX de checkout — apenas os endpoints que já existem e funcionam no backend.

> Este documento complementa a seção 8 de [GO-LIVE-CHECKLIST.md](../../GO-LIVE-CHECKLIST.md)
> ("Migração de gateway: Mercado Pago -> Asaas"), que já registrava a migração de contrato como
> pendente de validação real em staging/produção.

## Pergunta a responder

> "O app consegue cobrar o paciente e mostrar o repasse/saldo do médico usando o gateway ASAAS,
> de ponta a ponta?"

## Pré-requisitos (bloqueadores se ausentes)

- Backend rodando com `PAYMENT_GATEWAY=asaas` e `ASAAS_MODE=test` (ambiente de sandbox).
- Usuário paciente de teste **com CPF preenchido** — sem CPF, todo endpoint de pagamento
  retorna `422` antes de chamar o gateway (correção já aplicada no backend em 2026-07-30).
- Chave pública do ASAAS para tokenização de cartão no client-side (necessária só para o fluxo
  de cartão via `/pagamentos/cartao/token`; o fluxo PIX não precisa disso).
- Médico de teste com chave Pix cadastrada em `dados-bancarios` (obrigatória para repasse).

## Passo a passo de validação

### 1. Fluxo de pagamento (paciente)

1. Criar/usar uma consulta com `status = CONCLUIDA`.
2. Chamar `POST /pagamentos/pix` (ou `/checkout`) autenticado como paciente.
   - Esperado: `201` com `qrCode`/`qrCodeBase64`/`ticketUrl` (PIX) ou `initPoint` (checkout).
   - Exibir o QR code/link na tela de pagamento.
3. Confirmar o pagamento no painel sandbox do ASAAS (ou pedir ao backend para confirmar via
   smoke test — ver documento de validação do backend).
4. Fazer polling em `GET /pagamentos/sync/:consultaId` até `status = PAGO`.
   - Esperado: transição refletida em poucos segundos após a confirmação.
5. (Opcional) Testar fluxo de cartão:
   - Tokenizar um cartão de teste no client via ASAAS (`4444 4444 4444 4444`, validade futura,
     CVV `123`, CPF de teste `529.982.247-25`).
   - Enviar o `token` para `POST /pagamentos/cartao/token`.
   - Esperado: `201` quando aprovado; testar também um cartão de recusa
     (`5184 0197 4037 3151`) e confirmar que o app trata o erro com mensagem amigável.

### 2. Casos de erro que o app precisa tratar

| Situação | Resposta do backend | O que o app deve mostrar |
|---|---|---|
| Paciente sem CPF | `422 { erro: "CPF obrigatório..." }` | Mensagem pedindo para completar cadastro com CPF, sem expor texto técnico |
| Consulta não concluída | `400` | "Pagamento disponível apenas após a consulta ser concluída" |
| Consulta já paga | `409` | "Esta consulta já foi paga" |
| Cartão recusado | `checkoutResult.ok === false` / não-2xx | Mensagem amigável + permitir retry com outro cartão ou PIX |
| Erro de rede/gateway | `502` | Mensagem de erro + permitir retry |
| Consulta de outro paciente | `403` | Bloquear acesso à tela |

### 3. Fluxo de repasse (médico)

1. Após o pagamento acima confirmar (`PAGO`), verificar `GET /medicos/me/saldo`:
   - Esperado: valor líquido (já descontada a taxa da plataforma) aparece em
     `saldoPendenteCentavos` ou `saldoDisponivelCentavos` dependendo da forma de pagamento
     (cartão fica retido 48h por antifraude; PIX não).
2. Listar `GET /medicos/me/repasses` e confirmar que o repasse do pagamento de teste aparece
   (campo `cicloRepasse` pode ser `null` até o fechamento do ciclo semanal — isso é esperado).
3. Testar repasse imediato (se PIX, sem retenção):
   - `POST /medicos/me/repasses/imediato` → esperado `201` com o repasse processado.
   - Se cartão dentro da janela de 48h → esperado `400` com mensagem de retenção e
     `previsaoLiberacao`; o app deve exibir essa data ao médico, não um erro genérico.
4. Confirmar tela de histórico exibe corretamente os status possíveis de um ciclo:
   `PENDENTE` / `PROCESSANDO` / `CONCLUIDO` / `ERRO`.

## Observações importantes para quem for implementar/testar no app

- **Sem cartão salvo por enquanto**: o ASAAS não tem endpoint equivalente ao "Customers & Cards"
  do Mercado Pago. Se o app tinha tela de "cartões salvos", ela deve ser desativada ou avisar que
  está temporariamente indisponível — o backend retorna `501` para essas operações.
- **Tokenização de cartão é client-side**: o app deve chamar a tokenização do ASAAS diretamente
  (`POST /v3/creditCard/tokenizeCreditCard`) com a chave pública, nunca usar a `access_token` do
  servidor no app.
- **CPF deve ser coletado no cadastro do paciente**: hoje o campo é opcional no backend/DB, mas
  é obrigatório na prática para pagar. Recomenda-se tornar o campo obrigatório na tela de perfil
  do paciente antes de habilitar o botão de pagamento, evitando o erro 422 tardio.

## Critério de veredito

- ✅ **Funciona**: passos 1 (itens 1–4) e 3 (itens 1–2) completam sem erro inesperado.
- ⚠️ **Funciona parcialmente**: cartão (passo 1.5) ou repasse imediato (passo 3.3) falham, mas o
  fluxo básico PIX + repasse semanal funciona — registrar como pendência, não como bloqueio total.
- ❌ **Não funciona**: pagamento PIX básico ou saldo/repasse não refletem corretamente — sinalizar
  ao backend antes de prosseguir (ver `docs/plans/2026-07-30-passo-validacao-asaas-backend.md`).

## Como registrar o resultado

Atualizar este arquivo com uma seção "Última execução" (data, ambiente testado, resultado) ou
reportar no canal/issue do time. Não é necessário duplicar este checklist a cada rodada.

---

## Última execução

**Data:** 2026-07-30
**Ambiente testado:** revisão estática de código + testes automatizados (Vitest) contra mocks —
**não** foi possível executar contra um backend/sandbox ASAAS real neste ambiente (sem acesso à
rede/credenciais). Os itens que dependem de confirmação humana no painel sandbox do ASAAS (passo
1.3) ou de um backend real rodando (`PAYMENT_GATEWAY=asaas`) permanecem **pendentes de execução
real** — ver seção "Pendências para a próxima rodada" abaixo.

**Resultado:** ⚠️ **Funciona parcialmente** (validação de código + testes; execução ponta a ponta
contra o Asaas real ainda pendente).

### O que foi confirmado por leitura de código + testes automatizados

- `POST /v1/pagamentos/pix` → exibe QR code/copia-e-cola/ticketUrl; polling via
  `GET /v1/pagamentos/sync/:consultaId` já reconhece `PAGO` e navega para o dashboard
  ([src/pages/Payment.tsx](../../src/pages/Payment.tsx), testes em
  [src/pages/Payment.test.tsx](../../src/pages/Payment.test.tsx)).
- Checkout de cartão via `asaas.invoiceUrl`/`checkoutUrl` (redirect hospedado) já normalizado em
  [src/services/api.ts](../../src/services/api.ts) (`normalizePagamentoResponse`).
- `GET /medicos/me/saldo`, `GET /medicos/me/repasses` e `POST /medicos/me/repasses/imediato` já
  implementados e cobertos por testes em
  [src/pages/Earnings.test.tsx](../../src/pages/Earnings.test.tsx); histórico já cobre os 4
  status (`PENDENTE`/`PROCESSANDO`/`CONCLUIDO`/`ERRO`) via `RepasseStatusBadge`.

### Gaps encontrados na tabela de erros (seção 2) e já corrigidos nesta sessão

| Situação | Antes | Depois |
|---|---|---|
| Paciente sem CPF (`422`) | Caía no erro genérico, expondo texto técnico da API | Mensagem amigável + botão "Completar cadastro" (`/profile`); checagem **proativa** via `getUser()` já desabilita o botão de pagar antes mesmo de tentar, evitando o 422 tardio |
| Consulta já paga (`409`) | Caía no erro genérico | Mensagem "Esta consulta já foi paga" + botão "Voltar ao painel" |
| Consulta de outro paciente (`403`) | Só existia tratamento de 403 para "consulta não concluída"; um 403 de acesso negado também caía nesse fluxo | Tela inteira bloqueada (sem opção de pagamento), com mensagem de acesso negado e botão "Voltar ao painel"; também tratado na checagem inicial (`GET /pagamentos/sync/:consultaId`) |
| Repasse imediato bloqueado por retenção antifraude (`400` + `previsaoLiberacao`) | Mensagem genérica de erro | Mensagem específica exibindo a data de liberação prevista |
| Cartão recusado / erro de rede (`502`) | Já tratado via mensagem genérica + retry (fluxo permite tentar novamente) | Sem alteração — já atendia ao requisito |

Arquivos alterados: [src/pages/Payment.tsx](../../src/pages/Payment.tsx),
[src/pages/Earnings.tsx](../../src/pages/Earnings.tsx); testes atualizados em
[src/pages/Payment.test.tsx](../../src/pages/Payment.test.tsx) e
[src/pages/Earnings.test.tsx](../../src/pages/Earnings.test.tsx).

### Observações importantes — ações tomadas

- **Cartão salvo desativado**: removida a UI de "cartão salvo" (que era 100% local/mock, sem
  chamada real ao backend) de [src/pages/Payment.tsx](../../src/pages/Payment.tsx) e
  [src/pages/BankDetails.tsx](../../src/pages/BankDetails.tsx). A tela de "Métodos de pagamento"
  do paciente agora só informa que Pix é o método recomendado e que cartão salvo está
  temporariamente indisponível.
- **Tokenização client-side (`tokenizeCreditCard`)**: fora do escopo desta rodada (o app usa hoje
  o checkout hospedado via `invoiceUrl`/`checkoutUrl`, não a tokenização direta) — mantido como
  pendência de decisão de produto, não como bug.
- **CPF obrigatório no cadastro do paciente**: implementada apenas a checagem proativa na tela de
  pagamento (bloqueia o botão de pagar e direciona para o perfil). Tornar o campo obrigatório no
  formulário de cadastro (Signup) ou de perfil continua sendo uma recomendação em aberto, não
  implementada nesta rodada (evitar mudança de validação de cadastro fora do escopo pedido).

### Pendências para a próxima rodada (requerem backend/sandbox real)

- [ ] Confirmar contra o Asaas sandbox real os nomes de campo assumidos em
  `normalizePagamentoResponse` (`asaas.invoiceUrl`/`checkoutUrl`, contrato de PIX).
- [ ] Confirmar formato real do erro 422 de CPF ausente (`erro` contém "cpf"? outro campo?) —
  `isCpfObrigatorioError` em `Payment.tsx` depende do texto da mensagem.
- [ ] Confirmar formato real do erro 400 de retenção antifraude (`previsaoLiberacao` no body?).
- [ ] Rodar o passo 1 (itens 1–5) e passo 3 (itens 1–4) contra o backend com
  `PAYMENT_GATEWAY=asaas` e `ASAAS_MODE=test`.
- [ ] Confirmar mensagem real do backend para consulta já paga (`409`) e acesso negado (`403`) —
  hoje o app distingue "consulta não concluída" de "acesso negado" apenas pelo texto da mensagem
  (heurística em `isConsultaNaoConcluidaError`); se o backend não incluir palavras como
  "conclu"/"finaliz", o app tratará incorretamente como acesso negado.
