import React from "react";
import { AppRegistry } from "react-native";
import App from "./App";

// Register the main App component
AppRegistry.registerComponent("main", () => App);

// For web, render it
if (typeof document !== "undefined") {
  const rootTag = document.getElementById("root") || document.body;
  AppRegistry.runApplication("main", {
    rootTag,
  });
}
