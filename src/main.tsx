import React from "react";

import ReactDOM from "react-dom/client";

import Page from "@/app/page";
import "@/styles/globals.css";
import "@/styles/blue.css";
import "@/styles/red.css";
import "@/styles/green.css";
import "@/styles/dark.css";
import "@/styles/light.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <Page />
    </React.StrictMode>
);
