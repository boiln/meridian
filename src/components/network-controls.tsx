import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { NetworkSpeed, SpeedUnit, ProcessNetworkConfig, AppNetworkLimit } from "@/types/network";
import React from "react";

// Speed Control Types & Component
const UNITS: SpeedUnit[] = ["B/s", "KB/s", "MB/s", "GB/s"];

interface SpeedControlProps {
    label: string;
    value: NetworkSpeed;
    onChange: (value: NetworkSpeed) => void;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    download: boolean;
    onDownloadChange: (enabled: boolean) => void;
    upload: boolean;
    onUploadChange: (enabled: boolean) => void;
}

export const SpeedControl = React.memo(
    function SpeedControl({
        label,
        value,
        onChange,
        enabled,
        onEnabledChange,
        download,
        onDownloadChange,
        upload,
        onUploadChange,
    }: SpeedControlProps) {
        const uniqueId = React.useId();
        const enabledId = `${uniqueId}-enabled`;
        const downloadId = `${uniqueId}-download`;
        const uploadId = `${uniqueId}-upload`;

        const handleValueChange = React.useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                onChange({
                    ...value,
                    value: parseFloat(e.target.value) || 0,
                });
            },
            [onChange, value]
        );

        const handleUnitChange = React.useCallback(
            (unit: string) => {
                onChange({
                    ...value,
                    unit,
                });
            },
            [onChange, value]
        );

        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={enabledId}
                            checked={enabled}
                            onCheckedChange={onEnabledChange}
                            name={`${label}-enabled`}
                            aria-checked={enabled}
                        />
                        <Label htmlFor={enabledId} className="min-w-[80px] text-sm font-medium">
                            {label}
                        </Label>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={downloadId}
                            checked={download}
                            onCheckedChange={onDownloadChange}
                            disabled={!enabled}
                            name={`${label}-download`}
                            aria-checked={download}
                        />
                        <Label htmlFor={downloadId} className="text-xs">
                            Download
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={uploadId}
                            checked={upload}
                            onCheckedChange={onUploadChange}
                            disabled={!enabled}
                            name={`${label}-upload`}
                            aria-checked={upload}
                        />
                        <Label htmlFor={uploadId} className="text-xs">
                            Upload
                        </Label>
                    </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        value={value.value}
                        onChange={handleValueChange}
                        className="h-7 w-[120px] border-border/50 bg-secondary/50 text-sm"
                        disabled={!enabled}
                    />
                    <Select value={value.unit} onValueChange={handleUnitChange} disabled={!enabled}>
                        <SelectTrigger className="h-7 w-20 border-border/50 bg-secondary/50 text-sm">
                            <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                    {unit}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison function to prevent unnecessary re-renders
        return (
            prevProps.label === nextProps.label &&
            prevProps.enabled === nextProps.enabled &&
            prevProps.download === nextProps.download &&
            prevProps.upload === nextProps.upload &&
            prevProps.value.value === nextProps.value.value &&
            prevProps.value.unit === nextProps.value.unit
        );
    }
);

// Network Manipulation Types & Component
interface NetworkManipulationProps {
    config: ProcessNetworkConfig;
    onChange: (config: ProcessNetworkConfig) => void;
}

interface NetworkOptionProps {
    id: string;
    label: string;
    config: { enabled: boolean; download: boolean; upload: boolean };
    onChange: (value: Partial<{ enabled: boolean; download: boolean; upload: boolean }>) => void;
    value: number;
    onValueChange: (value: number) => void;
    unit: string;
}

export const NetworkOption = React.memo(
    function NetworkOption({ id, label, config, value, unit }: NetworkOptionProps) {
        const uniqueId = React.useId();
        const enabledId = `${uniqueId}-${id}-enabled`;
        const downloadId = `${uniqueId}-${id}-download`;
        const uploadId = `${uniqueId}-${id}-upload`;

        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox />
                        <Label htmlFor={enabledId} className="min-w-[80px] text-sm font-medium">
                            {label}
                        </Label>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={downloadId}
                            checked={config.download}
                            disabled={!config.enabled}
                            name={`${id}-${label}-download`}
                            aria-checked={config.download}
                        />
                        <Label htmlFor={downloadId} className="text-xs">
                            Download
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={uploadId}
                            checked={config.upload}
                            disabled={!config.enabled}
                            name={`${id}-${label}-upload`}
                            aria-checked={config.upload}
                        />
                        <Label htmlFor={uploadId} className="text-xs">
                            Upload
                        </Label>
                    </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        value={value}
                        className="h-7 w-[120px] border-border/50 bg-secondary/50 text-sm"
                        disabled={!config.enabled}
                    />
                    <span className="min-w-[30px] text-xs text-muted-foreground">{unit}</span>
                </div>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison function to prevent unnecessary re-renders
        return (
            prevProps.id === nextProps.id &&
            prevProps.label === nextProps.label &&
            prevProps.value === nextProps.value &&
            prevProps.unit === nextProps.unit &&
            prevProps.config.enabled === nextProps.config.enabled &&
            prevProps.config.download === nextProps.config.download &&
            prevProps.config.upload === nextProps.config.upload
        );
    }
);

export const NetworkManipulation = React.memo(function NetworkManipulation({
    config,
    onChange,
}: NetworkManipulationProps) {
    const handleConfigChange = <K extends keyof ProcessNetworkConfig>(
        key: K,
        value: Partial<ProcessNetworkConfig[K]>
    ) => {
        const newConfig = {
            ...config,
            [key]: {
                ...config[key],
                ...value,
            },
        };

        if (JSON.stringify(newConfig) !== JSON.stringify(config)) {
            onChange(newConfig);
        }
    };

    return (
        <div className="space-y-3">
            {/* Throttle */}
            <NetworkOption
                id="throttle"
                label="Throttle"
                config={config.throttle}
                onChange={(v) => handleConfigChange("throttle", v)}
                value={config.throttle.timeframeMs}
                onValueChange={(v) => handleConfigChange("throttle", { timeframeMs: v })}
                unit="ms"
            />

            {/* Lag */}
            <NetworkOption
                id="lag"
                label="Lag"
                config={config.lag}
                onChange={(v) => handleConfigChange("lag", v)}
                value={config.lag.timeMs}
                onValueChange={(v) => handleConfigChange("lag", { timeMs: v })}
                unit="ms"
            />

            {/* Drop */}
            <NetworkOption
                id="drop"
                label="Drop"
                config={config.drop}
                onChange={(v) => handleConfigChange("drop", v)}
                value={config.drop.chance}
                onValueChange={(v) => handleConfigChange("drop", { chance: v })}
                unit="%"
            />

            {/* Out of Order */}
            <NetworkOption
                id="outOfOrder"
                label="Out of Order"
                config={config.outOfOrder}
                onChange={(v) => handleConfigChange("outOfOrder", v)}
                value={config.outOfOrder.chance}
                onValueChange={(v) => handleConfigChange("outOfOrder", { chance: v })}
                unit="%"
            />

            {/* Duplicate */}
            <NetworkOption
                id="duplicate"
                label="Duplicate"
                config={config.duplicate}
                onChange={(v) => handleConfigChange("duplicate", v)}
                value={config.duplicate.count}
                onValueChange={(v) => handleConfigChange("duplicate", { count: v })}
                unit="count"
            />

            {/* Tamper */}
            <NetworkOption
                id="tamper"
                label="Tamper"
                config={config.tamper}
                onChange={(v) => handleConfigChange("tamper", v)}
                value={config.tamper.chance}
                onValueChange={(v) => handleConfigChange("tamper", { chance: v })}
                unit="%"
            />
        </div>
    );
});
