import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

import { z } from "zod";

import { ApplicationProcess } from "@/types/network";
import { themes, ThemeId } from "@/types/theme";

let CACHE_DIR: string;

// Create theme enum from theme IDs
const ThemeEnum = z.enum(themes.map((t) => t.id) as [ThemeId, ...ThemeId[]]);

// Window state schema
const WindowStateSchema = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    isMaximized: z.boolean(),
    displayId: z.string(),
    lastUpdate: z.number(),
});

export type WindowState = z.infer<typeof WindowStateSchema>;

// Define the settings schema with window state
const AppSettingsSchema = z.object({
    theme: ThemeEnum.default(themes[0].id),
    compactMode: z.boolean().default(false),
    refreshRate: z.number().min(100).default(1000),
    window: WindowStateSchema.default({
        x: 100,
        y: 100,
        width: 1024,
        height: 768,
        isMaximized: false,
        displayId: "primary",
        lastUpdate: Date.now(),
    }),
    // Add other window-related settings
    alwaysOnTop: z.boolean().default(false),
    startMinimized: z.boolean().default(false),
    rememberPosition: z.boolean().default(true),
    // Per-monitor window states
    monitorStates: z.record(z.string(), WindowStateSchema).default({}),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

interface ProcessCache {
    processes: { [pid: string]: ApplicationProcess };
    processOrder: string[];
    lastUpdated: number;
}

const CACHE_KEY = "meridian-settings";

// Default settings
const defaultSettings: AppSettings = {
    theme: "dark",
    compactMode: false,
    refreshRate: 1000,
    window: {
        x: 100,
        y: 100,
        width: 1024,
        height: 768,
        isMaximized: false,
        displayId: "primary",
        lastUpdate: Date.now(),
    },
    alwaysOnTop: false,
    startMinimized: false,
    rememberPosition: true,
    monitorStates: {},
};

// Initial process cache state
const initialProcessCache: ProcessCache = {
    processes: {},
    processOrder: [],
    lastUpdated: 0,
};

export const initializeCache = async (): Promise<void> => {
    try {
        // Get the app data directory
        CACHE_DIR = await appDataDir();
        const cachePath = await join(CACHE_DIR, "meridian-cache");

        // Create the cache directory
        await invoke("plugin:fs|create-dir", {
            path: cachePath,
            options: { recursive: true },
        });
    } catch (error) {
        console.warn("Cache directory might already exist:", error);
    }
};

export const loadProcessCache = async (): Promise<ProcessCache> => {
    try {
        if (!CACHE_DIR) {
            CACHE_DIR = await appDataDir();
        }
        const cachePath = await join(CACHE_DIR, "meridian-cache", "processes.json");

        const content = await invoke<string>("plugin:fs|read-file", {
            path: cachePath,
        });
        const cache = JSON.parse(content);
        // Ensure backward compatibility
        if (!cache.processOrder) {
            cache.processOrder = Object.keys(cache.processes);
        }
        return cache;
    } catch (error) {
        console.log("No cache file found, starting fresh");
        return { processes: {}, processOrder: [], lastUpdated: 0 };
    }
};

export const saveProcessCache = async (processes: ApplicationProcess[]): Promise<void> => {
    try {
        if (!CACHE_DIR) {
            CACHE_DIR = await appDataDir();
        }

        const processMap: { [pid: string]: ApplicationProcess } = {};
        const processOrder: string[] = [];

        processes.forEach((process) => {
            const pid = process.pid.toString();
            processMap[pid] = process;
            if (!processOrder.includes(pid)) {
                processOrder.push(pid);
            }
        });

        const cache: ProcessCache = {
            processes: processMap,
            processOrder,
            lastUpdated: Date.now(),
        };

        const cachePath = await join(CACHE_DIR, "meridian-cache", "processes.json");
        await invoke("plugin:fs|write-file", {
            path: cachePath,
            contents: JSON.stringify(cache, null, 2),
        });
    } catch (error) {
        console.error("Failed to save process cache:", error);
    }
};

export const resetToInitialState = async () => {
    try {
        // Reset process cache to initial state
        if (!CACHE_DIR) {
            CACHE_DIR = await appDataDir();
        }
        const processPath = await join(CACHE_DIR, "meridian-cache", "processes.json");
        await invoke("plugin:fs|write-file", {
            path: processPath,
            contents: JSON.stringify(initialProcessCache, null, 2),
        });

        // Reset settings to defaults but preserve theme
        const currentSettings = cache.getSettings();
        const resetSettings = {
            ...defaultSettings,
            theme: currentSettings.theme, // Preserve current theme
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(resetSettings));

        console.log("Reset all caches to initial state");
    } catch (error) {
        console.error("Failed to reset to initial state:", error);
    }
};

export const cache = {
    // Get settings from cache
    getSettings: (): AppSettings => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return defaultSettings;

            const parsed = JSON.parse(cached);
            const validated = AppSettingsSchema.parse(parsed);
            return validated;
        } catch (error) {
            console.warn("Failed to load settings from cache:", error);
            return defaultSettings;
        }
    },

    // Save settings to cache
    saveSettings: (settings: Partial<AppSettings>): void => {
        try {
            const current = cache.getSettings();
            const updated = { ...current, ...settings };
            const validated = AppSettingsSchema.parse(updated);
            localStorage.setItem(CACHE_KEY, JSON.stringify(validated));
        } catch (error) {
            console.error("Failed to save settings to cache:", error);
        }
    },

    // Update a single setting
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]): void => {
        try {
            const current = cache.getSettings();
            const updated = { ...current, [key]: value };
            const validated = AppSettingsSchema.parse(updated);
            localStorage.setItem(CACHE_KEY, JSON.stringify(validated));
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
        }
    },

    // Window state management
    window: {
        // Save window state for specific monitor
        saveState: async (state: WindowState, monitorId: string = "primary"): Promise<void> => {
            try {
                const settings = cache.getSettings();
                const monitorStates = {
                    ...settings.monitorStates,
                    [monitorId]: {
                        ...state,
                        lastUpdate: Date.now(),
                    },
                };

                cache.saveSettings({
                    window: state,
                    monitorStates,
                });
            } catch (error) {
                console.error("Failed to save window state:", error);
            }
        },

        // Get window state for specific monitor
        getState: (monitorId: string = "primary"): WindowState => {
            const settings = cache.getSettings();
            return settings.monitorStates[monitorId] || settings.window;
        },

        // Get the most recently used window state across all monitors
        getLastUsedState: (): WindowState => {
            const settings = cache.getSettings();
            const states = Object.values(settings.monitorStates);

            if (states.length === 0) return settings.window;

            return states.reduce((latest, current) => {
                return latest.lastUpdate > current.lastUpdate ? latest : current;
            });
        },

        // Reset window state to defaults
        resetState: (): void => {
            cache.saveSettings({
                window: defaultSettings.window,
                monitorStates: {},
            });
        },
    },

    // Add reset method to cache object
    reset: resetToInitialState,
};
