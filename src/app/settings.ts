import { z } from "zod";

export const SettingsSchema = z.object({
    // Network scanning settings
    scanning: z.object({
        scanInterval: z.number().min(1000).default(5000), // Scan interval in ms
        autoScan: z.boolean().default(true),
        deviceLimit: z.number().min(1).max(100).default(50),
        timeout: z.number().min(100).default(1000),
    }),

    // Throttling settings
    throttling: z.object({
        defaultDownloadLimit: z.number().min(0).default(1000), // KB/s
        defaultUploadLimit: z.number().min(0).default(1000), // KB/s
        enableAppSpecific: z.boolean().default(true),
        bufferSize: z.number().min(1024).default(8192), // bytes
    }),

    // Monitoring settings
    monitoring: z.object({
        updateInterval: z.number().min(100).default(1000), // Update interval in ms
        retentionPeriod: z.number().min(60).default(3600), // Data retention in seconds
        enableRealTime: z.boolean().default(true),
        metrics: z.array(z.enum(["bandwidth", "latency", "packetLoss"])).default(["bandwidth"]),
    }),

    // UI settings
    ui: z.object({
        theme: z.enum(["light", "dark", "system"]).default("system"),
        compactMode: z.boolean().default(false),
        refreshRate: z.number().min(100).default(1000),
        graphResolution: z.number().min(10).max(1000).default(100),
    }),
});

// Define the type based on the schema
export type Settings = z.infer<typeof SettingsSchema>;

// Default settings
export const defaultSettings: Settings = {
    scanning: {
        scanInterval: 5000,
        autoScan: true,
        deviceLimit: 50,
        timeout: 1000,
    },
    throttling: {
        defaultDownloadLimit: 1000,
        defaultUploadLimit: 1000,
        enableAppSpecific: true,
        bufferSize: 8192,
    },
    monitoring: {
        updateInterval: 1000,
        retentionPeriod: 3600,
        enableRealTime: true,
        metrics: ["bandwidth"],
    },
    ui: {
        theme: "system",
        compactMode: false,
        refreshRate: 1000,
        graphResolution: 100,
    },
};

// Helper function to validate settings
export function validateSettings(settings: unknown): Settings {
    return SettingsSchema.parse(settings);
}

// Helper function to merge settings with defaults
export function mergeWithDefaults(settings: Partial<Settings>): Settings {
    return {
        ...defaultSettings,
        ...settings,
        scanning: { ...defaultSettings.scanning, ...settings.scanning },
        throttling: { ...defaultSettings.throttling, ...settings.throttling },
        monitoring: { ...defaultSettings.monitoring, ...settings.monitoring },
        ui: { ...defaultSettings.ui, ...settings.ui },
    };
}
