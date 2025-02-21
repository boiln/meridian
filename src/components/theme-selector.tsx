import { Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { themes } from "@/types/theme";

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-accent/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                    <Palette className="h-4 w-4 text-accent" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-card/80 backdrop-blur-md">
                {themes.map((t) => (
                    <DropdownMenuItem
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={cn(
                            "group flex items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-foreground",
                            theme === t.id ? "bg-accent/20" : "hover:bg-accent/10"
                        )}
                    >
                        <div
                            className="h-3 w-3 rounded-full transition-shadow duration-200 group-hover:shadow-glow"
                            style={
                                {
                                    background: t.color,
                                    boxShadow: theme === t.id ? `0 0 8px ${t.color}` : undefined,
                                    "--glow-color": t.color,
                                } as React.CSSProperties
                            }
                        />
                        <span>{t.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
