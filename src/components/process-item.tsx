import { useState, useRef, useEffect } from "react";

import { ChevronRight, ArrowDown, ArrowUp } from "lucide-react";

import { SpeedControl } from "@/components/speed-control";
import { cn } from "@/lib/utils";
import {
    ApplicationProcess,
    NetworkSpeed,
    SpeedUnit,
    AppNetworkLimit,
    convertSpeed,
} from "@/types/network";

interface ProcessItemProps {
    process: ApplicationProcess;
    limit?: AppNetworkLimit;
    onLimitChange?: (limit: AppNetworkLimit) => void;
    speedUnit: SpeedUnit;
    allProcesses: ApplicationProcess[];
    depth?: number;
    currentFilter: "all" | "active" | "throttled";
}

export function ProcessItem({
    process,
    limit,
    onLimitChange,
    speedUnit,
    allProcesses,
    depth = 0,
    currentFilter,
}: ProcessItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const prevValuesRef = useRef({
        download: process.network_usage.download.value,
        upload: process.network_usage.upload.value,
        lastUpdate: Date.now(),
    });

    const hasActiveTraffic =
        (process.network_usage?.download?.value || 0) > 0 ||
        (process.network_usage?.upload?.value || 0) > 0;

    useEffect(() => {
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - prevValuesRef.current.lastUpdate;

        // Prevent too frequent updates
        if (timeSinceLastUpdate < 50) return;

        const currentDownload = process.network_usage.download.value;
        const currentUpload = process.network_usage.upload.value;
        const prevDownload = prevValuesRef.current.download;
        const prevUpload = prevValuesRef.current.upload;

        // Detect any new activity above threshold
        const THRESHOLD = 0.1; // KB/s
        const hasNewActivity =
            (currentDownload > THRESHOLD && currentDownload > prevDownload) ||
            (currentUpload > THRESHOLD && currentUpload > prevUpload);

        if (hasNewActivity) {
            setIsFlashing(true);
            const timer = setTimeout(() => setIsFlashing(false), 600);
            return () => clearTimeout(timer);
        }

        // Update previous values
        prevValuesRef.current = {
            download: currentDownload,
            upload: currentUpload,
            lastUpdate: currentTime,
        };
    }, [process.network_usage.download.value, process.network_usage.upload.value]);

    const currentLimit = limit || {
        processId: process.id,
        enabled: false,
        download: { value: 0, unit: speedUnit },
        upload: { value: 0, unit: speedUnit },
    };

    const downloadSpeed = convertSpeed(
        { value: process.network_usage.download.value, unit: process.network_usage.download.unit },
        speedUnit
    );

    const uploadSpeed = convertSpeed(
        { value: process.network_usage.upload.value, unit: process.network_usage.upload.unit },
        speedUnit
    );

    const handleSpeedChange = (type: "download" | "upload", speed: NetworkSpeed) => {
        if (!onLimitChange) return;
        onLimitChange({
            ...currentLimit,
            [type]: speed,
        });
    };

    const parentProcess = process.parent_pid
        ? allProcesses.find((p) => p.pid === process.parent_pid)
        : null;

    const childProcesses = allProcesses.filter((p) => p.parent_pid === process.pid);

    return (
        <>
            <tr
                className={cn(
                    "group h-7 cursor-default select-none border-b border-border/20 transition-colors hover:bg-accent/20",
                    isExpanded && "bg-accent/20",
                    isFlashing && "animate-highlight"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <td className="px-2">
                    <div className="flex min-w-[300px] items-center gap-1">
                        <div className="flex w-2 items-center justify-center">
                            {hasActiveTraffic && (
                                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            )}
                        </div>
                        <div
                            style={{ marginLeft: `${depth * 20}px` }}
                            className="flex min-w-0 items-center gap-1"
                        >
                            <ChevronRight
                                className={cn(
                                    "h-3 w-3 flex-shrink-0 text-current transition-transform",
                                    isExpanded && "rotate-90",
                                    "invisible"
                                )}
                            />
                            {process.icon && (
                                <img
                                    src={process.icon}
                                    alt={process.name}
                                    className="h-4 w-4 flex-shrink-0"
                                    draggable={false}
                                />
                            )}
                            <span className="truncate text-sm">
                                {process.display_name || process.name}
                            </span>
                        </div>
                    </div>
                </td>
                <td className="px-2">
                    <div className="flex gap-1">
                        <ArrowDown className="h-4 w-4" />
                        <span className="text-sm">
                            {speedUnit === "B/s"
                                ? Math.round(downloadSpeed.value)
                                : downloadSpeed.value.toFixed(2)}{" "}
                            {speedUnit}
                        </span>
                    </div>
                </td>
                <td className="px-2">
                    <div className="flex gap-1">
                        <ArrowUp className="h-4 w-4" />
                        <span className="text-sm">
                            {speedUnit === "B/s"
                                ? Math.round(uploadSpeed.value)
                                : uploadSpeed.value.toFixed(2)}{" "}
                            {speedUnit}
                        </span>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <>
                    {/* Child processes */}
                    {childProcesses.map((childProcess) => (
                        <ProcessItem
                            key={childProcess.id}
                            process={childProcess}
                            limit={limit}
                            onLimitChange={onLimitChange}
                            speedUnit={speedUnit}
                            allProcesses={allProcesses}
                            depth={depth + 1}
                            currentFilter={currentFilter}
                        />
                    ))}
                    {/* Process details */}
                    <tr className="border-b border-border/20 bg-accent/[0.02]">
                        <td colSpan={3} className="px-4 py-3">
                            <div className="ml-6 space-y-4">
                                <div className="flex space-x-4">
                                    <SpeedControl
                                        label="Download"
                                        value={currentLimit.download}
                                        onChange={(speed: NetworkSpeed) =>
                                            handleSpeedChange("download", speed)
                                        }
                                    />
                                    <SpeedControl
                                        label="Upload"
                                        value={currentLimit.upload}
                                        onChange={(speed: NetworkSpeed) =>
                                            handleSpeedChange("upload", speed)
                                        }
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    <div>{process.path}</div>
                                    <div>PID: {process.pid}</div>
                                    {parentProcess && (
                                        <div>
                                            Parent PID: {process.parent_pid} ({parentProcess.name})
                                        </div>
                                    )}
                                    {childProcesses.length > 0 && (
                                        <div>Child Processes: {childProcesses.length}</div>
                                    )}
                                </div>
                            </div>
                        </td>
                    </tr>
                </>
            )}
        </>
    );
}
