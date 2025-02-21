import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SettingsMenu = () => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-accent/20"
                >
                    <Settings className="h-4 w-4 text-accent" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background/80">
                <DropdownMenuItem className="text-accent">Clear All Cache</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-accent">Clear Process Cache</DropdownMenuItem>
                <DropdownMenuItem className="text-accent">Clear Network Cache</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
