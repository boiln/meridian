import { useState, useRef, useEffect, useCallback } from "react";

import { ChevronRight, ArrowDown, ArrowUp } from "lucide-react";

import { NetworkManipulation } from "@/components/network-controls";
import { cn } from "@/lib/utils";
import {
    ApplicationProcess,
    SpeedUnit,
    AppNetworkLimit,
    convertSpeed,
    ProcessNetworkConfig,
    DEFAULT_NETWORK_CONFIG,
} from "@/types/network";

interface ProcessItemProps {
    process: ApplicationProcess;
    limit?: AppNetworkLimit;
    onLimitChange?: (limit: AppNetworkLimit) => void;
    onNetworkConfigChange?: (processId: number, config: ProcessNetworkConfig) => void;
    networkConfig?: ProcessNetworkConfig;
    speedUnit: SpeedUnit;
    allProcesses: ApplicationProcess[];
    depth?: number;
    currentFilter: "all" | "active" | "throttled";
}

export function ProcessItem({
    process,
    limit,
    onLimitChange,
    onNetworkConfigChange,
    networkConfig = DEFAULT_NETWORK_CONFIG,
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
        lastLogTime: Date.now(),
    });

    // Debounced logging
    useEffect(() => {
        const now = Date.now();
        if (now - prevValuesRef.current.lastLogTime > 1000) {
            // Only log once per second
            console.log("ProcessItem state:", {
                processId: process.id,
                processName: process.name,
                limit: {
                    enabled: limit?.enabled,
                    downloadValue: limit?.download.value,
                    uploadValue: limit?.upload.value,
                },
                networkConfig: {
                    enabled: networkConfig.lag.enabled,
                    lag: networkConfig.lag.timeMs,
                },
            });
            prevValuesRef.current.lastLogTime = now;
        }
    }, [process.id, limit, networkConfig]);

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
            lastLogTime: prevValuesRef.current.lastLogTime,
        };
    }, [process.network_usage.download.value, process.network_usage.upload.value]);

    const handleNetworkConfigChange = useCallback(
        (config: ProcessNetworkConfig) => {
            console.log("Network Config Change:", {
                processId: process.id,
                config,
            });
            onNetworkConfigChange?.(process.id, config);
        },
        [process.id, onNetworkConfigChange]
    );

    const downloadSpeed = convertSpeed(
        { value: process.network_usage.download.value, unit: process.network_usage.download.unit },
        speedUnit
    );

    const uploadSpeed = convertSpeed(
        { value: process.network_usage.upload.value, unit: process.network_usage.upload.unit },
        speedUnit
    );

    // Remove debug logging
    useEffect(() => {
        if (!limit) return;
    }, [process.id, limit]);

    useEffect(() => {}, [networkConfig]);

    const parentProcess = process.parent_pid
        ? allProcesses.find((p) => p.pid === process.parent_pid)
        : null;

    const childProcesses = allProcesses.filter((p) => p.parent_pid === process.pid);

    const handleExpandClick = (e: React.MouseEvent) => {
        setIsExpanded(!isExpanded);
    };

    const handleControlsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <>
            <tr
                className={cn(
                    "group h-7 cursor-default select-none border-b border-border/20 transition-colors hover:bg-accent/20",
                    isExpanded && "bg-accent/20",
                    isFlashing && "animate-highlight"
                )}
                onClick={handleExpandClick}
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
                            onNetworkConfigChange={onNetworkConfigChange}
                            networkConfig={networkConfig}
                            speedUnit={speedUnit}
                            allProcesses={allProcesses}
                            depth={depth + 1}
                            currentFilter={currentFilter}
                        />
                    ))}
                    {/* Process details */}
                    <tr className="border-b border-border/20 bg-accent/[0.02]">
                        <td colSpan={3} className="px-4 py-3">
                            <div className="ml-6 space-y-4" onClick={handleControlsClick}>
                                <div className="rounded-lg border border-border/50 bg-card p-4">
                                    <h3 className="mb-3 text-sm font-medium">Network Controls</h3>
                                    <div className="space-y-4">
                                        <NetworkManipulation
                                            config={networkConfig}
                                            onChange={handleNetworkConfigChange}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border/50 bg-card p-4">
                                    <h3 className="mb-3 text-sm font-medium">
                                        Process Information
                                    </h3>
                                    <div className="text-xs text-muted-foreground">
                                        <div>{process.path}</div>
                                        <div>PID: {process.pid}</div>
                                        {parentProcess && (
                                            <div>
                                                Parent PID: {process.parent_pid} (
                                                {parentProcess.name})
                                            </div>
                                        )}
                                        {childProcesses.length > 0 && (
                                            <div>Child Processes: {childProcesses.length}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </>
            )}
        </>
    );
}
