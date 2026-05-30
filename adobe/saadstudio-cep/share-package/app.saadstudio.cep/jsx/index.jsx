/**
 * Saad Studio CEP — ExtendScript bridge.
 *
 * Exposes a small surface of host-side helpers under $.saadstudio.
 * The web panel calls these via window.__adobe_cep__.evalScript through
 * the evalES() wrapper in client/src/lib/cep.ts.
 *
 * Supported hosts: Premiere Pro (PPRO) and After Effects (AEFT). Each
 * function dispatches to the right host implementation based on
 * BridgeTalk.appName.
 */

(function () {
    var host = (typeof $ !== "undefined") ? $ : this;
    if (!host.saadstudio) host.saadstudio = {};

    var APP = (typeof BridgeTalk !== "undefined" && BridgeTalk.appName)
              ? BridgeTalk.appName : "";    // "premierepro" | "aftereffects"
    var IS_PPRO = APP.indexOf("premiere") === 0;
    var IS_AEFT = APP.indexOf("aftereffects") === 0;

    // ─── Utilities ─────────────────────────────────────────────────────

    function safe(fn) {
        try { return fn(); }
        catch (e) { return { __error: true, message: String(e.message || e) }; }
    }

    function tempDir() {
        var sep = ($.os.indexOf("Windows") !== -1) ? "\\" : "/";
        var folder = Folder.temp.fsName + sep + "saadstudio";
        var f = new Folder(folder);
        if (!f.exists) f.create();
        return folder + sep;
    }

    function ts() {
        var d = new Date();
        return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
                  + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
                  + "-" + d.getTime();
    }
    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function mediaKindFromPath(fsName) {
        var lower = String(fsName || "").toLowerCase();
        if (/\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|heic|heif)$/i.test(lower)) return "image";
        if (/\.(mp3|wav|m4a|aac|ogg|flac|aif|aiff)$/i.test(lower)) return "audio";
        return "video";
    }

    // ─── getSelectedClip() ─────────────────────────────────────────────
    // Returns the first selected visual clip on the active timeline.
    // Premiere: walks the active sequence's video tracks.
    // After Effects: returns the selected footage layer in the active comp.

    host.saadstudio.getSelectedClip = function () {
        return safe(function () {
            if (IS_PPRO) return pproSelectedClip();
            if (IS_AEFT) return aeftSelectedLayer();
            return null;
        });
    };

    host.saadstudio.getSelectedAudio = function () {
        return safe(function () {
            if (IS_PPRO) return pproSelectedAudio();
            if (IS_AEFT) return aeftSelectedAudioLayer();
            return null;
        });
    };

    function pproSelectedClip() {
        if (!app.project || !app.project.activeSequence) return null;
        var seq = app.project.activeSequence;
        var tracks = seq.videoTracks;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                if (clip.isSelected && clip.isSelected()) {
                    var pi = clip.projectItem;
                    return {
                        type: mediaKindFromPath(pi && pi.getMediaPath ? pi.getMediaPath() : ""),
                        path: pi && pi.getMediaPath ? pi.getMediaPath() : "",
                        name: clip.name,
                        inSec: clip.inPoint ? clip.inPoint.seconds : 0,
                        outSec: clip.outPoint ? clip.outPoint.seconds : 0,
                        startSec: clip.start ? clip.start.seconds : 0,
                        endSec: clip.end ? clip.end.seconds : 0,
                        durationSec: clip.duration ? clip.duration.seconds : 0
                    };
                }
            }
        }
        return null;
    }

    function aeftSelectedLayer() {
        var item = app.project ? app.project.activeItem : null;
        if (!item || !(item instanceof CompItem)) return null;
        var sel = item.selectedLayers;
        if (!sel || !sel.length) return null;
        var layer = sel[0];
        if (!(layer.source instanceof FootageItem)) return null;
        var f = layer.source.mainSource && layer.source.mainSource.file;
        return {
            type: mediaKindFromPath(f ? f.fsName : ""),
            path: f ? f.fsName : "",
            name: layer.name,
            inSec: layer.inPoint,
            outSec: layer.outPoint,
            startSec: layer.startTime,
            durationSec: (layer.outPoint - layer.inPoint)
        };
    }

    function pproSelectedAudio() {
        if (!app.project || !app.project.activeSequence) return null;
        var seq = app.project.activeSequence;
        var tracks = seq.audioTracks;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                if (clip.isSelected && clip.isSelected()) {
                    var pi = clip.projectItem;
                    var mediaPath = pi && pi.getMediaPath ? pi.getMediaPath() : "";
                    if (mediaKindFromPath(mediaPath) !== "audio") continue;
                    return {
                        type: "audio",
                        path: mediaPath,
                        name: clip.name,
                        inSec: clip.inPoint ? clip.inPoint.seconds : 0,
                        outSec: clip.outPoint ? clip.outPoint.seconds : 0,
                        startSec: clip.start ? clip.start.seconds : 0,
                        endSec: clip.end ? clip.end.seconds : 0,
                        durationSec: clip.duration ? clip.duration.seconds : 0
                    };
                }
            }
        }
        return null;
    }

    function aeftSelectedAudioLayer() {
        var item = app.project ? app.project.activeItem : null;
        if (!item || !(item instanceof CompItem)) return null;
        var sel = item.selectedLayers;
        if (!sel || !sel.length) return null;
        var layer = sel[0];
        if (!(layer.source instanceof FootageItem)) return null;
        var f = layer.source.mainSource && layer.source.mainSource.file;
        var filePath = f ? f.fsName : "";
        if (mediaKindFromPath(filePath) !== "audio") return null;
        return {
            type: "audio",
            path: filePath,
            name: layer.name,
            inSec: layer.inPoint,
            outSec: layer.outPoint,
            startSec: layer.startTime,
            durationSec: (layer.outPoint - layer.inPoint)
        };
    }

    // ─── getActiveSequenceInfo() ───────────────────────────────────────

    host.saadstudio.getActiveSequenceInfo = function () {
        return safe(function () {
            if (IS_PPRO) {
                var s = app.project && app.project.activeSequence;
                if (!s) return null;
                var set = s.getSettings ? s.getSettings() : null;
                return {
                    name: s.name,
                    fps: set ? set.videoFrameRate.seconds && (1 / set.videoFrameRate.seconds) : null,
                    width: set ? set.videoFrameWidth : null,
                    height: set ? set.videoFrameHeight : null
                };
            }
            if (IS_AEFT) {
                var c = app.project && app.project.activeItem;
                if (!(c instanceof CompItem)) return null;
                return {
                    name: c.name,
                    fps: c.frameRate,
                    width: c.width,
                    height: c.height,
                    durationSec: c.duration
                };
            }
            return null;
        });
    };

    // ─── importMediaFromPath(path) ─────────────────────────────────────
    // Imports a file into the project bin. In Premiere it also adds the
    // clip to the active sequence at the playhead.

    host.saadstudio.importMediaFromPath = function (path) {
        return safe(function () {
            if (!path) throw new Error("No path provided");
            var f = new File(path);
            if (!f.exists) throw new Error("File not found: " + path);

            if (IS_PPRO) {
                app.project.importFiles([f.fsName], true,
                    app.project.rootItem, false);
                // Try to insert at the playhead of the active sequence
                try {
                    var seq = app.project.activeSequence;
                    if (seq) {
                        var imported = findRootItemByPath(f.fsName);
                        if (imported && seq.videoTracks && seq.videoTracks.numTracks > 0) {
                            seq.videoTracks[0].insertClip(imported, seq.getPlayerPosition());
                        }
                    }
                } catch (e) { /* import succeeded even if insert didn't */ }
                return { ok: true };
            }

            if (IS_AEFT) {
                app.beginUndoGroup("Saad Studio Import");
                var io = new ImportOptions(f);
                var item = app.project.importFile(io);
                var ai = app.project.activeItem;
                if (ai instanceof CompItem) ai.layers.add(item);
                app.endUndoGroup();
                return { ok: true, itemId: item.id };
            }

            throw new Error("Unsupported host: " + APP);
        });
    };

    function findRootItemByPath(fsName) {
        var root = app.project.rootItem;
        for (var i = 0; i < root.children.numItems; i++) {
            var ch = root.children[i];
            try { if (ch.getMediaPath && ch.getMediaPath() === fsName) return ch; }
            catch (e) {}
        }
        return null;
    }

    // ─── importRemoveBackgroundMaskFromPath(path) ──────────────────────
    // Mirrors the regular import but tags the layer/clip for matte use.

    host.saadstudio.importRemoveBackgroundMaskFromPath = function (path) {
        return safe(function () {
            var res = host.saadstudio.importMediaFromPath(path);
            if (res && res.__error) return res;
            // No additional matte wiring yet — host the imported clip and
            // let the user blend it manually. Slot kept for future logic.
            return { ok: true, mask: true };
        });
    };

    // ─── getActiveTimelineFrameSnapshot() ──────────────────────────────
    // Renders the current playhead frame to a temp PNG and returns the
    // file path + dimensions. Used by the Draw-to-Video flow.

    host.saadstudio.getActiveTimelineFrameSnapshot = function () {
        return safe(function () {
            if (IS_PPRO) return pproFrameSnapshot();
            if (IS_AEFT) return aeftFrameSnapshot();
            return null;
        });
    };

    function pproFrameSnapshot() {
        var seq = app.project && app.project.activeSequence;
        if (!seq) throw new Error("No active sequence");

        var out = tempDir() + "frame-" + ts() + ".png";
        // Premiere's exportFrame writes the current playhead frame.
        // The "tick time" argument is the ticks string for the position.
        var pos = seq.getPlayerPosition && seq.getPlayerPosition();
        if (!pos) throw new Error("Could not read playhead position");
        seq.exportFrameJPEG ? seq.exportFrameJPEG(pos.ticks, out) : null;
        // Many PPRO versions only expose exportFramePNG via getExportFileExtension;
        // fall back to ProjectItem.createSubclip or PProMeta if needed.
        try {
            if (typeof seq.exportFramePNG === "function") {
                seq.exportFramePNG(pos.ticks, out);
            }
        } catch (e) { /* JPEG fallback already written */ }

        var settings = seq.getSettings ? seq.getSettings() : null;
        return {
            imagePath: out,
            width: settings ? settings.videoFrameWidth : 1920,
            height: settings ? settings.videoFrameHeight : 1080
        };
    }

    function aeftFrameSnapshot() {
        var comp = app.project && app.project.activeItem;
        if (!(comp instanceof CompItem)) throw new Error("No active comp");
        var out = new File(tempDir() + "frame-" + ts() + ".png");
        comp.saveFrameToPng(comp.time, out);
        return {
            imagePath: out.fsName,
            width: comp.width,
            height: comp.height
        };
    }

    // ─── Health check (used by panel diagnostics) ──────────────────────

    host.saadstudio.ping = function () {
        return { ok: true, host: APP, time: new Date().getTime() };
    };
})();
