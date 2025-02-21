import { useState, useEffect, useCallback, MouseEvent } from "react";

import { cn } from "@/lib/utils";

interface ResizablePanelProps {
    children: React.ReactNode;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
}

export const ResizablePanel = ({
    children,
    defaultWidth = 384, // 96 * 4 = w-96 equivalent
    minWidth = 256,
    maxWidth = 640,
    className,
}: ResizablePanelProps) => {
    const [width, setWidth] = useState(defaultWidth);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback(
        (e: globalThis.MouseEvent) => {
            if (!isDragging) return;

            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setWidth(newWidth);
            }
        },
        [isDragging, minWidth, maxWidth]
    );

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="relative flex" style={{ width }}>
            <div
                className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-emerald-800/50 opacity-0 transition-opacity hover:opacity-100"
                onMouseDown={handleMouseDown}
            />
            <div className={cn("h-full w-full", className)}>{children}</div>
        </div>
    );
};
