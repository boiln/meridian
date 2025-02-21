import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SpeedUnit } from "@/types/network";

interface ProcessControlsProps {
    filter: "all" | "active" | "throttled";
    onFilterChange: (filter: "all" | "active" | "throttled") => void;
    speedUnit: SpeedUnit;
    onSpeedUnitChange: (unit: SpeedUnit) => void;
}

const FilterTab = ({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={cn(
            "px-4 py-2 text-sm transition-colors",
            active ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-accent/10"
        )}
    >
        {label}
    </button>
);

export function ProcessControls({
    filter,
    onFilterChange,
    speedUnit,
    onSpeedUnitChange,
}: ProcessControlsProps) {
    return (
        <div className="flex items-center gap-4">
            <div className="flex rounded-sm bg-accent/5">
                <FilterTab
                    active={filter === "all"}
                    label="All"
                    onClick={() => onFilterChange("all")}
                />
                <FilterTab
                    active={filter === "active"}
                    label="Active"
                    onClick={() => onFilterChange("active")}
                />
                <FilterTab
                    active={filter === "throttled"}
                    label="Throttled"
                    onClick={() => onFilterChange("throttled")}
                />
            </div>

            <Select value={speedUnit} onValueChange={onSpeedUnitChange}>
                <SelectTrigger className="h-8 w-[70px] border-none bg-accent/5 px-2 text-sm text-accent">
                    <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="B/s">B/s</SelectItem>
                    <SelectItem value="KB/s">KB/s</SelectItem>
                    <SelectItem value="MB/s">MB/s</SelectItem>
                    <SelectItem value="GB/s">GB/s</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
