# Premiere Pro Scripting Guide

* **Source Website**: [docsforadobe.dev](https://ppro-scripting.docsforadobe.dev/)
* **Repository**: [GitHub premiere-scripting-guide](https://github.com/docsforadobe/premiere-scripting-guide/)
* **Copyright**: Adobe Systems Incorporated.

This reference guide provides methods and members available via the ExtendScript API for Adobe Premiere Pro.

---

## 3rd Party Scripting has moved to UXP
As of November 2025, Premiere Pro has moved to extensibility based on UXP (Unified Extensibility Platform).
ExtendScript-based integrations are still supported, and the plan is for them to remain so, through September 2026.

---

## Key API Reference Points

### 1. Application (`app`)
* `app.project`: The currently active Project object.
* `app.version`: The version of Premiere Pro (e.g., `"14.3.1"`).
* `app.build`: The build number of Premiere Pro (e.g., `"45"`).
* `app.enableQE()`: Enables the Quality Engineering (QE) DOM. Returns `true` if successful.
* `app.getCurrentProjectViewSelection()`: Returns an array of selected `ProjectItem`s.
* `app.trace(message)`: Writes a string to Premiere Pro's debug console.

### 2. Project (`app.project`)
* `project.activeSequence`: The currently active sequence.
* `project.rootItem`: A `ProjectItem` referencing the root of the project (type bin).
* `project.sequences`: A collection of all sequences in the project.
* `project.createNewSequence(name, sequenceID)`: Creates a new sequence.
* `project.deleteSequence(sequence)`: Deletes a sequence.

### 3. Marker
* `Marker.name`: Name of the marker (read/write string).
* `Marker.comments`: Comments inside the marker (read/write string).
* `Marker.start`: A `Time` object representing the start position.
* `Marker.end`: A `Time` object representing the end position.
* `Marker.getColorByIndex(index)`: Gets marker color index (0 = Green, 1 = Red, 2 = Purple, etc.).
* `Marker.setColorByIndex(colorIndex, markerIndex)`: Sets marker color by index.

### 4. Encoder (`app.encoder`)
* Represents Adobe Media Encoder for background rendering.
* `encoder.encodeSequence(sequence, outputPath, presetPath, workArea, removeUponCompletion)`: Renders a sequence.

---

## Time in ExtendScript
* Premiere Pro internally calculates time using **ticks**.
* There are **254,016,000,000 ticks per second**.
* Absolute timeline positions are represented by the `Time` object.
