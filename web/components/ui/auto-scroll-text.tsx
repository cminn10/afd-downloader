import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AutoScrollTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string;
}

export function AutoScrollText({ children, className, ...props }: AutoScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const checkScroll = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;
        
        if (textWidth > containerWidth) {
          setShouldScroll(true);
          setScrollOffset(containerWidth - textWidth);
        } else {
          setShouldScroll(false);
          setScrollOffset(0);
        }
      }
    };

    checkScroll();
    // Small delay to ensure fonts/layout are settled
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener("resize", checkScroll);
    
    return () => {
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden whitespace-nowrap w-full", className)}
      {...props}
    >
      <div
        ref={textRef}
        className="inline-block"
        style={
          shouldScroll
            ? ({
                "--scroll-offset": `${scrollOffset}px`,
                animation: "scroll-horizontal 8s ease-in-out infinite",
              } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

