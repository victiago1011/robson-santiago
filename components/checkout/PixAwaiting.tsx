"use client";

import { useState } from "react";

type PixAwaitingProps = {
  qrCode: string;
  qrCodeBase64: string | null;
};

export default function PixAwaiting({ qrCode, qrCodeBase64 }: PixAwaitingProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl border border-rule bg-white px-5 py-7 md:px-7 md:py-8">
      <h3 className="font-display text-2xl tracking-tight text-ink">Pagamento via Pix</h3>
      <p className="mt-3 font-sans text-sm text-ink">Aguardando pagamento</p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">
        Escaneie o QR Code ou copie o código Pix. A confirmação ocorre após o pagamento.
      </p>

      {qrCodeBase64 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/jpeg;base64,${qrCodeBase64}`}
          alt="QR Code Pix"
          className="mx-auto mt-6 h-48 w-48 object-contain"
        />
      ) : (
        <p className="mt-6 font-sans text-sm text-ink-soft">Use o código copia e cola abaixo.</p>
      )}

      <button
        type="button"
        onClick={() => void copyCode()}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-rule bg-white px-5 font-sans text-sm font-medium tracking-[0.08em] text-ink uppercase"
      >
        {copied ? "Código copiado" : "Copiar código Pix"}
      </button>
    </div>
  );
}
