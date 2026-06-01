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
                        durationSec: selectedTimelineDurationSec(clip)
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
                        durationSec: selectedTimelineDurationSec(clip)
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

    host.saadstudio.getActiveSequenceContext = function () {
        return safe(function () {
            if (IS_PPRO) return pproTimelineContext();
            if (IS_AEFT) {
                var comp = app.project && app.project.activeItem;
                if (!(comp instanceof CompItem)) return null;
                return {
                    host: "aftereffects",
                    hasSequence: true,
                    sequenceName: comp.name,
                    playheadSec: comp.time,
                    selectedClip: aeftSelectedLayer() || aeftSelectedAudioLayer() || null
                };
            }
            return null;
        });
    };

    function pproTimelineContext() {
        var seq = app.project && app.project.activeSequence;
        if (!seq) {
            return {
                host: "premiere",
                hasSequence: false,
                sequenceName: null,
                sequenceId: null,
                playheadTicks: null,
                playheadSeconds: null,
                captionTracksCount: 0,
                videoTracksCount: 0,
                selectedClip: null
            };
        }
        var playheadTicks = null;
        var playheadSeconds = null;
        try {
            var playhead = seq.getPlayerPosition && seq.getPlayerPosition();
            playheadTicks = playhead && playhead.ticks ? String(playhead.ticks) : null;
            playheadSeconds = playhead && typeof playhead.seconds !== "undefined" ? playhead.seconds : null;
        } catch (e) { playheadTicks = null; }
        var sequenceId = null;
        try {
            sequenceId = seq.sequenceID || seq.id || (seq.projectItem && seq.projectItem.nodeId) || null;
        } catch (eId) { sequenceId = null; }
        return {
            host: "premiere",
            hasSequence: true,
            sequenceName: seq.name,
            sequenceId: sequenceId,
            playheadTicks: playheadTicks,
            playheadSeconds: playheadSeconds,
            captionTracksCount: seq.captionTracks ? seq.captionTracks.numTracks : 0,
            videoTracksCount: seq.videoTracks ? seq.videoTracks.numTracks : 0,
            selectedClip: pproSelectedTimelineItem(seq)
        };
    }

    function pproSelectedTimelineItem(seq) {
        var found = pproSelectedTrackClip(seq.videoTracks, "video");
        if (found) return found;
        return pproSelectedTrackClip(seq.audioTracks, "audio");
    }

    function pproSelectedTrackClip(tracks, kind) {
        if (!tracks) return null;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                if (clip.isSelected && clip.isSelected()) {
                    var pi = clip.projectItem;
                    var mediaPath = pi && pi.getMediaPath ? pi.getMediaPath() : "";
                    return {
                        trackKind: kind,
                        trackIndex: t,
                        path: mediaPath,
                        name: clip.name,
                        startTicks: clip.start && clip.start.ticks ? String(clip.start.ticks) : null,
                        endTicks: clip.end && clip.end.ticks ? String(clip.end.ticks) : null,
                        startSec: clip.start ? clip.start.seconds : 0,
                        endSec: clip.end ? clip.end.seconds : 0,
                        durationSec: selectedTimelineDurationSec(clip)
                    };
                }
            }
        }
        return null;
    }

    function selectedTimelineDurationSec(clip) {
        var inSec = clip.inPoint ? clip.inPoint.seconds : 0;
        var outSec = clip.outPoint ? clip.outPoint.seconds : 0;
        if (outSec > inSec) return outSec - inSec;
        var startSec = clip.start ? clip.start.seconds : 0;
        var endSec = clip.end ? clip.end.seconds : 0;
        if (endSec > startSec) return endSec - startSec;
        return clip.duration ? clip.duration.seconds : 0;
    }

    function normalizePathValue(value) {
        return String(value || "").replace(/\//g, "\\").toLowerCase();
    }

    function importProjectItemOnly(path) {
        if (!path) throw new Error("No path provided");
        var f = new File(path);
        if (!f.exists) throw new Error("File not found: " + path);

        if (IS_PPRO) {
            app.project.importFiles([f.fsName], true, app.project.rootItem, false);
            return {
                ok: true,
                imported: true,
                binPath: f.fsName
            };
        }

        if (IS_AEFT) {
            app.beginUndoGroup("Saad Studio Import");
            var io = new ImportOptions(f);
            var item = app.project.importFile(io);
            app.endUndoGroup();
            return {
                ok: true,
                imported: true,
                itemId: item.id,
                binPath: f.fsName
            };
        }

        throw new Error("Unsupported host: " + APP);
    }

    host.saadstudio.importAssetToProject = function (path) {
        return safe(function () {
            return importProjectItemOnly(path);
        });
    };

    host.saadstudio.importSrtToProject = function (path) {
        return safe(function () {
            return importProjectItemOnly(path);
        });
    };

    host.saadstudio.placeMediaOnTimeline = function (path) {
        return safe(function () {
            return host.saadstudio.importAndPlaceOnTimeline(path);
        });
    };

    host.saadstudio.placeCaptionFromSrt = function (srtPath, sourcePath) {
        return safe(function () {
            return host.saadstudio.importSrtAsCaption(srtPath, sourcePath);
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

    // ─── importAndPlaceOnTimeline(path) ────────────────────────────────
    // Reap-style "just put it on the timeline" helper. Imports the file
    // to the bin, then:
    //   - if a clip is selected on Premiere's active sequence, drops the
    //     new one RIGHT AFTER the selected clip on the same V track
    //   - otherwise appends at the end of V1
    //   - in After Effects, adds the layer to the active comp at time 0
    // No user click needed.

    host.saadstudio.importAndPlaceOnTimeline = function (path) {
        return safe(function () {
            if (!path) throw new Error("No path provided");
            var f = new File(path);
            if (!f.exists) throw new Error("File not found: " + path);

            if (IS_PPRO) {
                app.project.importFiles([f.fsName], true,
                    app.project.rootItem, false);

                var seq = app.project.activeSequence;
                if (!seq) return { ok: true, placed: false, reason: "no active sequence" };

                var imported = findRootItemByPath(f.fsName);
                if (!imported) return { ok: true, placed: false, reason: "import succeeded but item not found" };

                // Find which track holds the selected clip (if any).
                var targetTrackIdx = 0;
                var insertAtTicks = null;
                for (var t = 0; t < seq.videoTracks.numTracks; t++) {
                    var clips = seq.videoTracks[t].clips;
                    for (var c = 0; c < clips.numItems; c++) {
                        if (clips[c].isSelected && clips[c].isSelected()) {
                            targetTrackIdx = t;
                            // Insert right after the selected clip's end.
                            try {
                                insertAtTicks = clips[c].end.ticks;
                            } catch (e) {
                                insertAtTicks = null;
                            }
                            break;
                        }
                    }
                    if (insertAtTicks !== null) break;
                }

                var targetTrack = seq.videoTracks[targetTrackIdx];

                // No selection → append after the last clip on V1.
                if (insertAtTicks === null) {
                    var lastEnd = null;
                    var v1Clips = targetTrack.clips;
                    for (var i = 0; i < v1Clips.numItems; i++) {
                        try {
                            var endTicks = v1Clips[i].end.ticks;
                            if (lastEnd === null || Number(endTicks) > Number(lastEnd)) {
                                lastEnd = endTicks;
                            }
                        } catch (e) { /* skip */ }
                    }
                    if (lastEnd !== null) {
                        insertAtTicks = lastEnd;
                    } else {
                        // Empty track — use the current playhead.
                        try {
                            insertAtTicks = seq.getPlayerPosition().ticks;
                        } catch (e) {
                            insertAtTicks = "0";
                        }
                    }
                }

                try {
                    targetTrack.insertClip(imported, insertAtTicks);
                } catch (e) {
                    return { ok: true, placed: false, reason: "insertClip failed: " + e.message };
                }

                return { ok: true, placed: true, track: targetTrackIdx, at: String(insertAtTicks) };
            }

            if (IS_AEFT) {
                app.beginUndoGroup("Saad Studio Auto-Place");
                var io = new ImportOptions(f);
                var item = app.project.importFile(io);
                var ai = app.project.activeItem;
                var placed = false;
                if (ai instanceof CompItem) {
                    ai.layers.add(item);
                    placed = true;
                }
                app.endUndoGroup();
                return { ok: true, placed: placed, itemId: item.id };
            }

            throw new Error("Unsupported host: " + APP);
        });
    };

    // ─── importSrtAsCaption(srtPath) ───────────────────────────────────
    // Imports an SRT subtitle file and tries to drop it on the active
    // sequence's first caption track (Premiere 14+). If no caption track
    // is available — or the host is After Effects — the SRT lands in the
    // project bin so the user can drag it themselves. The panel reads
    // the returned { placed, reason } pair to decide which success card
    // to render and whether to surface the Download SRT fallback.

    host.saadstudio.importSrtAsCaption = function (srtPath, sourcePath) {
        return safe(function () {
            if (!srtPath) throw new Error("No SRT path provided");
            var f = new File(srtPath);
            if (!f.exists) throw new Error("SRT not found: " + srtPath);

            if (IS_PPRO) {
                app.project.importFiles([f.fsName], true,
                    app.project.rootItem, false);

                var imported = findRootItemByPath(f.fsName);
                if (!imported) {
                    return { ok: true, placed: false,
                        reason: "Imported but item not found in bin.",
                        binPath: f.fsName };
                }

                var context = pproTimelineContext();
                if (!context || !context.hasSequence) {
                    return { ok: true, placed: false,
                        reason: "No active sequence — SRT is in the project bin.",
                        binPath: f.fsName };
                }

                if (!context.selectedClip) {
                    return {
                        ok: true,
                        placed: false,
                        reason: "No selected clip on the active sequence. SRT is in the project bin to avoid random placement.",
                        sequence: context.sequenceName,
                        playheadTicks: context.playheadTicks,
                        binPath: f.fsName
                    };
                }

                if (sourcePath && context.selectedClip.path &&
                    normalizePathValue(context.selectedClip.path) !== normalizePathValue(sourcePath)) {
                    return {
                        ok: true,
                        placed: false,
                        reason: "The selected timeline clip does not match the source used for these captions. SRT is in the project bin to avoid misplacement.",
                        sequence: context.sequenceName,
                        playheadTicks: context.playheadTicks,
                        selectedClipPath: context.selectedClip.path,
                        expectedSourcePath: sourcePath,
                        binPath: f.fsName
                    };
                }

                var insertTicks = context.selectedClip.startTicks;
                if (!insertTicks) {
                    return {
                        ok: true,
                        placed: false,
                        reason: "Could not determine the selected clip start time. SRT is in the project bin.",
                        sequence: context.sequenceName,
                        playheadTicks: context.playheadTicks,
                        binPath: f.fsName
                    };
                }

                var seq = app.project.activeSequence;
                var startAtTime = context.selectedClip.startSec || 0;
                var createCaptionTrackAvailable = typeof seq.createCaptionTrack === "function";
                var primaryMethod = "createCaptionTrack";
                var createCaptionTrackResult = "FAILED";
                var fallbackUsed = false;
                var fallbackMethod = "captionTracks[0].insertClip";
                var fallbackResult = "NOT_USED";

                if (createCaptionTrackAvailable) {
                    try {
                        var captionFormat = (typeof Sequence !== "undefined" && typeof Sequence.CAPTION_FORMAT_SUBTITLE !== "undefined")
                            ? Sequence.CAPTION_FORMAT_SUBTITLE
                            : undefined;
                        var created = (typeof captionFormat !== "undefined")
                            ? seq.createCaptionTrack(imported, startAtTime, captionFormat)
                            : seq.createCaptionTrack(imported, startAtTime);
                        if (created) {
                            createCaptionTrackResult = "SUCCESS";
                            return {
                                ok: true,
                                placed: true,
                                success: true,
                                method: primaryMethod,
                                captionImportPrimaryMethod: primaryMethod,
                                createCaptionTrackAvailable: true,
                                createCaptionTrackResult: createCaptionTrackResult,
                                fallbackUsed: false,
                                fallbackMethod: fallbackMethod,
                                finalResult: "SUCCESS",
                                track: "NEW_CAPTION_TRACK",
                                at: String(insertTicks),
                                sequence: context.sequenceName,
                                playheadTicks: context.playheadTicks,
                                sourceTrack: (context.selectedClip.trackKind === "audio" ? "A" : "V") + (context.selectedClip.trackIndex + 1),
                                sourceClipName: context.selectedClip.name,
                                binPath: f.fsName
                            };
                        }
                        createCaptionTrackResult = "FAILED";
                    } catch (eCreate) {
                        createCaptionTrackResult = "FAILED: " + eCreate.message;
                    }
                }

                if (!(seq.captionTracks && seq.captionTracks.numTracks > 0)) {
                    return {
                        ok: true,
                        placed: false,
                        success: false,
                        method: primaryMethod,
                        captionImportPrimaryMethod: primaryMethod,
                        createCaptionTrackAvailable: createCaptionTrackAvailable,
                        createCaptionTrackResult: createCaptionTrackResult,
                        fallbackUsed: false,
                        fallbackMethod: fallbackMethod,
                        finalResult: "BIN_ONLY",
                        reason: "No caption track is available on the active sequence, and createCaptionTrack did not succeed. SRT is in the project bin.",
                        sequence: context.sequenceName,
                        playheadTicks: context.playheadTicks,
                        binPath: f.fsName
                    };
                }

                try {
                    fallbackUsed = true;
                    seq.captionTracks[0].insertClip(imported, insertTicks);
                    fallbackResult = "SUCCESS";
                    return {
                        ok: true,
                        placed: true,
                        success: true,
                        method: fallbackMethod,
                        captionImportPrimaryMethod: primaryMethod,
                        createCaptionTrackAvailable: createCaptionTrackAvailable,
                        createCaptionTrackResult: createCaptionTrackResult,
                        fallbackUsed: fallbackUsed,
                        fallbackMethod: fallbackMethod,
                        fallbackResult: fallbackResult,
                        finalResult: "SUCCESS",
                        track: "C1",
                        at: String(insertTicks),
                        sequence: context.sequenceName,
                        playheadTicks: context.playheadTicks,
                        sourceTrack: (context.selectedClip.trackKind === "audio" ? "A" : "V") + (context.selectedClip.trackIndex + 1),
                        sourceClipName: context.selectedClip.name,
                        binPath: f.fsName
                    };
                } catch (eCap) {
                    fallbackResult = "FAILED: " + eCap.message;
                    return {
                        ok: true,
                        placed: false,
                        success: false,
                        method: fallbackMethod,
                        captionImportPrimaryMethod: primaryMethod,
                        createCaptionTrackAvailable: createCaptionTrackAvailable,
                        createCaptionTrackResult: createCaptionTrackResult,
                        fallbackUsed: true,
                        fallbackMethod: fallbackMethod,
                        fallbackResult: fallbackResult,
                        finalResult: "BIN_ONLY",
                        reason: "Caption import failed on the active sequence: " + eCap.message,
                        sequence: context.sequenceName,
                        playheadTicks: context.playheadTicks,
                        binPath: f.fsName
                    };
                }
            }

            if (IS_AEFT) {
                try {
                    var io = new ImportOptions(f);
                    var item = app.project.importFile(io);
                    return {
                        ok: true,
                        placed: false,
                        reason: "After Effects doesn't have caption tracks. SRT is in the project bin.",
                        itemId: item.id,
                        binPath: f.fsName
                    };
                } catch (eAE) {
                    return { ok: false, error: eAE.message, binPath: f.fsName };
                }
            }

            throw new Error("Unsupported host: " + APP);
        });
    };

    host.saadstudio.ping = function () {
        return { ok: true, host: APP, time: new Date().getTime() };
    };
})();
