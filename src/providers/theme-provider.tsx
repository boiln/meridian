import React, { createContext, useContext, useEffect, useState } from "react";

import { ThemeId, themes } from "@/types/theme";
import { cache } from "@/utils/cache";

interface ThemeContextType {
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
}

const defaultTheme = themes[0].id;

const ThemeContext = createContext<ThemeContextType>({
    theme: defaultTheme,
    setTheme: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize theme from cache
    const [theme, setThemeState] = useState<ThemeId>(() => {
        return cache.getSettings().theme;
    });

    const setTheme = (newTheme: ThemeId) => {
        setThemeState(newTheme);
        cache.updateSetting("theme", newTheme);
    };

    useEffect(() => {
        // Remove any existing theme
        document.documentElement.classList.remove(...themes.map((t) => t.id));

        // Set the new theme
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.classList.add(theme);

        // Force a re-render of the background
        document.body.style.display = "none";
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = "";
    }, [theme]);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
