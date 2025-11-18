"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_25px_oklch(0.75_0.22_220_/_0.35)] hover:shadow-[0_0_35px_oklch(0.75_0.22_220_/_0.5)] hover:opacity-90",
        ghost: "border border-border/30 bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground",
        outline: "border border-border/30 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
        subtle: "bg-muted/20 text-foreground/80 hover:bg-muted/30",
        icon: "bg-transparent text-muted-foreground hover:text-foreground"
      },
      size: {
        default: "px-5 py-2 gap-2",
        sm: "px-4 py-1.5 gap-2 text-xs",
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
