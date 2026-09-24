import type { OrderTrackingTimelineStep } from "@/lib/order-tracking/types";

function StepIcon({ state }: { state: OrderTrackingTimelineStep["state"] }) {
  if (state === "done") {
    return (
      <span
        className="flex size-8 items-center justify-center rounded-full bg-ink text-paper"
        aria-hidden
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="relative flex size-8 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-ink/35" />
        <span className="size-3 rounded-full bg-ink" />
      </span>
    );
  }

  return (
    <span
      className="flex size-8 items-center justify-center rounded-full border border-rule bg-paper-strong"
      aria-hidden
    >
      <span className="size-1.5 rounded-full bg-ink/25" />
    </span>
  );
}

type TrackingTimelineProps = {
  steps: OrderTrackingTimelineStep[];
  trackingCode: string | null;
  correiosTrackingUrl: string | null;
};

export default function TrackingTimeline({
  steps,
  trackingCode,
  correiosTrackingUrl,
}: TrackingTimelineProps) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const showPostedDetails = step.id === "posted" && Boolean(trackingCode);
        const labelClass =
          step.state === "upcoming"
            ? "text-ink/40"
            : step.state === "current"
              ? "text-ink"
              : "text-ink";

        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast ? (
              <span
                className={`absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 ${
                  step.state === "done" ? "bg-ink" : "bg-rule"
                }`}
                aria-hidden
              />
            ) : null}

            <div className="relative z-10 shrink-0">
              <StepIcon state={step.state} />
            </div>

            <div className={`min-w-0 pt-1.5 ${labelClass}`}>
              <p
                className={`font-sans text-sm leading-snug md:text-[0.95rem] ${
                  step.state === "current" ? "font-medium tracking-tight" : ""
                }`}
              >
                {step.label}
                {step.state === "current" ? (
                  <span className="sr-only"> (etapa atual)</span>
                ) : null}
              </p>

              {step.occurredAt ? (
                <p className="mt-1 font-sans text-xs leading-snug text-ink/45 md:text-[0.8rem]">
                  {step.occurredAt}
                </p>
              ) : null}

              {showPostedDetails ? (
                <div className="mt-3 border border-rule bg-paper-strong px-4 py-3">
                  <p className="font-sans text-[0.65rem] tracking-[0.14em] text-ink/50 uppercase">
                    Entrega pelos Correios
                  </p>
                  <p className="mt-2 font-sans text-xs text-ink/55">Código</p>
                  <p className="mt-0.5 font-mono text-sm tracking-wide text-ink md:text-base">
                    {trackingCode}
                  </p>
                  {correiosTrackingUrl ? (
                    <a
                      href={correiosTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-10 items-center font-sans text-[0.7rem] font-medium tracking-[0.12em] text-ink uppercase underline-offset-4 transition-colors hover:underline"
                    >
                      Acompanhar nos Correios ↗
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
