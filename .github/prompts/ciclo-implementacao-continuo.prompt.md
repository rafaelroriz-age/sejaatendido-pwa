---
description: "Executa o ciclo contínuo de documentação, implementação, teste, ajuste e atualização de docs até sobrar apenas bloqueio do usuário"
name: "Ciclo de implementação contínua"
argument-hint: "Descreva a funcionalidade, backlog ou área do projeto a tratar"
agent: "agent"
---

Execute o ciclo abaixo para a tarefa informada:

1. Leia a documentação relevante antes de alterar o código.
2. Determine a próxima ação mínima e objetiva com base no estado atual do projeto.
3. Codifique a menor mudança que avance a tarefa.
4. Teste a mudança no menor escopo possível.
5. Se o teste falhar, a implementação não estiver aprovada, ou aparecerem novos problemas locais, volte ao início do ciclo: leia a documentação, reavalie a ação e ajuste o código.
6. Quando a mudança estiver aprovada, atualize a documentação afetada.
7. Se houver etapa de deploy no projeto, prepare ou aplique a mudança de deploy e valide o artefato gerado.
8. Passe para a próxima função ou item de backlog e repita o ciclo.
9. Pare apenas quando os itens restantes dependerem de decisão, acesso, segredo, ambiente externo ou informação que só o usuário possa fornecer.

Regras de execução:
- Prefira mudanças pequenas e localizadas.
- Mantenha o foco no item atual até ele ficar aprovado.
- Não avance para um novo item se o anterior ainda tiver falha de teste, documentação desatualizada ou dependência aberta.
- Quando houver bloqueio externo, pare e liste exatamente o que falta do usuário.

Formato de resposta:
- O que foi lido.
- O que foi alterado.
- Quais testes foram executados.
- Quais documentos foram atualizados.
- Quais bloqueios ainda dependem do usuário.
