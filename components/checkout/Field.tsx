import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

function controlClassName(invalid: boolean): string {
  return [
    "mt-2 w-full min-h-12 rounded-lg border bg-white px-4 font-sans text-base text-ink placeholder:text-ink-soft/55 transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
    invalid
      ? "border-[#8f2d2d] focus-visible:border-[#8f2d2d] focus-visible:ring-[#8f2d2d]/25"
      : "border-rule focus-visible:border-ink focus-visible:ring-ink/20",
  ].join(" ");
}

function prefixedControlClassName(invalid: boolean): string {
  return [
    "mt-2 flex min-h-12 w-full items-center gap-3 rounded-lg border bg-white px-4 transition-[border-color,box-shadow] focus-within:ring-2",
    invalid
      ? "border-[#8f2d2d] focus-within:border-[#8f2d2d] focus-within:ring-[#8f2d2d]/25"
      : "border-rule focus-within:border-ink focus-within:ring-ink/20",
  ].join(" ");
}

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: ReactNode;
};

function FieldShell({ id, label, hint, error, counter, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const counterId = counter ? `${id}-count` : undefined;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-sans text-[0.7rem] font-medium tracking-[0.18em] text-ink uppercase">
          {label}
        </label>
        {counter ? (
          <span id={counterId} aria-live="polite" className="font-sans text-xs tabular-nums text-ink-soft">
            {counter}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p id={hintId} className="mt-1.5 font-sans text-xs leading-relaxed text-ink-soft">
          {hint}
        </p>
      ) : null}
      <p
        id={errorId}
        role="alert"
        className={`mt-1.5 min-h-[1.25rem] font-sans text-xs leading-relaxed ${error ? "text-[#8f2d2d]" : "sr-only"}`}
      >
        {error ?? ""}
      </p>
    </div>
  );
}

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  prefix?: string;
  counter?: string;
};

export function InputField({ id, label, hint, error, prefix, counter, ...inputProps }: InputFieldProps) {
  const describedBy = [counter ? `${id}-count` : null, hint ? `${id}-hint` : null, `${id}-error`]
    .filter(Boolean)
    .join(" ");
  const invalid = Boolean(error);

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} counter={counter}>
      {prefix ? (
        <div className={prefixedControlClassName(invalid)}>
          <span className="shrink-0 font-sans text-base text-ink">{prefix}</span>
          <span aria-hidden="true" className="select-none text-ink-soft/45">
            |
          </span>
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink placeholder:text-ink-soft/55 focus-visible:outline-none"
            {...inputProps}
          />
        </div>
      ) : (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClassName(invalid)}
          {...inputProps}
        />
      )}
    </FieldShell>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function SelectField({
  id,
  label,
  hint,
  error,
  children,
  ...selectProps
}: SelectFieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, `${id}-error`].filter(Boolean).join(" ");

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={controlClassName(Boolean(error))}
        {...selectProps}
      >
        {children}
      </select>
    </FieldShell>
  );
}
