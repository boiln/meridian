import { useState, useEffect, useMemo } from "react";

import { invoke } from "@tauri-apps/api/core";

import {
    ApplicationProcess,
    ProcessStatus,
    NetworkSpeed,
    BYTES_PER_KB,
    BYTES_PER_MB,
    BYTES_PER_GB,
} from "@/types/network";
import { initializeCache, loadProcessCache } from "@/utils/cache";

export type ProcessFilter = "All" | "Online" | "Offline";

export interface ProcessStatistics {
    totalDownload: string;
    totalUpload: string;
    activeConnections: number;
}

const fetchProcesses = async (): Promise<ApplicationProcess[]> => {
    try {
        const result = await invoke<ApplicationProcess[]>("get_processes");

        // Validate the data structure
        if (!Array.isArray(result)) {
            console.error("[Icon] Invalid response format: expected array", result);
            return [];
        }

        // Ensure each process has valid network usage data and icon
        const validatedResult = result.map((process) => {
            // Validate icon data
            if (process.icon) {
                if (
                    !process.icon.startsWith("data:image/png;base64,") &&
                    !process.icon.startsWith("data:image/jpeg;base64,")
                ) {
                    console.error(
                        "[Icon] Invalid icon format for process:",
                        process.name,
                        process.pid
                    );
                    process.icon = null;
                }
            }

            // Ensure network_usage has valid values
            const network_usage = {
                download: {
                    value: process.network_usage?.download?.value || 0,
                    unit: process.network_usage?.download?.unit || "KB/s",
                },
                upload: {
                    value: process.network_usage?.upload?.value || 0,
                    unit: process.network_usage?.upload?.unit || "KB/s",
                },
            };

            return {
                ...process,
                network_usage,
                status: process.status || ProcessStatus.Offline,
                icon: process.icon,
                display_name: process.display_name || null,
            };
        });

        console.log("Fetched processes:", {
            total: validatedResult.length,
            online: validatedResult.filter((p) => p.status === ProcessStatus.Online).length,
            offline: validatedResult.filter((p) => p.status === ProcessStatus.Offline).length,
            withActivity: validatedResult.filter(
                (p) => p.network_usage.download.value > 0 || p.network_usage.upload.value > 0
            ).length,
        });

        // Log processes with network activity
        const activeProcesses = validatedResult.filter(
            (p) => p.network_usage.download.value > 0 || p.network_usage.upload.value > 0
        );
        if (activeProcesses.length > 0) {
            console.log(
                "Processes with network activity:",
                activeProcesses.map((p) => ({
                    name: p.name,
                    pid: p.pid,
                    status: p.status,
                    download: p.network_usage.download.value,
                    upload: p.network_usage.upload.value,
                }))
            );
        }

        // Process and validate network usage values
        const processedResult = validatedResult.map((process) => {
            // Preserve the original values and units
            const downloadValue = process.network_usage?.download?.value || 0;
            const uploadValue = process.network_usage?.upload?.value || 0;
            const downloadUnit = process.network_usage?.download?.unit || "KB/s";
            const uploadUnit = process.network_usage?.upload?.unit || "KB/s";
            const hasNetworkActivity = downloadValue > 0 || uploadValue > 0;

            // Update process with network activity status
            const updatedProcess = {
                ...process,
                network_usage: {
                    download: {
                        value: downloadValue,
                        unit: downloadUnit,
                    },
                    upload: {
                        value: uploadValue,
                        unit: uploadUnit,
                    },
                },
            };

            // Only update status if there's network activity
            if (hasNetworkActivity) {
                updatedProcess.status = ProcessStatus.Online;
            }

            return updatedProcess;
        });

        return processedResult;
    } catch (error) {
        console.error("[Icon] Error fetching processes:", error);
        return [];
    }
};

export const useProcesses = () => {
    const [processes, setProcesses] = useState<ApplicationProcess[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [throttledProcesses, setThrottledProcesses] = useState<Set<number>>(new Set());
    const [filter, setFilter] = useState<ProcessFilter>("All");
    const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
    const [cacheLoaded, setCacheLoaded] = useState(false);

    // Initialize cache and perform initial scan
    useEffect(() => {
        const initialScan = async () => {
            try {
                await initializeCache();
                const cache = await loadProcessCache();
                if (cache.processes && Object.keys(cache.processes).length > 0) {
                    setProcesses(Object.values(cache.processes));
                }
                setLoading(true);
                setCacheLoaded(true);
            } catch (error) {
                console.error("Failed to initialize:", error);
                setLoading(false);
                setCacheLoaded(true);
            }
        };

        initialScan();
    }, []);

    const refreshProcesses = async () => {
        try {
            const currentTime = Date.now();
            // Reduce minimum refresh interval to 100ms for more responsive updates
            if (currentTime - lastRefreshTime < 100) {
                console.log("Skipping refresh - too soon");
                return;
            }

            setLastRefreshTime(currentTime);

            const systemProcesses = await fetchProcesses();

            if (systemProcesses && systemProcesses.length > 0) {
                setProcesses(systemProcesses);
                setError(null);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch processes";
            console.error("Error in refreshProcesses:", errorMessage);
            setError(errorMessage);
        }
    };

    // Only start the refresh interval after cache is loaded
    useEffect(() => {
        if (!cacheLoaded) return;

        console.log("Setting up process refresh interval");
        refreshProcesses(); // Initial refresh

        // Update every 100ms for more responsive network I/O updates
        const interval = setInterval(refreshProcesses, 100);

        return () => {
            console.log("Cleaning up process refresh interval");
            clearInterval(interval);
        };
    }, [cacheLoaded]);

    const throttleProcess = async (
        pid: number,
        downloadLimit: NetworkSpeed | null,
        uploadLimit: NetworkSpeed | null
    ) => {
        try {
            // Convert NetworkSpeed to bytes per second
            const downloadBytes = downloadLimit ? convertSpeedToBytes(downloadLimit) : 0;
            const uploadBytes = uploadLimit ? convertSpeedToBytes(uploadLimit) : 0;

            await invoke("throttle_process", {
                pid,
                downloadLimit: downloadBytes,
                uploadLimit: uploadBytes,
            });
            setThrottledProcesses((prev) => new Set([...prev, pid]));
        } catch (error) {
            console.error(`Failed to throttle process ${pid}:`, error);
            throw error;
        }
    };

    const convertSpeedToBytes = (speed: NetworkSpeed): number => {
        const value = speed.value;
        switch (speed.unit) {
            case "B/s":
                return value;
            case "KB/s":
                return value * BYTES_PER_KB;
            case "MB/s":
                return value * BYTES_PER_MB;
            case "GB/s":
                return value * BYTES_PER_GB;
            default:
                return value;
        }
    };

    const unthrottleProcess = async (pid: number) => {
        try {
            await invoke("unthrottle_process", { pid });
            setThrottledProcesses((prev) => {
                const newSet = new Set(prev);
                newSet.delete(pid);
                return newSet;
            });
        } catch (error) {
            console.error(`Failed to unthrottle process ${pid}:`, error);
            throw error;
        }
    };

    // Filter processes based on current filter and hidden state
    const filteredProcesses = useMemo(() => {
        return processes.filter((process) => {
            const hasNetworkActivity =
                (process.network_usage?.download?.value || 0) > 0 ||
                (process.network_usage?.upload?.value || 0) > 0;

            // Then apply main filter
            switch (filter) {
                case "Online":
                    return hasNetworkActivity || process.status === ProcessStatus.Online;
                case "Offline":
                    return !hasNetworkActivity && process.status === ProcessStatus.Offline;
                case "All":
                    return true;
            }
        });
    }, [processes, filter]);

    // Calculate statistics
    const statistics = useMemo(() => {
        const stats: ProcessStatistics = {
            totalDownload: "0.00 KB/s",
            totalUpload: "0.00 KB/s",
            activeConnections: 0,
        };

        let totalDownload = 0;
        let totalUpload = 0;

        processes.forEach((process) => {
            const downloadValue = Number(process.network_usage?.download?.value) || 0;
            const uploadValue = Number(process.network_usage?.upload?.value) || 0;

            if (downloadValue > 0 || uploadValue > 0) {
                stats.activeConnections++;
                totalDownload += downloadValue;
                totalUpload += uploadValue;
            }
        });

        stats.totalDownload = `${totalDownload.toFixed(2)} KB/s`;
        stats.totalUpload = `${totalUpload.toFixed(2)} KB/s`;

        return stats;
    }, [processes]);

    return {
        processes: filteredProcesses,
        loading,
        error,
        filter,
        setFilter,
        refreshProcesses,
        throttleProcess,
        unthrottleProcess,
        throttledProcesses,
        statistics,
    };
};
