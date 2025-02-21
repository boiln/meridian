import { useEffect, useState } from "react";

import { Window, Monitor, LogicalSize } from "@tauri-apps/api/window";

// Get the current window instance
const appWindow = Window.getCurrent();

interface MonitorPayload {
    payload: Monitor;
}

export const useWindowState = () => {
    const [currentMonitor, setCurrentMonitor] = useState<Monitor | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const initializeWindow = async () => {
            try {
                // Check if window is maximized
                const maximized = await appWindow.isMaximized();
                setIsMaximized(maximized);

                // Listen for window changes
                const unlistenMove = await appWindow.onMoved(async () => {
                    // Window state is automatically saved by the plugin
                });

                const unlistenResize = await appWindow.onResized(async () => {
                    // Window state is automatically saved by the plugin
                });

                // Handle maximize/unmaximize
                const handleMaximize = async () => {
                    setIsMaximized(true);
                };

                const handleUnmaximize = async () => {
                    setIsMaximized(false);
                };

                const unlistenMaximize = await appWindow.listen("tauri://maximize", handleMaximize);
                const unlistenUnmaximize = await appWindow.listen(
                    "tauri://unmaximize",
                    handleUnmaximize
                );

                // Handle monitor changes
                const handleMonitorChange = async ({ payload: monitor }: MonitorPayload) => {
                    setCurrentMonitor(monitor);
                };

                const unlistenMonitorChange = await appWindow.listen(
                    "tauri://monitor-changed",
                    handleMonitorChange
                );

                return () => {
                    unlistenMove();
                    unlistenResize();
                    unlistenMaximize();
                    unlistenUnmaximize();
                    unlistenMonitorChange();
                };
            } catch (error) {
                console.error("Failed to initialize window state:", error);
            }
        };

        initializeWindow();
    }, [isMaximized]);

    const resetWindowState = async () => {
        try {
            // Reset to default window state (centered on primary monitor)
            await appWindow.center();
            await appWindow.setSize(new LogicalSize(1024, 768));
        } catch (error) {
            console.error("Failed to reset window state:", error);
        }
    };

    return {
        currentMonitor,
        isMaximized,
        resetWindowState,
    };
};
