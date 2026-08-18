# Arquitetura Técnica

## Stack base

O projeto foi iniciado com `create-next-app`.

Stack aprovada atualmente:

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- ESLint

Usar as versões já presentes no `package.json` como fonte técnica atual.

## Princípios

- simplicidade antes de abstração;
- componentes reutilizáveis quando houver reutilização real;
- páginas e seções legíveis;
- conteúdo separado da apresentação quando isso facilitar manutenção;
- responsividade desde a implementação inicial;
- acessibilidade e HTML semântico;
- performance e SEO compatíveis com um site editorial.


## Responsividade obrigatória

Toda implementação visual deve nascer responsiva. Responsividade não é uma etapa posterior nem uma correção de acabamento.

Referências mínimas de validação:

- Mobile: aproximadamente 390px
- Tablet: aproximadamente 768px
- Desktop: aproximadamente 1440px

Cada seção deve ser pensada para esses contextos desde sua primeira implementação. O mesmo código deve se adaptar por breakpoints; não criar versões duplicadas de página sem necessidade.

Uma seção NÃO é considerada concluída se funcionar apenas em desktop.

Antes de considerar um escopo visual finalizado, validar pelo menos:

- hierarquia e leitura em mobile;
- ausência de overflow horizontal;
- imagens proporcionais e responsivas;
- espaçamentos adequados;
- textos sem cortes;
- CTAs com área de toque confortável;
- navegação funcional em telas menores;
- reorganização correta de colunas, grids e ordem narrativa.

## Estrutura sugerida

A estrutura pode evoluir conforme necessidade aprovada. Direção inicial:

```text
app/
components/
  layout/
  sections/
  ui/
data/
public/
docs/
```

### `app/`

Rotas, layouts, metadata e páginas do App Router.

### `components/layout/`

Elementos estruturais compartilhados, como Header e Footer.

### `components/sections/`

Seções maiores de páginas, especialmente da Home.

Possíveis componentes futuros:

- Hero
- AboutPreview
- FeaturedBook
- ContentProjects
- Reflections
- SocialProject
- FollowSection

Os nomes são orientativos e podem ser ajustados no plano antes da implementação.

### `components/ui/`

Elementos realmente reutilizáveis. Não criar uma biblioteca interna de UI sem necessidade.

### `data/`

Conteúdo estruturado que não precisa ficar hardcoded em componentes, por exemplo:

- navegação;
- links sociais;
- projetos;
- livros;

Não mover conteúdo para `data/` apenas por abstração estética.

### `public/`

Imagens, capas, fotografias e assets públicos.

Usar nomes claros e organização simples.

## Rotas previstas

A definir progressivamente. Direção conceitual:

- `/`
- `/sobre`
- `/livros`
- `/livros/a-vida-e-um-dia`
- `/conteudos`
- `/reflexoes`
- `/reflexoes/[slug]`
- `/projetos`
- `/contato`

Não criar todas antecipadamente. Implementar conforme aprovação.

## Integrações

Neste momento NÃO fazem parte da arquitetura aprovada:

- Supabase;
- banco de dados;
- autenticação;
- CMS;
- pagamentos próprios;
- newsletter;
- analytics específico;
- automações externas.

Cada integração futura exige análise e aprovação separada.

## Imagens

Preferir `next/image` quando adequado.

Não usar imagens fictícias como se fossem fotografias reais de Robson ou de seus projetos no produto final.

## SEO

Quando as páginas forem implementadas, utilizar Metadata API do Next.js e estrutura semântica adequada. Não inventar descrições biográficas ou dados estruturados não confirmados.
