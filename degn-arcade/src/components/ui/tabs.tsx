"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-muted",
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted transition",
        "data-[state=active]:bg-neon/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(147,51,234,0.3)]",
        "data-[state=inactive]:hover:text-white data-[state=inactive]:hover:shadow-[0_0_8px_rgba(147,51,234,0.15)]",
        className
      )}
      {...props}
    />
  )
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef<ElementRef<typeof TabsPrimitive.Content>, ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn("mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/40", className)}
      {...props}
    />
  )
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
