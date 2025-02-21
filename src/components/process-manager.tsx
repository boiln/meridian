import { useState } from "react";

import { ProcessControls } from "@/components/process-controls";
import { ProcessItem } from "@/components/process-item";
import { SearchInput } from "@/components/search-input";
import { ApplicationProcess, SpeedUnit, AppNetworkLimit, convertSpeed } from "@/types/network";

interface ProcessManagerProps {
    processes: ApplicationProcess[];
    limits?: AppNetworkLimit[];
    onLimitChange?: (limit: AppNetworkLimit) => void;
}

type ProcessFilter = "all" | "active" | "throttled";

export function ProcessManager({ processes, limits = [], onLimitChange }: ProcessManagerProps) {
    const [filter, setFilter] = useState<ProcessFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("KB/s");

    const totalNetworkUsage = processes.reduce(
        (acc, process) => {
            const downloadSpeed = convertSpeed(
                {
                    value: process.network_usage.download.value,
                    unit: process.network_usage.download.unit,
                },
                speedUnit
            );
            const uploadSpeed = convertSpeed(
                {
                    value: process.network_usage.upload.value,
                    unit: process.network_usage.upload.unit,
                },
                speedUnit
            );
            return {
                download: acc.download + downloadSpeed.value,
                upload: acc.upload + uploadSpeed.value,
            };
        },
        { download: 0, upload: 0 }
    );

    const uniqueProcesses = processes.reduce((acc: ApplicationProcess[], process) => {
        const existingProcess = acc.find((p) => p.name === process.name);

        if (!existingProcess) {
            acc.push(process);
        } else if (
            process.network_usage.download.value > existingProcess.network_usage.download.value ||
            process.network_usage.upload.value > existingProcess.network_usage.upload.value
        ) {
            const index = acc.indexOf(existingProcess);
            acc[index] = process;
        }
        return acc;
    }, []);

    const filteredProcesses = uniqueProcesses
        .filter((process) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                process.name.toLowerCase().includes(query) ||
                process.path.toLowerCase().includes(query)
            );
        })
        .filter((process) => {
            switch (filter) {
                case "active":
                    return (
                        process.network_usage.download.value > 0 ||
                        process.network_usage.upload.value > 0
                    );
                case "throttled":
                    return limits.some((limit) => limit.processId === process.id && limit.enabled);
                default:
                    return true;
            }
        });

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex-none border-b border-border/20 bg-background/80 px-4 py-2">
                <div className="flex items-center gap-4">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search processes..."
                        className="w-64"
                    />
                    <ProcessControls
                        filter={filter}
                        onFilterChange={setFilter}
                        speedUnit={speedUnit}
                        onSpeedUnitChange={setSpeedUnit}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto px-2">
                    <div className="min-h-full pb-8">
                        <table className="w-full table-fixed">
                            <thead className="sticky top-0 z-10 bg-background">
                                <tr className="border-b border-border/20 text-left text-sm">
                                    <th className="w-[50%] px-2 py-2 font-normal text-muted-foreground">
                                        Name
                                    </th>
                                    <th className="w-[25%] px-2 py-2 font-normal text-muted-foreground">
                                        Download
                                        <span className="ml-2 text-xs text-accent">
                                            {speedUnit === "B/s"
                                                ? Math.round(totalNetworkUsage.download)
                                                : totalNetworkUsage.download.toFixed(2)}{" "}
                                            {speedUnit}
                                        </span>
                                    </th>
                                    <th className="w-[25%] px-2 py-2 font-normal text-muted-foreground">
                                        Upload
                                        <span className="ml-2 text-xs text-accent">
                                            {speedUnit === "B/s"
                                                ? Math.round(totalNetworkUsage.upload)
                                                : totalNetworkUsage.upload.toFixed(2)}{" "}
                                            {speedUnit}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProcesses.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                                        >
                                            {searchQuery
                                                ? "No processes found matching your search"
                                                : "No processes found"}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProcesses.map((process) => (
                                        <ProcessItem
                                            key={process.id}
                                            process={process}
                                            limit={limits.find((l) => l.processId === process.id)}
                                            onLimitChange={onLimitChange}
                                            speedUnit={speedUnit}
                                            allProcesses={processes}
                                            currentFilter={filter}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
