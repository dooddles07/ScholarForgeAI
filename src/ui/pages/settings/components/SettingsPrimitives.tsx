import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ReactNode } from 'react';

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <div className="mt-3 divide-y divide-line rounded-md border border-line">{children}</div>
    </section>
  );
}

export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-base text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-sm text-fg-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-line transition-colors duration-[--duration-fast] data-[state=checked]:bg-accent"
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-white transition-transform duration-[--duration-fast] data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  );
}
