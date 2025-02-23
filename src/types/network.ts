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
    let bytesPerSecond = 0;

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

export interface NetworkManipulation {
    enabled: boolean;
    download: boolean;
    upload: boolean;
}

export interface LagConfig extends NetworkManipulation {
    timeMs: number; // Default: 500
}

export interface DropConfig extends NetworkManipulation {
    chance: number; // Default: 60
}

export interface ThrottleConfig extends NetworkManipulation {
    timeframeMs: number; // Default: 500
    chance: number; // Default: 60
}

export interface OutOfOrderConfig extends NetworkManipulation {
    chance: number; // Default: 60
}

export interface DuplicateConfig extends NetworkManipulation {
    count: number; // Default: 2
    chance: number; // Default: 60
}

export interface TamperConfig extends NetworkManipulation {
    redoChecksum: boolean;
    chance: number; // Default: 60
}

export interface ProcessNetworkConfig {
    lag: LagConfig;
    drop: DropConfig;
    throttle: ThrottleConfig;
    outOfOrder: OutOfOrderConfig;
    duplicate: DuplicateConfig;
    tamper: TamperConfig;
}

export const DEFAULT_NETWORK_CONFIG: ProcessNetworkConfig = {
    lag: {
        enabled: false,
        download: false,
        upload: false,
        timeMs: 500,
    },
    drop: {
        enabled: false,
        download: false,
        upload: false,
        chance: 60,
    },
    throttle: {
        enabled: false,
        download: false,
        upload: false,
        timeframeMs: 500,
        chance: 60,
    },
    outOfOrder: {
        enabled: false,
        download: false,
        upload: false,
        chance: 60,
    },
    duplicate: {
        enabled: false,
        download: false,
        upload: false,
        count: 2,
        chance: 60,
    },
    tamper: {
        enabled: false,
        download: false,
        upload: false,
        redoChecksum: true,
        chance: 60,
    },
};
