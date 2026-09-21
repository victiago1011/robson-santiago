import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

function controlClassName(invalid: boolean): string {
  return [
    "mt-2 w-full min-h-12 rounded-lg border bg-white px-4 font-sans text-base text-ink placeholder:text-ink-soft/55 transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
    invalid
      ? "border-[#8f2d2d] focus-visible:border-[#8f2d2d] focus-visible:ring-[#8f2d2d]/25"
      : "border-rule focus-visible:border-ink focus-visible:ring-ink/20",
  ].join(" ");
}

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="font-sans text-[0.7rem] font-medium tracking-[0.18em] text-ink uppercase">
        {label}
      </label>
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
};

export function InputField({ id, label, hint, error, ...inputProps }: InputFieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, `${id}-error`].filter(Boolean).join(" ");

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={controlClassName(Boolean(error))}
        {...inputProps}
      />
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
