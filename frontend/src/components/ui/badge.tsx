import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-lg shadow-primary/25",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25",
        success:
          "border-transparent bg-success text-success-foreground shadow-lg shadow-success/25",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow-lg shadow-warning/25",
        outline: "border border-border text-foreground",
        queued: "bg-secondary text-muted-foreground border border-border",
        running:
          "bg-primary/20 text-primary-400 border border-primary/30 animate-pulse",
        completed: "bg-success/20 text-green-400 border border-success/30",
        failed: "bg-destructive/20 text-red-400 border border-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
