export enum ProcessStatus {
    Online = "Online",
    Offline = "Offline",
}

export interface NetworkUsage {
    value: number;
    unit: string;
}

export interface ProcessNetworkUsage {
    download: NetworkUsage;
    upload: NetworkUsage;
}

export interface ApplicationProcess {
    id: number;
    name: string;
    display_name: string | null;
    path: string;
    icon: string | null;
    network_usage: ProcessNetworkUsage;
    pid: number;
    parent_pid?: number;
    children: number[];
    status: ProcessStatus;
    is_system: boolean;
    category: string;
    firstSeen?: number;
}

export type SpeedUnit = "B/s" | "KB/s" | "MB/s" | "GB/s";

export interface NetworkSpeed {
    value: number;
    unit: string;
}

export interface NetworkLimit {
    enabled: boolean;
    download: NetworkSpeed;
    upload: NetworkSpeed;
}

export interface AppNetworkLimit extends NetworkLimit {
    processId: number;
}

export interface GlobalNetworkLimit {
    download: NetworkSpeed;
    upload: NetworkSpeed;
}

// Conversion constants
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;
export const BYTES_PER_GB = BYTES_PER_MB * 1024;

// Helper functions for unit conversion
export const convertSpeed = (speed: NetworkSpeed, targetUnit: SpeedUnit): NetworkSpeed => {
    let bytesPerSecond = 0; // Initialize with default

    // Convert to bytes first
    switch (speed.unit) {
        case "B/s":
            bytesPerSecond = speed.value;
            break;
        case "KB/s":
            bytesPerSecond = speed.value * BYTES_PER_KB;
            break;
        case "MB/s":
            bytesPerSecond = speed.value * BYTES_PER_MB;
            break;
        case "GB/s":
            bytesPerSecond = speed.value * BYTES_PER_GB;
            break;
        default:
            bytesPerSecond = speed.value;
    }

    // Convert to target unit
    switch (targetUnit) {
        case "B/s":
            return { value: bytesPerSecond, unit: targetUnit };
        case "KB/s":
            return { value: bytesPerSecond / BYTES_PER_KB, unit: targetUnit };
        case "MB/s":
            return { value: bytesPerSecond / BYTES_PER_MB, unit: targetUnit };
        case "GB/s":
            return { value: bytesPerSecond / BYTES_PER_GB, unit: targetUnit };
        default:
            return { value: bytesPerSecond, unit: "B/s" };
    }
};
