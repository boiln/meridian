import { useState, useEffect, useRef } from "react";

import { invoke } from "@tauri-apps/api/core";

import { NetworkSpeed, ProcessNetworkUsage } from "@/types/network";

export const useTrafficMonitor = () => {
    const [networkUsage, setNetworkUsage] = useState<ProcessNetworkUsage>({
        download: { value: 0, unit: "KB/s" },
        upload: { value: 0, unit: "KB/s" },
    });
    const [error, setError] = useState<string | null>(null);
    const lastValues = useRef({ download: 0, upload: 0 });

    useEffect(() => {
        let mounted = true;
        let lastLogTime = 0;

        const fetchNetworkUsage = async () => {
            try {
                const usage = await invoke<ProcessNetworkUsage>("get_network_usage");

                if (!mounted) return;

                // Validate the response
                if (!usage || typeof usage !== "object") {
                    console.error("[Traffic Monitor] Invalid response:", usage);
                    throw new Error("Invalid response format from backend");
                }

                // Ensure we have valid values and consistent units
                const processedUsage: ProcessNetworkUsage = {
                    download: {
                        value: Number(usage.download?.value) || 0,
                        unit: usage.download?.unit || "KB/s",
                    },
                    upload: {
                        value: Number(usage.upload?.value) || 0,
                        unit: usage.upload?.unit || "KB/s",
                    },
                };

                // Check if values have changed
                const hasChanged =
                    processedUsage.download.value !== lastValues.current.download ||
                    processedUsage.upload.value !== lastValues.current.upload;

                // Log if values changed or every 5 seconds
                const now = Date.now();
                if (hasChanged || now - lastLogTime > 5000) {
                    console.log("[Traffic Monitor] Network usage update:", {
                        current: {
                            download: `${processedUsage.download.value.toFixed(2)} ${processedUsage.download.unit}`,
                            upload: `${processedUsage.upload.value.toFixed(2)} ${processedUsage.upload.unit}`,
                        },
                        previous: {
                            download: `${lastValues.current.download.toFixed(2)} KB/s`,
                            upload: `${lastValues.current.upload.toFixed(2)} KB/s`,
                        },
                        changed: hasChanged,
                        timestamp: new Date().toISOString(),
                    });
                    lastLogTime = now;
                }

                // Update last values
                lastValues.current = {
                    download: processedUsage.download.value,
                    upload: processedUsage.upload.value,
                };

                setNetworkUsage(processedUsage);
                setError(null);
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : "Failed to fetch network usage";
                console.error("[Traffic Monitor] Error:", errorMsg);
                setError(errorMsg);
            }
        };

        // Initial fetch
        fetchNetworkUsage();

        // Set up interval for updates
        const interval = setInterval(fetchNetworkUsage, 100);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    return { networkUsage, error };
};
