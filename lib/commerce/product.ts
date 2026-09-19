/**
 * Dados editoriais da UI. Preço, desconto, frete e totais NÃO vivem aqui:
 * a fonte de verdade é o servidor (`products`, `commerce_settings`).
 */
import { DIGITAL_SKU, PHYSICAL_QUANTITY, PHYSICAL_SKU } from "@/lib/commerce/selection";

export const PHYSICAL_BOOK = {
  sku: PHYSICAL_SKU,
  title: "A Vida é um Dia",
  author: "Robson Santiago",
  format: "Livro físico",
  coverSrc: "/images/books/a-vida-e-um-dia.png",
  coverAlt: "Capa do livro A Vida é um Dia, de Robson Santiago",
  minQuantity: PHYSICAL_QUANTITY.min,
  maxQuantity: PHYSICAL_QUANTITY.max,
} as const;

export const DIGITAL_BOOK = {
  sku: DIGITAL_SKU,
  title: "A Vida é um Dia — E-book",
  format: "E-book",
} as const;
