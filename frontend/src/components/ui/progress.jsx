import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "../../lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        className={cn(
            "relative h-3 w-full overflow-hidden rounded-full bg-white/5 backdrop-blur-sm border border-white/[0.06]",
            className
        )}
        {...props}>
        <ProgressPrimitive.Indicator
            className="h-full w-full flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
