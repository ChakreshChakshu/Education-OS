"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef(({ className, value = 0, indicatorClassName, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-muted",
      className
    )}
    {...props}
  >
    <div
      className={cn("h-full w-full flex-1 bg-primary transition-all duration-300", indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
