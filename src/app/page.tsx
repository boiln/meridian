import { ProcessManager } from "@/components/process-manager";
import { SettingsMenu } from "@/components/settings-menu";
import { ThemeSelector } from "@/components/theme-selector";
import { useProcesses } from "@/hooks/use-processes";
import { ThemeProvider } from "@/providers/theme-provider";
import { AppNetworkLimit } from "@/types/network";

export default function Home() {
    const { processes, throttleProcess } = useProcesses();

    const handleLimitChange = (limit: AppNetworkLimit) => {
        throttleProcess(
            limit.processId,
            limit.enabled ? limit.download : null,
            limit.enabled ? limit.upload : null
        );
    };

    return (
        <ThemeProvider>
            <main className="flex h-screen flex-col bg-background">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/20 bg-card/80 px-4 py-2">
                    <div className="flex-1">Meridian</div>
                    <div className="ml-auto flex items-center gap-2">
                        <SettingsMenu />
                        <ThemeSelector />
                    </div>
                </div>

                <ProcessManager processes={processes} onLimitChange={handleLimitChange} />
            </main>
        </ThemeProvider>
    );
}
