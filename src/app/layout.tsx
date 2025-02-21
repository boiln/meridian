import { ThemeSelector } from "@/components/theme-selector";
import { ThemeProvider } from "@/providers/theme-provider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-theme="dark">
            <ThemeProvider>
                <div className="min-h-screen bg-background">
                    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
                        <div className="container flex h-14 items-center">
                            <div className="flex flex-1 items-center justify-between space-x-2">
                                <ThemeSelector />
                            </div>
                        </div>
                    </header>
                    <main className="container py-6">{children}</main>
                </div>
            </ThemeProvider>
        </html>
    );
}
