import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-50",
          size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
          variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
          variant === "secondary" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          variant === "ghost" && "text-slate-600 hover:bg-brand-50",
          variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium text-slate-700", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur", className)}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800", className)}
      {...props}
    />
  );
}
