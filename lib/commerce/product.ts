/**
 * Dados editoriais do livro físico para a UI.
 * Preço, disponibilidade e demais regras comerciais NÃO vivem aqui:
 * a fonte de verdade é o banco (`products`), lida somente no servidor.
 */
export const PHYSICAL_BOOK = {
  sku: "AVIDA-FISICO",
  title: "A Vida é um Dia",
  author: "Robson Santiago",
  format: "Livro físico",
  coverSrc: "/images/books/a-vida-e-um-dia.png",
  coverAlt: "Capa do livro A Vida é um Dia, de Robson Santiago",
  minQuantity: 1,
  maxQuantity: 5,
} as const;
