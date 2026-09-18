export default function PaymentPlaceholder() {
  return (
    <section aria-labelledby="pagamento-heading">
      <h2 id="pagamento-heading" className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Pagamento
      </h2>
      <p className="mt-3 font-sans text-sm text-ink-soft">Pix ou cartão de crédito</p>

      <div
        id="payment-brick-slot"
        className="mt-8 min-h-[12rem] rounded-xl border border-rule bg-paper-strong px-6 py-10 text-center md:px-8"
      >
        <p className="mx-auto max-w-sm font-display text-lg leading-snug text-ink italic">
          Os meios de pagamento serão exibidos aqui na próxima etapa.
        </p>
      </div>

      <p className="mt-5 font-sans text-xs leading-relaxed text-ink-soft">
        Pagamento seguro processado pelo Mercado Pago
      </p>
    </section>
  );
}
