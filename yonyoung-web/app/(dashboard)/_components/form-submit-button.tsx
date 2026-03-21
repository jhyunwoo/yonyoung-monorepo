"use client";

import { type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  idleLabel: string;
  pendingLabel: string;
};

export default function FormSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      className={className}
      disabled={isDisabled}
      aria-busy={pending}
      data-testid="form-submit"
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        {pending ? (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {pending ? pendingLabel : idleLabel}
      </span>
    </button>
  );
}
