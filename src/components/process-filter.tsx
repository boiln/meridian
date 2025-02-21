import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { ProcessFilter } from "@/hooks/use-processes";
import { cn } from "@/lib/utils";

interface ProcessFilterProps {
    filter: ProcessFilter;
    onFilterChange: (filter: ProcessFilter) => void;
    onSearchChange: (search: string) => void;
    searchValue: string;
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
            "px-6 py-2 text-sm transition-colors",
            active ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-accent/10"
        )}
    >
        {label}
    </button>
);

export function ProcessFilter({
    filter,
    onFilterChange,
    onSearchChange,
    searchValue,
}: ProcessFilterProps) {
    return (
        <div className="flex flex-col bg-card/80">
            <div className="border-b border-border/20 p-2">
                <div className="relative">
                    <Input
                        type="text"
                        placeholder="Search processes..."
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full border-none bg-accent/10 pl-8 text-accent placeholder:text-muted-foreground"
                    />
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                </div>
            </div>
            <div className="flex">
                <FilterTab
                    active={filter === "All"}
                    label="All"
                    onClick={() => onFilterChange("All")}
                />
                <FilterTab
                    active={filter === "Online"}
                    label="Online"
                    onClick={() => onFilterChange("Online")}
                />
                <FilterTab
                    active={filter === "Offline"}
                    label="Offline"
                    onClick={() => onFilterChange("Offline")}
                />
            </div>
        </div>
    );
}
