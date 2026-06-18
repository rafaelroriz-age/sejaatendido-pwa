# Prompt para integrar o backend ao PIX de teste com teto de R$ 1,50

Você é o responsável por ajustar o backend do Seja Atendido para que o checkout PIX gere um QR code com valor real, dinâmico e compatível com a consulta selecionada no frontend.

## Objetivo

Garantir que o fluxo de pagamento PIX nunca volte com valor fixo de R$ 150,00. Para os cenários de teste, o QR code deve ser gerado com valor máximo de R$ 1,50, idealmente usando uma consulta de teste com valor entre R$ 0,10 e R$ 1,50.

## Contexto do frontend

O frontend já chama `POST /v1/pagamentos/pix` com:

```json
{
  "consultaId": "...",
  "valorCentavos": 10
}
```

O campo `valorCentavos` pode vir preenchido. Se vier, ele deve ser respeitado. Se não vier, o backend deve buscar o valor da consulta pelo `consultaId`.

## Requisitos funcionais

1. O backend deve gerar PIX dinâmico com valor exato em centavos.
2. O valor do QR code e do copia e cola deve refletir o mesmo valor da consulta.
3. Para o ambiente de teste, o valor deve ficar em no máximo 150 centavos.
4. Nunca retornar um QR code de valor fixo de R$ 150,00 para esse fluxo de teste.
5. A resposta do endpoint deve continuar compatível com o frontend:

```json
{
  "pagamento": {
    "id": "...",
    "consultaId": "...",
    "valor": 10,
    "status": "PENDENTE",
    "metodo": "PIX",
    "criadoEm": "..."
  },
  "pix": {
    "qrCode": "...",
    "qrCodeBase64": "...",
    "ticketUrl": "...",
    "validade": "..."
  }
}
```

## Regras de negócio desejadas

1. Se `valorCentavos` for enviado e for maior que zero, use esse valor como fonte principal.
2. Se `valorCentavos` não vier, recupere o valor da consulta por `consultaId`.
3. Se o valor final for maior que 150 centavos em ambiente de QA, recuse a geração com mensagem clara.
4. O payload do QR code deve embutir o valor correto, sem substituição por valor padrão.
5. O status do pagamento deve continuar sendo reconciliado por `syncPagamento`.

## Critério de aceitação

- Ao gerar um PIX de teste, o usuário vê um QR code que paga exatamente entre R$ 0,10 e R$ 1,50.
- O mesmo pagamento não pode voltar com R$ 150,00 ou qualquer valor fixo fora da consulta.
- O frontend consegue copiar o código PIX e concluir o polling normalmente.

## Observação importante

Se o provedor de pagamento exigir um campo específico para o valor do pedido, adapte o contrato do endpoint para preencher esse campo com o valor da consulta em centavos. O objetivo é que o QR code gerado seja realmente cobrável nesse valor, e não apenas um texto visual com valor exibido na tela.