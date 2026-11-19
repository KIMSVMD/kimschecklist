"use client";

import dynamic from "next/dynamic";

// The app reads window/localStorage while rendering, so it only renders in the browser.
const App = dynamic(() => import("@/App"), { ssr: false });

export default function ClientApp() {
  return <App />;
}
