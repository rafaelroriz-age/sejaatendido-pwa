# MEMORY.md

## Projetos ativos

- sejaatendido-pwa: base textual do Segundo Cerebro criada em 2026-06-16.
- foco atual: consolidar fluxos de autenticacao, agendamento, pagamento e notificacoes.

## Decisoes recentes

- ADR 0001: fallback de endpoints para notificacoes e WhatsApp mantido por compatibilidade.
- Documentacao antiga reconciliada com codigo; conflitos registrados em docs/plans/divergencias.md.

## Aprendizados

- O codigo atual usa /v1 para pagamentos e polling por syncPagamento no fluxo principal.
- Fallbacks de endpoint reduzem quebra imediata, mas escondem divergencias de contrato se nao houver governanca.
- Quantidade fixa de slots em texto de marketing pode divergir da logica real (slots dinamicos/fallback).

## Regras inviolaveis

- Nunca commitar segredos/chaves reais em repositorio.
- Nao habilitar VITE_MOCK=true em producao.
- Sempre registrar divergencias doc x codigo antes de atualizar documentos para validated.

## Pendencias de acompanhamento

- Definir destino do login Google (reativar UI ou remover exigencia de checklist).
- Validar estrategia unica de service worker/push web.
- Decidir se paginas de retorno de pagamento devem executar syncPagamento automaticamente.
- Completar dados legais reais em src/config/legal.ts.
