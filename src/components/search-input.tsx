import { ChangeEvent } from "react";

import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchInput = ({
    value,
    onChange,
    placeholder = "Search ..",
    className,
}: SearchInputProps) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleClear = () => {
        onChange("");
    };

    return (
        <div className={cn("relative", className)}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
                type="text"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="h-8 w-full rounded-md border border-border/50 bg-secondary/50 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/70"
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
