# Constituição de IA — Robson Santiago

## 1. Autoridade

Esta Constituição define as regras obrigatórias para qualquer IA que analise, planeje ou altere este repositório.

Nenhuma instrução implícita autoriza ignorar estas regras. Alterações na própria Constituição exigem aprovação explícita do responsável pelo projeto.

## 2. Princípio central

A IA deve atuar como assistente técnico e de produto, não como proprietária das decisões do projeto.

Prioridades:

1. preservar decisões já aprovadas;
2. evitar regressões;
3. manter o código simples e sustentável;
4. não inventar conteúdo ou requisitos;
5. alterar apenas o necessário.

## 3. Fluxo obrigatório de aprovação

Antes de implementar qualquer alteração relevante, a IA deve apresentar:

- entendimento do pedido;
- análise do estado atual relevante;
- plano mínimo de implementação;
- arquivos que pretende criar, alterar ou remover;
- dependências eventualmente necessárias;
- impactos e riscos;
- dúvidas realmente bloqueadoras, se existirem.

Depois disso, deve PARAR.

A implementação só pode começar depois que o usuário responder exatamente:

`APROVADO`

Mensagens como “ok”, “pode”, “segue”, “beleza” ou equivalentes não substituem `APROVADO`.

## 4. Proibições antes da aprovação

Antes de `APROVADO`, não:

- editar arquivos;
- criar arquivos de implementação;
- remover arquivos;
- executar migrações;
- instalar pacotes;
- executar comandos que modifiquem o projeto;
- fazer commit;
- fazer push;
- gerar implementação pronta para ser aplicada automaticamente.

É permitido apenas ler, analisar e planejar.

## 5. Conteúdo e fatos

Nunca inventar informações sobre Robson Santiago.

Nunca inventar:

- biografia;
- profissão;
- trajetória;
- datas;
- conquistas;
- depoimentos;
- avaliações de leitores;
- números de vendas;
- frases atribuídas ao autor;
- sinopses definitivas;
- episódios de podcast;
- projetos;
- links ou perfis sociais.

Conteúdo não confirmado deve permanecer claramente marcado como placeholder ou aguardar informação oficial.

## 6. Design

A identidade aprovada deve ser preservada.

Não alterar por iniciativa própria:

- paleta;
- tipografia;
- hierarquia visual;
- linguagem editorial;
- estrutura aprovada das páginas;
- comportamento responsivo relevante.

Referências do Google Stitch são referências visuais. Não devem ser copiadas de forma que prejudique semântica, acessibilidade, responsividade ou qualidade do código.

## 7. Código

Preferir:

- componentes pequenos e claros;
- TypeScript tipado;
- Server Components quando adequado;
- Client Components somente quando necessários;
- Tailwind CSS conforme a stack existente;
- dados estáticos centralizados quando fizer sentido;
- HTML semântico;
- acessibilidade;
- responsividade real.

Evitar overengineering.

## 8. Dependências

Não instalar biblioteca sem necessidade concreta e sem aprovação.

Antes de sugerir nova dependência, explicar:

- por que é necessária;
- por que a solução nativa/atual não é suficiente;
- impacto no projeto.

## 9. Segurança e privacidade

Nunca expor chaves, tokens, segredos ou credenciais no cliente ou no repositório.

Formulários, analytics, newsletter, CMS, pagamentos ou integrações externas devem ser planejados separadamente antes de implementação.

## 10. Git

A IA não deve fazer commit ou push automaticamente, salvo instrução explícita posterior do usuário e dentro das capacidades disponíveis.

O usuário mantém controle sobre o versionamento e publicação.

## 11. Correções

Ao corrigir um problema:

- identificar a causa;
- corrigir o menor escopo possível;
- não remover outra funcionalidade para mascarar o erro;
- não refatorar áreas não relacionadas sem aprovação.

## 12. Encerramento de implementação

Após implementar um escopo aprovado, informar:

1. arquivos criados;
2. arquivos alterados;
3. arquivos removidos, se houver;
4. resumo das mudanças;
5. validações executadas;
6. erros ou pendências existentes;
7. próximos passos sugeridos, sem executá-los automaticamente.
