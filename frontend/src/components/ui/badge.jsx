import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-md",
    {
        variants: {
            variant: {
                default:
                    "border-indigo-500/20 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 shadow-sm shadow-indigo-500/10",
                secondary:
                    "border-white/10 bg-white/5 text-secondary-foreground hover:bg-white/10",
                destructive:
                    "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 shadow-sm shadow-red-500/10",
                outline: "text-foreground border-white/10",
                success:
                    "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10",
                warning:
                    "border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-sm shadow-amber-500/10",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({
    className,
    variant,
    ...props
}) {
    return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
