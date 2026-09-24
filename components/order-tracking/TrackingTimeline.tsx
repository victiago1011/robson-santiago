import type { TimelineStepState } from "@/lib/order-tracking/types";

function StepIcon({ state }: { state: TimelineStepState }) {
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
  steps: Array<{ id: string; label: string; state: TimelineStepState }>;
  trackingCode: string | null;
};

export default function TrackingTimeline({ steps, trackingCode }: TrackingTimelineProps) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const showTracking = step.id === "posted" && Boolean(trackingCode);
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

              {showTracking ? (
                <div className="mt-3 border border-rule bg-paper-strong px-4 py-3">
                  <p className="font-sans text-[0.65rem] tracking-[0.14em] text-ink/50 uppercase">
                    Código de rastreio
                  </p>
                  <p className="mt-1 font-mono text-sm tracking-wide text-ink md:text-base">
                    {trackingCode}
                  </p>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
