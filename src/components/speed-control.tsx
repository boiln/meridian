import { ChangeEvent, useState } from "react";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NetworkSpeed, SpeedUnit } from "@/types/network";

interface SpeedControlProps {
    value: NetworkSpeed;
    onChange: (speed: NetworkSpeed) => void;
    label?: string;
    className?: string;
}

const UNITS: SpeedUnit[] = ["B/s", "KB/s", "MB/s", "GB/s"];

export const SpeedControl = ({ label, value, onChange, className }: SpeedControlProps) => {
    const [localValue, setLocalValue] = useState(value.value.toString());
    const [unit, setUnit] = useState<SpeedUnit>(value.unit as SpeedUnit);

    const handleValueChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Only allow numbers and decimal points
        if (!/^\d*\.?\d*$/.test(newValue) && newValue !== "") return;

        setLocalValue(newValue);
        const numericValue = parseFloat(newValue);
        if (!isNaN(numericValue)) {
            onChange({ value: numericValue, unit });
        }
    };

    const handleUnitChange = (newUnit: SpeedUnit) => {
        setUnit(newUnit);
        onChange({ value: parseFloat(localValue) || 0, unit: newUnit });
    };

    return (
        <div className={cn("flex flex-col space-y-2", className)}>
            {label && <label className="text-sm text-muted-foreground">{label}</label>}
            <div className="flex space-x-2">
                <div className="flex h-7 items-center rounded bg-accent/10">
                    <Input
                        type="text"
                        inputMode="decimal"
                        value={localValue}
                        onChange={handleValueChange}
                        className="h-7 w-16 border-0 bg-transparent px-2 text-sm ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    />
                </div>
                <Select value={unit} onValueChange={handleUnitChange}>
                    <SelectTrigger className="h-7 w-16 border-none bg-accent/5 px-2 text-sm text-accent">
                        <SelectValue />
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
};
