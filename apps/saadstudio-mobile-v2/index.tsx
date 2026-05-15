import React from "react";
import { AppRegistry } from "react-native";
import App from "./App";

// For Expo CLI
if (require.main === module) {
  AppRegistry.registerComponent("saadstudio-mobile-v2", () => App);
}

// For web/index.tsx specifically
AppRegistry.registerComponent("main", () => App);

// Execute on web
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const renderToDOM = () => {
    const rootElement = document.getElementById("root");
    if (rootElement) {
      AppRegistry.runApplication("main", {
        rootTag: rootElement
      });
    }
  };

  // Try to run immediately, then after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderToDOM);
  } else {
    renderToDOM();
  }
}

export default App;
