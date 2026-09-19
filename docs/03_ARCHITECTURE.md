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

Aprovado nesta fase (catálogo, cotação e estrutura de pedidos; sem pagamento ativo):

- Supabase / PostgreSQL para catálogo, configuração de frete/bump e pedidos;
- cliente server-side com `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (`lib/supabase/server.ts`); essas variáveis são somente servidor e não usam prefixo `NEXT_PUBLIC_`;
- Route Handlers `GET /api/products/[sku]`, `POST /api/checkout/quote` e `POST /api/orders`.

Ainda **não** fazem parte da arquitetura em uso:

- Mercado Pago / Payment Brick / webhooks;
- autenticação de admin;
- CMS;
- Resend / e-mail transacional;
- newsletter;
- analytics específico;
- armazenamento ou download do PDF do e-book.

### Comércio

Fonte de verdade de preço, desconto, frete, subtotal e total: **servidor + banco**. O navegador envia só a seleção comercial (`physical` com `ebookBump` | `digital`), dados do comprador e endereço quando a seleção exige envio. Não aceitar `price`, `discount`, `shipping` ou `total` no body.

Seleção comercial:

- `physical`: 1 × a 4 × `AVIDA-FISICO`, com `ebookBump` opcional;
- `digital`: 1 × `AVIDA-EBOOK` avulso.

Não existe combo nem terceiro SKU. A página `/livro` oferece só físico e e-book.

Preços oficiais (centavos inteiros):

- `AVIDA-FISICO`: `3990` (`R$ 39,90`);
- `AVIDA-EBOOK` avulso: `1990` (`R$ 19,90`);
- order bump (1 e-book junto de um pedido físico): preço efetivo `1000` (`R$ 10,00`). O item permanece com preço de lista `1990`; o desconto `990` fica em `orders.discount_cents`.
- o bump **não** se multiplica pela quantidade de livros físicos: sempre 1 e-book e desconto `990`.

Frete: tabela `commerce_shipping_rates` com valor por quantidade física (`1 → 1500`, `2 → 2000`, `3 → 2500`, `4 → 3000`). A cotação lê a faixa correspondente no servidor; não usar fórmula no código. Pedido só digital: `shipping_cents = 0` e `shipping_method = NULL`. Pedido físico (com ou sem bump): `shipping_method = flat_rate`. O preço promocional do bump fica em `commerce_settings.ebook_bump_price_cents = 1000`.

A cotação (`calculateOrderQuote` / `POST /api/checkout/quote`) monta os itens reais, calcula subtotal, desconto, frete e total, e devolve `purchasable` conforme `is_active`. Produtos permanecem **inativos** nesta fase (`purchasable = false`).

`orders.promotion_code = AVIDA-EBOOK-BUMP` identifica o desconto do order bump. Sem bump, o campo é `NULL`. Em pedido físico + bump, `order_items` tem os dois produtos reais com snapshot do preço de lista.

Endereço: obrigatório para físico (com ou sem bump); não exigido para e-book avulso. Essa regra é derivada da seleção no servidor, não de um boolean enviado pelo cliente.

Criação de pedido: `POST /api/orders` recusa persistência enquanto o catálogo estiver inativo. Quando ativo, `create_commerce_order` (RPC transacional) insere `orders`, `order_items` e o evento `order_created` de uma vez. Sem dados de cartão. Sem conceder execute a `anon`/`authenticated`.

`lib/commerce/product.ts` guarda só dados editoriais da UI (título, capa, limites de quantidade). Dinheiro não.

Status independentes em `orders`:

- `payment_status`: `pending` | `approved` | `rejected` | `cancelled` | `refunded`
- `fulfillment_status`: `pending` | `preparing` | `shipped` | `delivered` | `cancelled`

Pagamento aprovado + envio em preparação: `payment_status = approved` e `fulfillment_status = preparing`. Pagamento **não** vira `shipped`.

Tentativas de pagamento ficam em `payments` (histórico). Eventos em `order_events`. Nenhum campo de cartão (PAN, CVV, validade, token PCI).

RLS está ligado nas tabelas comerciais **sem** políticas para `anon`/`authenticated`. O App Router acessa o banco só com `SUPABASE_SECRET_KEY` no servidor. Catálogo público, quando existir, passa pela nossa API — não por SELECT anônimo no Supabase.

Checkout visual em `/livro/comprar?opcao=fisico|ebook`. Order bump do e-book aparece só no checkout físico. O botão final permanece desabilitado. Mercado Pago ainda inexistente.

PDF do e-book: o arquivo existe fora do repositório. Posteriormente será associado a `AVIDA-EBOOK` em bucket privado do Supabase Storage, com download só após `payment_status = approved` via URL assinada temporária. Nenhum caminho de arquivo é persistido nesta fase.

A migration em `supabase/migrations/` precisa ser aplicada manualmente no projeto Supabase. Não assume ambiente já provisionado. Não editar a migration já aplicada; novas mudanças entram em arquivos novos.

CPF: persistir 11 dígitos, sem máscara. Validação atual é de formato/tamanho, não do dígito verificador.

## Imagens

Preferir `next/image` quando adequado.

Não usar imagens fictícias como se fossem fotografias reais de Robson ou de seus projetos no produto final.

## SEO

Quando as páginas forem implementadas, utilizar Metadata API do Next.js e estrutura semântica adequada. Não inventar descrições biográficas ou dados estruturados não confirmados.
