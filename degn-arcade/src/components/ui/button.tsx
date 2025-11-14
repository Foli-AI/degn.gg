"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-semibold uppercase tracking-[0.32em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-neon via-aqua to-accent text-white shadow-[0_0_25px_rgba(147,51,234,0.35)] hover:shadow-[0_0_35px_rgba(147,51,234,0.5)]",
        ghost: "border border-white/10 bg-white/5 text-muted hover:border-neon/40 hover:bg-neon/10 hover:text-white",
        outline: "border border-white/15 text-muted hover:border-neon/40 hover:text-white",
        subtle: "bg-black/20 text-white/80 hover:bg-black/30",
        icon: "bg-transparent text-muted hover:text-white"
      },
      size: {
        default: "px-5 py-2 gap-2",
        sm: "px-4 py-1.5 gap-2",
        lg: "px-6 py-3 gap-3",
        icon: "p-2"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
