---
title: Pendencias Somente Usuario - Passo a Passo
type: plan
status: draft
confidence: 0.65
owner: produto
related:
  - duvidas-abertas.md
  - divergencias.md
  - ../../GO-LIVE-CHECKLIST.md
tags: [pendencias-humanas, go-live, decisoes]
last_updated: 2026-06-18
---

<!-- ai-summary
System: checklist objetivo do que depende de decisao humana, credenciais reais ou aprovacao legal.
Flow: validar contexto -> decidir -> preencher dados/infra -> confirmar no sistema.
Owner: produto/operacao/juridico.
Systems: login social, push notifications, legal, deploy.
Status: draft.
-->

# Pendencias Somente Usuario - Passo a Passo

Este documento lista apenas itens que nao posso fechar sozinho por envolver decisao de negocio, credenciais, aprovacao juridica ou acesso de conta externa.

## Status atual (2026-06-18)

O ciclo de codigo foi executado ate o limite do que e implementavel sem entrada humana.
Nova entrega no front: medico agora pode definir o valor da consulta no perfil, e o agendamento exibe esse valor para o paciente.
Proximo passo depende de decisoes de negocio e operacao abaixo.

---

## 0) Definir regra oficial de preco da consulta (novo)

A funcionalidade de editar valor ja esta no front. Falta decidir as regras de negocio oficiais para evitar inconsistencias entre operacao, financeiro e suporte.

1. Definir faixa permitida por consulta:
   - valor minimo em reais (ex: R$ 30,00)
   - valor maximo em reais (ex: R$ 1.500,00)
2. Definir granularidade de preco:
   - permite qualquer centavo
   - ou arredonda para multiplos (ex: R$ 5,00)
3. Definir politica para medicos sem preco definido:
   - bloquear agendamento
   - ou manter "A combinar" como esta hoje
4. Definir se medico com CRM pendente/rejeitado pode alterar preco ou nao.
5. Confirmar com backend/financeiro se existe teto por convenio/plano que precise ser aplicado no servidor.
6. Registrar decisao final em docs/plans/duvidas-abertas.md para virar regra de produto.

---

## 1) Ativar login Google em producao (bloqueador de go-live)

O botao Google JA esta implementado no LoginScreen.
O que falta fazer:

1. Acessar console.cloud.google.com com sua conta Google.
2. Criar ou selecionar um projeto OAuth.
3. Em "Credenciais" -> "Criar credenciais" -> "ID de cliente OAuth 2.0" -> Tipo: Aplicativo da Web.
4. Adicionar em "Origens JavaScript autorizadas":
   - https://seudominio.com.br
   - http://localhost:3000 (dev)
5. Copiar o "ID de cliente" (formato: xxxx.apps.googleusercontent.com).
6. Definir a variavel de ambiente `VITE_GOOGLE_CLIENT_ID=seu-client-id` em producao.
7. Validar fluxo completo: login Google -> redirecionamento correto -> perfil MEDICO bloqueado com mensagem.

## 2) Confirmar contrato de push para web PWA

A logica de push ja esta implementada com fallback gracioso.
O que falta confirmar com o backend:

1. Verificar se a API /usuarios/me/push-token aceita campo plataforma='WEB' ou 'WEB_PWA'.
2. Se aceitar: informar o valor exato para que registerPushToken seja ajustado.
3. Se nao aceitar push web:
   - Definir se o app deve ocultar o toggle push em navegadores desktop/web.
   - Ou manter como esta (toggle visivel, registro nao entregue no servidor, sem erro para o usuario).
4. Se quiser notificacoes push web funcionando de ponta a ponta, definir chave VAPID:
   - Gerar par de chaves VAPID (web-push generate-vapid-keys ou similar).
   - Configurar VITE_VAPID_PUBLIC_KEY no ambiente de producao.
   - Configurar chave privada no backend.

## 3) Preencher dados legais obrigatorios

1. Abrir src/config/legal.ts.
2. Substituir TODOS os placeholders por dados oficiais:
   - LEGAL_EFFECTIVE_DATE: data de vigencia (ex: '01/07/2026')
   - razaoSocial: razao social da empresa
   - cnpj: CNPJ registrado
   - endereco: endereco completo
   - contatoPrivacidade: email oficial de privacidade
   - dpo: nome e contato do DPO (se houver, obrigatorio LGPD acima de certos criterios)
   - foro: comarca/cidade onde serao resolvidas disputas
   - canalTitular: canal oficial para requisicoes de titulares de dados
   - prazoResposta: SLA para resposta (ex: '15 dias uteis')
3. Validar o texto completo das paginas TermsOfUse.tsx, PrivacyPolicy.tsx e Lgpd.tsx com juridico.
4. Marcar duvida 3 em docs/plans/duvidas-abertas.md como resolvida.

## 4) Executar deploy real com credenciais e ambiente de producao

1. Iniciar o Docker Desktop antes de executar o comando de deploy.
2. Configurar variaveis de ambiente de producao:
   - VITE_API_URL=https://seu-backend.com
   - VITE_MOCK=false
   - VITE_GOOGLE_CLIENT_ID=seu-client-id
   - VITE_VAPID_PUBLIC_KEY=sua-chave-vapid (se push web ativo)
3. Executar: docker compose up -d --build
4. Ou publicar artefato da pasta dist/ no seu hosting/CDN.
5. Atualizar DNS/CNAME para o dominio final.
6. Executar smoke checks de go-live (GO-LIVE-CHECKLIST.md secao 6):
   - login email/senha
   - login Google
   - listagem de medicos aprovados
   - agendamento
   - geracao de PIX e confirmacao de status
   - retorno de checkout cartao
7. Registrar GO ou NO-GO no GO-LIVE-CHECKLIST.md.

## 5) Proximo ciclo de implementacao

Quando as pendencias acima estiverem resolvidas, me acionar com:
- Decisao de produto tomada para cada item
- Valores de credenciais (apenas informar os nomes das variaveis; nunca compartilhar secrets no chat)
Repetirei o ciclo: ler docs -> implementar -> testar -> documentar -> deploy.
