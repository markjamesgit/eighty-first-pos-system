import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-stone-200 bg-stone-100 text-stone-800",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        good: "border-emerald-200 bg-emerald-50 text-emerald-700",
        info: "border-sky-200 bg-sky-50 text-sky-700",
        informational: "border-sky-200 bg-sky-50 text-sky-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
        destructive: "border-red-200 bg-red-50 text-red-700",
        secondary: "border-stone-800 bg-stone-900 text-stone-50",
        outline: "text-stone-950 border-stone-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
