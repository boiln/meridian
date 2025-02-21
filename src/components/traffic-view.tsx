import { ArrowDown, ArrowUp } from "lucide-react";

import { useTrafficMonitor } from "@/hooks/use-traffic-monitor";
import { cn } from "@/lib/utils";
import { SpeedUnit } from "@/types/network";

interface TrafficViewProps {
    className?: string;
    selectedUnit: SpeedUnit;
}

export const TrafficView = ({ className, selectedUnit }: TrafficViewProps) => {
    const { networkUsage, error } = useTrafficMonitor();

    if (error) {
        return <div className="text-sm text-destructive">Error: {error}</div>;
    }

    // Validate input data
    if (!networkUsage.download || !networkUsage.upload) {
        return <div className="text-sm text-muted-foreground">No data available</div>;
    }

    const downloadValue = Number(networkUsage.download?.value) || 0;
    const uploadValue = Number(networkUsage.upload?.value) || 0;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <span className="text-sm text-accent">
                {downloadValue.toFixed(2)} {selectedUnit}
            </span>
            <ArrowDown className="h-4 w-4 text-accent" />
            <span className="text-sm text-accent">
                {uploadValue.toFixed(2)} {selectedUnit}
            </span>
            <ArrowUp className="h-4 w-4 text-accent" />
        </div>
    );
};
