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
    var PREMIERE_TICKS_PER_SECOND = 254016000000;

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

    host.saadstudio.getPodcastDiagnostics = function () {
        return safe(function () {
            if (!IS_PPRO) {
                return {
                    active: false,
                    sequenceId: null,
                    sequenceName: null,
                    premiereVersion: null,
                    videoTrackCount: 0,
                    audioTrackCount: 0
                };
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                return {
                    active: false,
                    sequenceId: null,
                    sequenceName: null,
                    premiereVersion: app.version || null,
                    videoTrackCount: 0,
                    audioTrackCount: 0
                };
            }
            var sequenceId = null;
            try {
                sequenceId = seq.sequenceID || seq.id || (seq.projectItem && seq.projectItem.nodeId) || null;
            } catch (eId) { sequenceId = null; }
            return {
                active: true,
                sequenceId: sequenceId,
                sequenceName: seq.name || null,
                premiereVersion: app.version || null,
                videoTrackCount: seq.videoTracks ? seq.videoTracks.numTracks : 0,
                audioTrackCount: seq.audioTracks ? seq.audioTracks.numTracks : 0
            };
        });
    };

    host.saadstudio.getPodcastTimelineLayout = function () {
        return safe(function () {
            if (!IS_PPRO) {
                return podcastEmptyTimelineLayout("unsupported", "Podcast timeline layout analysis only works inside Premiere Pro.");
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                return podcastEmptyTimelineLayout("no-sequence", "No active Premiere sequence detected.");
            }
            var sequenceId = null;
            try {
                sequenceId = seq.sequenceID || seq.id || (seq.projectItem && seq.projectItem.nodeId) || null;
            } catch (eId) { sequenceId = null; }
            return {
                status: "ready",
                sequenceId: sequenceId,
                sequenceName: seq.name || null,
                sequenceDurationSec: readSequenceDurationSec(seq),
                workArea: readSequenceWorkArea(seq),
                videoTracks: readPodcastTracks(seq.videoTracks, "video"),
                audioTracks: readPodcastTracks(seq.audioTracks, "audio"),
                supportedExecutionStrategies: [
                    "decision-plan-only",
                    "duplicate-sequence-cuts",
                    "track-enable-disable"
                ],
                unsupportedApis: [
                    "Official ExtendScript API for set/get active multicam camera angle"
                ],
                recommendedStrategy: "decision-plan-only",
                messages: [
                    "Timeline layout read only. No clips were changed.",
                    "Audio activity detection is a contract only in this phase."
                ]
            };
        });
    };

    host.saadstudio.getPodcastSynchronizationSnapshot = function () {
        return safe(function () {
            if (!IS_PPRO) {
                return podcastEmptySynchronizationSnapshot("unsupported", "Synchronization only works inside Premiere Pro.");
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                return podcastEmptySynchronizationSnapshot("no-sequence", "No active Premiere sequence detected.");
            }
            var sequenceId = null;
            try {
                sequenceId = seq.sequenceID || seq.id || (seq.projectItem && seq.projectItem.nodeId) || null;
            } catch (eId) { sequenceId = null; }
            return {
                status: "ready",
                sequenceId: sequenceId,
                sequenceName: seq.name || null,
                sequenceDurationSec: readSequenceDurationSec(seq),
                videoTrackCount: seq.videoTracks ? seq.videoTracks.numTracks : 0,
                audioTrackCount: seq.audioTracks ? seq.audioTracks.numTracks : 0,
                videoClips: readPodcastTimelineClips(seq.videoTracks, "video"),
                audioClips: readPodcastTimelineClips(seq.audioTracks, "audio"),
                messages: [
                    "Synchronization snapshot read only. No clips were moved.",
                    "Offset calculation requires waveform proof before any timeline movement."
                ],
                blockers: [],
                timelineMutation: "none",
                sequenceMutation: "none"
            };
        });
    };

    host.saadstudio.applyPodcastSynchronizationOffsets = function (offsets) {
        return safe(function () {
            var result = {
                ok: false,
                sequenceName: null,
                sequenceId: null,
                offsetsApplied: 0,
                clipsMoved: 0,
                movedItems: [],
                blockers: [],
                warnings: [],
                timelineMutation: "move current timeline clips",
                sequenceMutation: "none"
            };
            if (!IS_PPRO) {
                result.blockers.push("PREMIERE_REQUIRED");
                return result;
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                result.blockers.push("ACTIVE_SEQUENCE_REQUIRED");
                return result;
            }
            result.sequenceName = seq.name || null;
            try { result.sequenceId = seq.sequenceID || seq.id || (seq.projectItem && seq.projectItem.nodeId) || null; } catch (eSeqId) {}
            var list = offsets || [];
            if (!list.length) {
                result.blockers.push("SYNC_OFFSETS_REQUIRED_BEFORE_APPLY");
                return result;
            }
            for (var i = 0; i < list.length; i++) {
                var offset = list[i];
                var moveSec = Number(offset.suggestedMoveSec || 0);
                var targetStartSec = Number(offset.suggestedTimelineStartSec);
                if (!(Math.abs(moveSec) > 0.001)) continue;
                if (!isFinite(targetStartSec) || targetStartSec < 0) {
                    result.blockers.push("INVALID_SYNC_TARGET_START:" + targetStartSec);
                    continue;
                }
                var movedForOffset = 0;
                if (typeof offset.pairedVideoTrackIndex === "number") {
                    movedForOffset += moveSyncTrackItem(
                        seq.videoTracks,
                        "video",
                        Number(offset.pairedVideoTrackIndex),
                        Number(offset.pairedVideoClipIndex || 0),
                        moveSec,
                        targetStartSec,
                        result
                    );
                }
                movedForOffset += moveSyncTrackItem(
                    seq.audioTracks,
                    "audio",
                    Number(offset.audioTrackIndex),
                    Number(offset.audioClipIndex || 0),
                    moveSec,
                    targetStartSec,
                    result
                );
                if (movedForOffset > 0) result.offsetsApplied += 1;
            }
            result.ok = result.blockers.length === 0 && result.clipsMoved > 0;
            if (!result.ok && result.blockers.length === 0) result.blockers.push("NO_SYNC_CLIPS_MOVED");
            return result;
        });
    };

    host.saadstudio.inspectPodcastAudioSources = function (mappings) {
        return safe(function () {
            var result = {
                ok: false,
                sources: [],
                blockers: [],
                messages: []
            };
            if (!IS_PPRO) {
                result.blockers.push("PREMIERE_REQUIRED");
                result.messages.push("Audio Source Inspector only works inside Premiere Pro.");
                return result;
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                result.blockers.push("NO_ACTIVE_SEQUENCE");
                result.messages.push("No active Premiere sequence detected.");
                return result;
            }
            if (!mappings || !mappings.length) {
                result.blockers.push("NO_AUDIO_TRACK_MAPPINGS");
                result.messages.push("No explicit audio track mappings were provided.");
                return result;
            }
            for (var i = 0; i < mappings.length; i++) {
                inspectMappedAudioTrack(seq, mappings[i], result);
            }
            result.ok = result.blockers.length === 0 && result.sources.length > 0;
            result.messages.push("Audio source inspection is read-only. No clips or sequences were changed.");
            return result;
        });
    };

    host.saadstudio.duplicateActiveSequenceForPodcast = function (newName) {
        return safe(function () {
            var proof = {
                errors: [],
                blockers: [],
                renameAttempted: false,
                renameResult: false,
                newSequenceDetected: false,
                cloneResult: false
            };
            if (!IS_PPRO) {
                proof.blockers.push("Safe edit copy works only inside Premiere Pro.");
                return {
                    ok: false,
                    reason: "Safe edit copy works only inside Premiere Pro.",
                    mutation: "duplicate-only",
                    duplicateProof: proof
                };
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                proof.blockers.push("No active sequence.");
                return {
                    ok: false,
                    reason: "No active sequence.",
                    mutation: "duplicate-only",
                    duplicateProof: proof
                };
            }
            if (!seq.clone) {
                proof.originalSequenceName = seq.name || null;
                proof.originalSequenceID = readSequenceID(seq);
                proof.blockers.push("Sequence.clone() is not available in this Premiere runtime.");
                return {
                    ok: false,
                    reason: "Sequence.clone() is not available in this Premiere runtime.",
                    originalSequenceName: seq.name || null,
                    mutation: "duplicate-only",
                    duplicateProof: proof
                };
            }

            var originalName = seq.name || null;
            var originalId = readSequenceID(seq);
            var beforeSnapshots = readSequenceSnapshots();
            var beforeIds = sequenceIDSet(beforeSnapshots);
            var beforeCount = app.project.sequences ? app.project.sequences.numSequences : 0;
            proof.originalSequenceName = originalName;
            proof.originalSequenceID = originalId;
            proof.sequencesCountBefore = beforeCount;
            proof.sequenceNamesBefore = sequenceNamesFromSnapshots(beforeSnapshots);
            proof.sequenceIDsBefore = sequenceIDsFromSnapshots(beforeSnapshots);

            var cloneOk = false;
            try {
                cloneOk = seq.clone();
            } catch (eClone) {
                proof.errors.push(String(eClone.message || eClone));
                cloneOk = false;
            }
            proof.cloneResult = cloneOk === true;

            var afterSnapshots = readSequenceSnapshots();
            proof.sequencesCountAfter = app.project.sequences ? app.project.sequences.numSequences : 0;
            proof.sequenceNamesAfter = sequenceNamesFromSnapshots(afterSnapshots);
            proof.sequenceIDsAfter = sequenceIDsFromSnapshots(afterSnapshots);

            if (cloneOk !== true) {
                proof.blockers.push("sequence.clone() failed or returned false.");
                return {
                    ok: false,
                    reason: "sequence.clone() failed or returned false.",
                    originalSequenceName: originalName,
                    originalSequenceId: originalId,
                    mutation: "duplicate-only",
                    duplicateProof: proof
                };
            }

            var newSeq = findNewSequenceBySequenceIDDiff(beforeIds);
            if (!newSeq && proof.sequencesCountAfter > beforeCount) {
                newSeq = app.project.sequences[proof.sequencesCountAfter - 1];
            }
            if (!newSeq) {
                proof.blockers.push("clone returned true but new sequence could not be detected.");
                return {
                    ok: false,
                    reason: "clone returned true but new sequence could not be detected.",
                    originalSequenceName: originalName,
                    originalSequenceId: originalId,
                    mutation: "duplicate-only",
                    duplicateProof: proof
                };
            }
            proof.newSequenceDetected = true;
            proof.detectedNewSequenceID = readSequenceID(newSeq);
            proof.detectedNewSequenceNameBeforeRename = newSeq.name || null;

            var desiredName = String(newName || (originalName + " - Saad Auto Edit Draft"));
            proof.renameAttempted = true;
            try { newSeq.name = desiredName; } catch (eName) { proof.errors.push(String(eName.message || eName)); }
            try {
                if (newSeq.projectItem) newSeq.projectItem.name = desiredName;
            } catch (eProjectItemName) { proof.errors.push(String(eProjectItemName.message || eProjectItemName)); }
            try {
                if (newSeq.projectItem) moveGeneratedProjectItemToBin(newSeq.projectItem, "Sequences", proof);
            } catch (eMoveSequence) {}
            proof.finalNewSequenceName = newSeq.name || null;
            proof.renameResult = proof.finalNewSequenceName === desiredName;
            var activeAfter = app.project && app.project.activeSequence;
            proof.activeSequenceAfterCloneName = activeAfter ? (activeAfter.name || null) : null;
            proof.activeSequenceAfterCloneID = activeAfter ? readSequenceID(activeAfter) : null;

            if (!proof.renameResult) {
                proof.blockers.push("clone succeeded but rename verification failed.");
            }

            return {
                ok: proof.renameResult,
                message: proof.renameResult ? "Safe edit copy created. No cuts were applied." : undefined,
                reason: proof.renameResult ? undefined : "clone succeeded but rename verification failed.",
                originalSequenceName: originalName,
                newSequenceName: proof.finalNewSequenceName,
                originalSequenceId: originalId,
                newSequenceId: proof.detectedNewSequenceID,
                mutation: "duplicate-only",
                duplicateProof: proof
            };
        });
    };

    host.saadstudio.testPodcastSafeDuplicateSequence = function () {
        return safe(function () {
            var result = createPodcastResearchDuplicate("Duplicate Runtime Test");
            result.test = "safe-duplicate-sequence";
            result.timelineMutation = "duplicate only";
            result.originalTouched = false;
            return result;
        });
    };

    host.saadstudio.testPodcastDisableEnableOnDuplicate = function () {
        return safe(function () {
            var result = createPodcastResearchDuplicate("Disable Enable Runtime Test");
            result.test = "disable-enable-clip-on-duplicate";
            result.timelineMutation = "duplicate + disabled toggle on duplicate only";
            result.disabledPropertyExists = false;
            result.disableAttempted = false;
            result.disableResult = false;
            result.enableResult = false;
            result.targetClipName = null;
            if (!result.ok || !result.newSequence) return stripRuntimeSequence(result);
            var clip = firstClipFromSequence(result.newSequence);
            if (!clip) {
                result.blockers.push("NO_CLIP_ON_DUPLICATED_SEQUENCE");
                return stripRuntimeSequence(result);
            }
            result.targetClipName = clip.name || null;
            result.disabledPropertyExists = typeof clip.disabled !== "undefined";
            if (!result.disabledPropertyExists) {
                result.blockers.push("TRACKITEM_DISABLED_PROPERTY_UNAVAILABLE");
                return stripRuntimeSequence(result);
            }
            result.disableAttempted = true;
            try {
                clip.disabled = true;
                result.disableResult = clip.disabled === true;
                clip.disabled = false;
                result.enableResult = clip.disabled === false;
            } catch (eToggle) {
                result.errors.push(String(eToggle.message || eToggle));
            }
            if (!result.disableResult || !result.enableResult) {
                result.blockers.push("DISABLE_ENABLE_VERIFICATION_FAILED");
            }
            result.ok = result.blockers.length === 0;
            return stripRuntimeSequence(result);
        });
    };

    host.saadstudio.testPodcastInsertOverwriteOnDuplicate = function () {
        return safe(function () {
            var result = createPodcastResearchDuplicate("Insert Overwrite Runtime Test");
            result.test = "insert-overwrite-on-duplicate";
            result.timelineMutation = "duplicate + API surface check on duplicate only";
            result.insertClipExists = false;
            result.overwriteClipExists = false;
            result.trackItemCloneExists = false;
            result.insertAttempted = false;
            result.overwriteAttempted = false;
            result.insertResult = null;
            result.overwriteResult = null;
            result.targetTrackIndex = 0;
            if (!result.ok || !result.newSequence) return stripRuntimeSequence(result);
            var videoTrack = result.newSequence.videoTracks && result.newSequence.videoTracks.numTracks > 0
                ? result.newSequence.videoTracks[0]
                : null;
            var clip = firstClipFromSequence(result.newSequence);
            if (!videoTrack) result.blockers.push("NO_VIDEO_TRACK_ON_DUPLICATED_SEQUENCE");
            result.insertClipExists = !!(videoTrack && videoTrack.insertClip);
            result.overwriteClipExists = !!(videoTrack && videoTrack.overwriteClip);
            result.trackItemCloneExists = !!(clip && clip.clone);
            if (!result.insertClipExists) result.blockers.push("INSERTCLIP_UNAVAILABLE");
            if (!result.overwriteClipExists) result.blockers.push("OVERWRITECLIP_UNAVAILABLE");
            result.ok = result.blockers.length === 0;
            return stripRuntimeSequence(result);
        });
    };

    host.saadstudio.testPodcastDisableTimeRangeOnDuplicate = function () {
        return safe(function () {
            var result = createPodcastResearchDuplicate("Disable Time Range Runtime Test");
            result.test = "disable-time-range-on-duplicate";
            result.timelineMutation = "duplicate + disabled toggle on duplicate only";
            result.requestedDecision = {
                activeStartSec: 0,
                activeEndSec: 20,
                inactiveStartSec: 20,
                inactiveEndSec: 40
            };
            result.targetClipName = null;
            result.targetClipStartSec = null;
            result.targetClipEndSec = null;
            result.targetClipDurationSec = null;
            result.disabledPropertyExists = false;
            result.timeRangeDisableApiFound = false;
            result.wholeClipDisableObserved = false;
            result.disabledBefore = null;
            result.disabledAfterTrue = null;
            result.disabledAfterRestore = null;
            result.provenApi = null;
            if (!result.ok || !result.newSequence) return stripRuntimeSequence(result);

            var clip = firstLongClipOnVideoTrack(result.newSequence, 0, 40);
            if (!clip) {
                result.blockers.push("NO_LONG_V1_CLIP_FOUND");
                result.ok = false;
                return stripRuntimeSequence(result);
            }
            result.targetClipName = clip.name || null;
            result.targetClipStartSec = readTimeSeconds(clip.start);
            result.targetClipEndSec = readTimeSeconds(clip.end);
            result.targetClipDurationSec = selectedTimelineDurationSec(clip);
            result.disabledPropertyExists = typeof clip.disabled !== "undefined";
            result.timeRangeDisableApiFound = hasTimeRangeDisableApi(clip);

            if (!result.disabledPropertyExists) {
                result.blockers.push("TRACKITEM_DISABLED_PROPERTY_UNAVAILABLE");
                result.ok = false;
                return stripRuntimeSequence(result);
            }
            if (result.timeRangeDisableApiFound) {
                result.provenApi = "A time-range disable API-like method exists on TrackItem; manual review required before using it.";
                result.ok = true;
                return stripRuntimeSequence(result);
            }

            try {
                result.disabledBefore = clip.disabled === true;
                clip.disabled = true;
                result.disabledAfterTrue = clip.disabled === true;
                clip.disabled = result.disabledBefore;
                result.disabledAfterRestore = clip.disabled === result.disabledBefore;
                result.wholeClipDisableObserved = result.disabledAfterTrue === true;
            } catch (eDisableRange) {
                result.errors.push(String(eDisableRange.message || eDisableRange));
            }

            result.blockers.push("DISABLE_IS_TRACK_ITEM_WIDE_NOT_TIME_RANGE");
            result.reason = "TrackItem.disabled is a property on the entire TrackItem. ExtendScript exposes no documented start/end range for disabling only 20-40s inside one long clip without cutting first.";
            result.ok = false;
            return stripRuntimeSequence(result);
        });
    };

    host.saadstudio.testPodcastReconstructInsertOverwriteOnDuplicate = function () {
        return safe(function () {
            var result = createPodcastResearchDuplicate("Reconstruct Insert Overwrite Runtime Test");
            result.ok = false;
            result.strategy = "reconstruct-timeline-insert-overwrite-proof";
            result.test = "reconstruct-insert-overwrite-two-segments";
            result.timelineMutation = "duplicate + insert/overwrite proof on duplicate only";
            result.originalTouched = false;
            result.decisionsTested = 2;
            result.segmentsAttempted = 2;
            result.segmentsInserted = 0;
            result.methodUsed = null;
            result.segmentResults = [];

            var decisions = [
                { cameraLabel: "V1", sourceVideoTrackIndex: 0, startSec: 0, endSec: 20.2, targetStartSec: 0 },
                { cameraLabel: "V2", sourceVideoTrackIndex: 1, startSec: 20.021, endSec: 40.595, targetStartSec: 20.2 }
            ];
            if (!result.duplicateValidationPassed || !result.newSequence) {
                for (var d = 0; d < decisions.length; d++) {
                    var blockedSegment = emptyReconstructSegmentResult(decisions[d], d);
                    if (result.cloneResult !== true) blockedSegment.blockers.push("DUPLICATE_SEQUENCE_FAILED");
                    else if (!result.newSequenceID) blockedSegment.blockers.push("DUPLICATED_SEQUENCE_ID_NOT_DETECTED");
                    else if (result.newSequenceID === result.originalSequenceID) blockedSegment.blockers.push("DUPLICATED_SEQUENCE_ID_MATCHES_ORIGINAL");
                    else blockedSegment.blockers.push("DUPLICATE_VALIDATION_FAILED");
                    result.segmentResults.push(blockedSegment);
                }
                if (result.blockers.length === 0) result.blockers.push("DUPLICATE_VALIDATION_FAILED");
                return stripRuntimeSequence(result);
            }
            var targetTrack = result.newSequence.videoTracks && result.newSequence.videoTracks.numTracks > 0
                ? result.newSequence.videoTracks[0]
                : null;

            for (var i = 0; i < decisions.length; i++) {
                var segment = reconstructDecisionSegment(result.newSequence, targetTrack, decisions[i], i);
                result.segmentResults.push(segment);
                if (segment.ok) result.segmentsInserted += 1;
                appendAll(result.blockers, segment.blockers);
                appendAll(result.errors, segment.errors);
            }

            result.methodUsed = result.segmentsInserted > 0
                ? "projectItem.createSubClip(source in/out ticks) + videoTrack.overwriteClip(subclip, target ticks)"
                : null;
            if (result.segmentsInserted !== result.segmentsAttempted && result.blockers.length === 0) {
                result.blockers.push("INSERT_OVERWRITE_CANNOT_SET_SOURCE_IN_OUT");
            }
            result.ok = result.blockers.length === 0 && result.segmentsInserted === result.segmentsAttempted;
            return stripRuntimeSequence(result);
        });
    };

    host.saadstudio.inspectAutoZoomTimeline = function (settings) {
        return safe(function () {
            var input = settings || {};
            var result = emptyAutoZoomInspectionResult();
            if (!IS_PPRO) {
                result.blockers.push("PREMIERE_REQUIRED");
                return result;
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                result.blockers.push("ACTIVE_SEQUENCE_REQUIRED");
                return result;
            }
            result.sequenceName = seq.name || null;
            result.sequenceId = readSequenceID(seq);
            result.durationSec = readSequenceDurationSec(seq);
            result.videoTrackCount = seq.videoTracks ? seq.videoTracks.numTracks : 0;
            var analyzedTracks = input.analyzedVideoTrackIndexes || [];
            var forceAutoDetect = input.autoDetectAnalyzedTrack === true || !analyzedTracks.length || analyzedTracks[0] === -1;
            if (forceAutoDetect) {
                var automaticallyDetectedTrack = findBestAutoZoomTrackIndex(seq);
                analyzedTracks = automaticallyDetectedTrack >= 0 ? [automaticallyDetectedTrack] : [];
            }
            for (var trackIndex = 0; trackIndex < analyzedTracks.length; trackIndex++) {
                var normalizedTrackIndex = Number(analyzedTracks[trackIndex]);
                if (normalizedTrackIndex < 0 || normalizedTrackIndex >= result.videoTrackCount) {
                    result.blockers.push("AUTO_ZOOM_ANALYZED_TRACK_NOT_FOUND");
                    continue;
                }
                result.analyzedVideoTrackIndexes.push(normalizedTrackIndex);
            }
            result.cutEventsSec = collectAutoZoomCutEvents(
                seq,
                result.analyzedVideoTrackIndexes,
                normalizeOptionalTrackIndex(input.excludedSourceVideoTrackIndex)
            );
            if (!result.analyzedVideoTrackIndexes.length) result.blockers.push("AUTO_ZOOM_TRACK_WITH_CUTS_NOT_FOUND");
            result.adjustmentLayerCount = countAdjustmentLayersInProject(app.project.rootItem);
            var appProjectAdjustmentLayerAvailable = false;
            try {
                appProjectAdjustmentLayerAvailable = !!app.project
                    && typeof app.project.newAdjustmentLayer === "function";
            } catch (eAppProjectAdjustment) {}
            try {
                app.enableQE();
                result.qeAvailable = typeof qe !== "undefined" && !!qe.project;
                result.newAdjustmentLayerAvailable = appProjectAdjustmentLayerAvailable
                    || (result.qeAvailable && typeof qe.project.newAdjustmentLayer === "function");
                try {
                    result.directTransformAvailable = result.qeAvailable
                        && !!qe.project.getVideoEffectByName("Transform");
                } catch (eTransformProbe) {}
            } catch (eQE) {
                result.warnings.push("QE_RUNTIME_UNAVAILABLE:" + String(eQE.message || eQE));
                result.newAdjustmentLayerAvailable = appProjectAdjustmentLayerAvailable;
            }
            result.executionMode = result.newAdjustmentLayerAvailable
                ? "adjustment-layer"
                : (result.directTransformAvailable ? "direct-transform" : null);
            if (result.executionMode === "adjustment-layer") {
                var highestAnalyzedTrackIndex = result.analyzedVideoTrackIndexes.length
                    ? result.analyzedVideoTrackIndexes[result.analyzedVideoTrackIndexes.length - 1]
                    : -1;
                if (highestAnalyzedTrackIndex >= result.videoTrackCount - 1) {
                    result.blockers.push("AUTO_ZOOM_REQUIRES_AN_UPPER_VIDEO_TRACK");
                }
            }
            if (!result.cutEventsSec.length) result.blockers.push("NO_TIMELINE_CUTS_DETECTED");
            if (!result.executionMode) result.blockers.push("AUTO_ZOOM_EFFECT_RUNTIME_UNAVAILABLE");
            result.ok = result.blockers.length === 0;
            return result;
        });
    };

    host.saadstudio.applyAutoZoom = function (settings) {
        return safe(function () {
            var input = settings || {};
            var result = emptyAutoZoomApplyResult();
            if (!IS_PPRO) {
                result.blockers.push("PREMIERE_REQUIRED");
                return result;
            }
            var seq = app.project && app.project.activeSequence;
            if (!seq) {
                result.blockers.push("ACTIVE_SEQUENCE_REQUIRED");
                return result;
            }
            result.sequenceName = seq.name || null;
            var analyzedTracks = input.analyzedVideoTrackIndexes || [0];
            var targetTrackIndex = Number(input.targetVideoTrackIndex);
            var maxAnalyzedTrackIndex = -1;
            for (var a = 0; a < analyzedTracks.length; a++) {
                var analyzedIndex = Number(analyzedTracks[a]);
                if (analyzedIndex > maxAnalyzedTrackIndex) maxAnalyzedTrackIndex = analyzedIndex;
            }
            if (!seq.videoTracks) {
                result.blockers.push("AUTO_ZOOM_VIDEO_TRACKS_NOT_FOUND");
                return result;
            }
            var styles = normalizeAutoZoomStyles(input.styles);
            if (!styles.length) styles.push("smooth");
            var maxZoomPercentage = clampNumber(Number(input.maxZoomPercentage || 1.3), 1.01, 2);
            var zoomDurationSec = clampNumber(Number(input.zoomDurationSec || 1.5), 0.25, 10);
            var rhythmPercentage = clampNumber(Number(input.rhythmPercentage || 0.6), 0.1, 1);
            var frameDurationSec = readSequenceFrameDurationSec(seq);
            var excludedSourceVideoTrackIndex = normalizeOptionalTrackIndex(input.excludedSourceVideoTrackIndex);
            var events = collectAutoZoomCutEvents(seq, analyzedTracks, excludedSourceVideoTrackIndex);
            result.eventsDetected = events.length;
            var selectedEvents = selectAutoZoomEvents(events, rhythmPercentage, zoomDurationSec);
            if (selectedEvents.length > 300) {
                result.blockers.push("TOO_MANY_AUTO_ZOOM_EVENTS_MAX_300");
                return result;
            }
            result.eventsSelected = selectedEvents.length;
            if (!selectedEvents.length) {
                result.blockers.push("NO_AUTO_ZOOM_EVENTS");
                return result;
            }
            var adjustmentRuntimeAvailable = hasAutoZoomAdjustmentLayerRuntime();
            var directTransformAvailable = hasAutoZoomDirectTransformRuntime(seq, analyzedTracks);
            var executionMode = adjustmentRuntimeAvailable ? "adjustment-layer" : (directTransformAvailable ? "direct-transform" : null);
            result.executionMode = executionMode;
            if (!executionMode) {
                result.blockers.push("AUTO_ZOOM_EFFECT_RUNTIME_UNAVAILABLE");
                return result;
            }
            var adjustmentItem = null;
            var targetTrack = null;
            if (executionMode === "adjustment-layer") {
                if (targetTrackIndex < 0 || targetTrackIndex >= seq.videoTracks.numTracks) {
                    result.blockers.push("AUTO_ZOOM_TARGET_TRACK_NOT_FOUND");
                    return result;
                }
                if (targetTrackIndex <= maxAnalyzedTrackIndex) {
                    result.blockers.push("AUTO_ZOOM_TARGET_TRACK_MUST_BE_ABOVE_ANALYZED_TRACKS");
                    return result;
                }
                targetTrack = seq.videoTracks[targetTrackIndex];
                try {
                    var targetClips = targetTrack.clips;
                    if (targetClips) {
                        for (var tc = targetClips.numItems - 1; tc >= 0; tc--) {
                            var tClip = targetClips[tc];
                            if (tClip && tClip.remove) {
                                tClip.remove(false, false);
                            }
                        }
                    }
                } catch (eCleanupTarget) {
                    result.warnings.push("TARGET_TRACK_CLEANUP_FAILED:" + String(eCleanupTarget.message || eCleanupTarget));
                }
                adjustmentItem = getOrCreateAutoZoomAdjustmentLayer(seq, zoomDurationSec, result);
                if (!adjustmentItem) {
                    if (!result.blockers.length) result.blockers.push("AUTO_ZOOM_ADJUSTMENT_LAYER_CREATION_FAILED");
                    return result;
                }
                result.createdProjectItemName = adjustmentItem.name || null;
                moveGeneratedProjectItemToBin(adjustmentItem, "Auto Zoom", result);
                try { targetTrack.name = "Saad Auto Zoom"; } catch (eTrackName) {}
            } else if (executionMode === "direct-transform") {
                try {
                    for (var a = 0; a < analyzedTracks.length; a++) {
                        var trackIndex = Number(analyzedTracks[a]);
                        if (trackIndex >= 0 && trackIndex < seq.videoTracks.numTracks) {
                            var trackClips = seq.videoTracks[trackIndex].clips;
                            if (trackClips) {
                                for (var tc = 0; tc < trackClips.numItems; tc++) {
                                    var scaleProperty = findAutoZoomMotionScaleProperty(trackClips[tc]);
                                    if (scaleProperty && typeof scaleProperty.setTimeVarying === "function") {
                                        scaleProperty.setTimeVarying(false);
                                        scaleProperty.setValue(100, true);
                                    }
                                }
                            }
                        }
                    }
                } catch (eCleanupDirect) {
                    result.warnings.push("DIRECT_ZOOM_CLEANUP_FAILED:" + String(eCleanupDirect.message || eCleanupDirect));
                }
            }
            for (var i = 0; i < selectedEvents.length; i++) {
                var startSec = selectedEvents[i];
                var endSec = Math.min(readSequenceDurationSec(seq), startSec + zoomDurationSec);
                var style = styles[0];
                var eventResult = {
                    timeSec: startSec,
                    endSec: endSec,
                    style: style,
                    inserted: false,
                    effectApplied: false,
                    error: null
                };
                try {
                    if (executionMode === "adjustment-layer") {
                        targetTrack.overwriteClip(adjustmentItem, secondsToTicksString(startSec));
                        var inserted = findTrackItemAtTime(targetTrack, startSec, adjustmentItem.name || "");
                        if (!inserted) throw new Error("Inserted adjustment layer was not found on the target track.");
                        eventResult.inserted = true;
                        result.adjustmentLayersInserted += 1;
                        if (!applyAutoZoomTransform(seq, targetTrackIndex, inserted.index, inserted.clip, startSec, endSec, style, maxZoomPercentage, frameDurationSec, result)) {
                            throw new Error("Transform effect or Scale keyframes could not be applied.");
                        }
                    } else {
                        var directTarget = findAutoZoomSourceClipAtTime(seq, analyzedTracks, startSec);
                        if (!directTarget) throw new Error("No source clip covers the Auto Zoom event.");
                        eventResult.targetTrackIndex = directTarget.trackIndex;
                        eventResult.targetClipIndex = directTarget.clipIndex;
                        var directEndSec = Math.min(endSec, readTimeSeconds(directTarget.clip && directTarget.clip.end));
                        if (!applyAutoZoomTransform(seq, directTarget.trackIndex, directTarget.clipIndex, directTarget.clip, startSec, directEndSec, style, maxZoomPercentage, frameDurationSec, result)) {
                            throw new Error("Transform effect or Scale keyframes could not be applied to the source clip.");
                        }
                    }
                    eventResult.effectApplied = true;
                    result.effectsApplied += 1;
                } catch (eEvent) {
                    eventResult.error = String(eEvent.message || eEvent);
                    result.failedEvents += 1;
                }
                result.eventResults.push(eventResult);
            }
            result.timelineMutation = executionMode === "adjustment-layer"
                ? "adjustment layers added on V" + (targetTrackIndex + 1)
                : "editable Motion Scale effects added to analyzed source clips";
            result.ok = result.blockers.length === 0
                && result.effectsApplied > 0
                && result.failedEvents === 0;
            if (result.ok) {
                for (var previewIndex = 0; previewIndex < result.eventResults.length; previewIndex++) {
                    var previewEvent = result.eventResults[previewIndex];
                    if (!previewEvent.effectApplied) continue;
                    result.previewTimeSec = calculateAutoZoomPeakTime(
                        previewEvent.timeSec,
                        previewEvent.endSec,
                        previewEvent.style,
                        frameDurationSec
                    );
                    try { seq.setPlayerPosition(timelineSecondsToPlayerTicks(seq, result.previewTimeSec)); } catch (ePreviewPosition) {
                        result.warnings.push("AUTO_ZOOM_PREVIEW_SEEK_FAILED");
                    }
                    if (!selectAutoZoomPreviewClip(seq, previewEvent)) {
                        result.warnings.push("AUTO_ZOOM_PREVIEW_CLIP_SELECTION_FAILED");
                    }
                    break;
                }
            }
            if (!result.ok && !result.blockers.length) result.blockers.push("AUTO_ZOOM_PARTIAL_OR_FAILED");
            return result;
        });
    };

    host.saadstudio.applyPodcastCameraDecisionsOverlapAwareVisualOnly = function (cameraDecisions, minimumShotLengthSec) {
        return safe(function () {
            var decisions = cameraDecisions || [];
            var minimumShotLength = Number(minimumShotLengthSec);
            if (!isFinite(minimumShotLength)) minimumShotLength = 2;
            minimumShotLength = Math.max(0.5, Math.min(10, minimumShotLength));
            var activeSeq = app.project && app.project.activeSequence;
            var activeSeqName = activeSeq && activeSeq.name ? String(activeSeq.name) : "";
            if (isGeneratedPodcastTestSequenceName(activeSeqName) || isAutoSwitchDraftSequenceName(activeSeqName)) {
                return {
                    ok: false,
                    strategy: "apply-camera-decisions-overlap-aware-visual-only",
                    originalSequenceID: activeSeq ? readSequenceID(activeSeq) : null,
                    duplicateSequenceID: null,
                    decisionsCount: decisions.length,
                    segmentsAttempted: decisions.length,
                    segmentsInserted: 0,
                    segmentsSkipped: 0,
                    generatedTargetTrackName: "Saad Auto Switch",
                    segmentResults: [],
                    blockers: [isAutoSwitchDraftSequenceName(activeSeqName)
                        ? "ACTIVE_SEQUENCE_IS_AUTO_SWITCH_DRAFT"
                        : "ACTIVE_SEQUENCE_IS_GENERATED_TEST_SEQUENCE"],
                    warnings: [],
                    errors: [],
                    originalTouched: false,
                    timelineMutation: "none"
                };
            }
            var draftName = (activeSeqName || "Sequence") + " - Saad Auto Switch Draft";
            var result = createPodcastResearchDuplicate("Auto Switch Draft", draftName);
            result.strategy = "apply-camera-decisions-overlap-aware-visual-only";
            result.timelineMutation = "duplicate + visual-only reconstructed segments on duplicate only";
            result.originalTouched = false;
            result.originalSequenceID = result.originalSequenceID || null;
            result.duplicateSequenceID = result.newSequenceID || null;
            result.generatedTargetTrackName = "Saad Auto Switch";
            result.decisionsCount = decisions.length;
            result.segmentsAttempted = decisions.length;
            result.segmentsInserted = 0;
            result.segmentsSkipped = 0;
            result.segmentResults = [];
            result.warnings = [];
            organizeExistingGeneratedProjectItems(result);

            if (!decisions.length) {
                result.blockers.push("CAMERA_DECISIONS_REQUIRED");
                result.ok = false;
                return stripRuntimeSequence(result);
            }

            if (!result.duplicateValidationPassed || !result.newSequence) {
                if (result.blockers.length === 0) result.blockers.push("DUPLICATE_VALIDATION_FAILED");
                result.ok = false;
                return stripRuntimeSequence(result);
            }

            var seq = result.newSequence;
            var targetTrackInfo = findSafeAutoSwitchTargetTrack(seq);
            var targetTrack = targetTrackInfo.track;
            result.targetVideoTrackIndex = targetTrackInfo.index;
            if (!targetTrack || !targetTrack.overwriteClip) {
                result.blockers.push(targetTrackInfo.blocker || "TARGET_OVERWRITECLIP_NOT_AVAILABLE");
                result.ok = false;
                return stripRuntimeSequence(result);
            }
            if (targetTrackInfo.usesOccupiedTrack) {
                result.warnings.push("USING_OCCUPIED_TOP_VIDEO_TRACK_ON_SAFE_DUPLICATE");
            }
            try { targetTrack.name = result.generatedTargetTrackName; } catch (eTargetName) {
                result.warnings.push("TARGET_TRACK_RENAME_UNSUPPORTED");
            }

            var prepared = [];
            var belowMinimumCount = 0;
            for (var i = 0; i < decisions.length; i++) {
                var preparedSegment = prepareVisualOnlyCameraDecisionSegment(seq, decisions[i], i);
                result.segmentResults.push(preparedSegment.publicResult);
                prepared.push(preparedSegment);
                if (preparedSegment.publicResult.blockers.length > 0) {
                    result.warnings.push("SKIPPED_DECISION_" + (i + 1) + ": " + preparedSegment.publicResult.blockers.join("|"));
                }
                if (preparedSegment.publicResult.matchType === "SKIPPED_NO_OVERLAP") result.segmentsSkipped += 1;
                if (preparedSegment.publicResult.matchType === "PARTIAL_MATCH") {
                    result.warnings.push("PARTIAL_MATCH_GAP decision " + (i + 1) + " uses overlap only.");
                }
                if (preparedSegment.subclip
                    && preparedSegment.publicResult.overlapDurationSec + 0.001 < minimumShotLength
                    && decisions.length > 1) {
                    belowMinimumCount += 1;
                    preparedSegment.publicResult.blockers.push("OUTPUT_SEGMENT_BELOW_MINIMUM_SHOT_LENGTH");
                }
            }

            if (belowMinimumCount > 0) {
                result.blockers.push("MINIMUM_SHOT_LENGTH_NOT_ENFORCED_AT_RUNTIME");
                result.ok = false;
                return stripRuntimeSequence(result);
            }

            if (prepared.length > 0 && prepared.length === result.segmentsSkipped) {
                result.blockers.push("NO_VALID_CAMERA_DECISIONS_AFTER_OVERLAP_VALIDATION");
                result.ok = false;
                return stripRuntimeSequence(result);
            }

            for (var p = 0; p < prepared.length; p++) {
                var segment = prepared[p];
                var publicResult = segment.publicResult;
                if (!segment.subclip) continue;
                try {
                    targetTrack.overwriteClip(segment.subclip, secondsToTicksString(publicResult.overlapStartSec));
                    publicResult.targetVideoTrackIndex = targetTrackInfo.index;
                    publicResult.overwriteResult = true;
                    result.segmentsInserted += 1;
                } catch (eOverwriteApply) {
                    publicResult.overwriteResult = false;
                    publicResult.blockers.push("OVERWRITECLIP_FAILED");
                    publicResult.errors.push(String(eOverwriteApply.message || eOverwriteApply));
                    appendAll(result.blockers, publicResult.blockers);
                    appendAll(result.errors, publicResult.errors);
                }
            }

            result.ok = result.blockers.length === 0 && result.segmentsInserted > 0;
            return stripRuntimeSequence(result);
        });
    };

    function findSafeAutoSwitchTargetTrack(seq) {
        var result = {
            track: null,
            index: null,
            blocker: null,
            usesOccupiedTrack: false
        };
        if (!seq || !seq.videoTracks || seq.videoTracks.numTracks <= 0) {
            result.blocker = "TARGET_VIDEO_TRACK_NOT_AVAILABLE";
            return result;
        }

        var highestWritableTrack = null;
        var highestWritableIndex = null;
        for (var t = seq.videoTracks.numTracks - 1; t >= 0; t--) {
            var track = seq.videoTracks[t];
            if (!track || !track.overwriteClip) continue;
            if (!highestWritableTrack) {
                highestWritableTrack = track;
                highestWritableIndex = t;
            }
            var clips = track.clips;
            if (!clips || clips.numItems === 0) {
                result.track = track;
                result.index = t;
                return result;
            }
        }

        if (highestWritableTrack) {
            result.track = highestWritableTrack;
            result.index = highestWritableIndex;
            result.usesOccupiedTrack = true;
            return result;
        }

        result.blocker = "NO_WRITABLE_VIDEO_TRACK_FOR_SAFE_OUTPUT";
        return result;
    }

    host.saadstudio.applyPodcastSilenceRemovalVisualOnly = function (keepSegments, silenceRemovedCount, totalRemovedDurationSec, sequenceDurationSec, analyzedDurationSec, audioSourceDurationSec) {
        return safe(function () {
            var segments = keepSegments || [];
            var activeSeq = app.project && app.project.activeSequence;
            var activeSeqName = activeSeq && activeSeq.name ? String(activeSeq.name) : "";
            var normalizedSequenceDurationSec = normalizeOptionalNumber(sequenceDurationSec);
            var normalizedAnalyzedDurationSec = normalizeOptionalNumber(analyzedDurationSec);
            var normalizedAudioSourceDurationSec = normalizeOptionalNumber(audioSourceDurationSec);
            var generatedSequenceDetection = detectGeneratedPodcastSequenceName(activeSeqName);
            if (generatedSequenceDetection.matched) {
                return {
                    ok: false,
                    strategy: "silence-removal-audio-video",
                    activeSequenceName: activeSeqName,
                    generatedSequenceDetectionRule: generatedSequenceDetection.rule,
                    matchedPattern: generatedSequenceDetection.matchedPattern,
                    blockerSource: "applyPodcastSilenceRemovalVisualOnly.generated-sequence-guard",
                    originalSequenceID: activeSeq ? readSequenceID(activeSeq) : null,
                    duplicateSequenceID: null,
                    draftSequenceName: null,
                    sequenceDurationSec: normalizedSequenceDurationSec,
                    analyzedDurationSec: normalizedAnalyzedDurationSec,
                    audioSourceDurationSec: normalizedAudioSourceDurationSec,
                    silenceRemovedCount: Number(silenceRemovedCount || 0),
                    totalRemovedDurationSec: Number(totalRemovedDurationSec || 0),
                    keptSegmentsCount: segments.length,
                    segmentsAttempted: segments.length,
                    visualSegmentsInserted: 0,
                    audioSegmentsInserted: 0,
                    processedVideoTracks: 0,
                    processedAudioTracks: 0,
                    videoSegmentsInsertedByTrack: [],
                    audioSegmentsInsertedByTrack: [],
                    skippedSegmentsByTrack: { video: [], audio: [] },
                    operationPlanBuildCalled: false,
                    operationPlanCount: 0,
                    timelineClipDiscovery: inspectSilenceRemovalTimelineClips(activeSeq),
                    originalTracksHiddenOrDisabledOnDuplicate: false,
                    blockers: ["ACTIVE_SEQUENCE_IS_GENERATED_TEST_SEQUENCE"],
                    warnings: ["Generated sequence guard matched: " + generatedSequenceDetection.matchedPattern],
                    errors: [],
                    originalTouched: false,
                    timelineMutation: "duplicate + audio-video silence-removed draft on duplicate only"
                };
            }

            var draftName = activeSeqName || "Sequence";
            var result = emptyPodcastExecutionResult();
            result.strategy = "silence-removal-audio-video";
            result.timelineMutation = "reconstruct silence-removed audio/video on current sequence";
            result.originalTouched = true;
            result.originalSequenceID = readSequenceID(activeSeq);
            result.duplicateSequenceID = null;
            result.draftSequenceName = draftName;
            result.sequenceDurationSec = normalizedSequenceDurationSec;
            result.analyzedDurationSec = normalizedAnalyzedDurationSec;
            result.audioSourceDurationSec = normalizedAudioSourceDurationSec;
            result.silenceRemovedCount = Number(silenceRemovedCount || 0);
            result.totalRemovedDurationSec = Number(totalRemovedDurationSec || 0);
            result.keptSegmentsCount = segments.length;
            result.segmentsAttempted = segments.length;
            result.visualSegmentsInserted = 0;
            result.audioSegmentsInserted = 0;
            result.processedVideoTracks = 0;
            result.processedAudioTracks = 0;
            result.videoSegmentsInsertedByTrack = [];
            result.audioSegmentsInsertedByTrack = [];
            result.skippedSegmentsByTrack = { video: [], audio: [] };
            result.keepSegmentMatchSummary = [];
            result.multiClipKeepSegments = [];
            result.keepSegmentsProcessed = 0;
            result.keepSegmentsSkipped = 0;
            result.lastProcessedKeepSegmentIndex = null;
            result.lastKeepSegmentEndTime = null;
            result.sourceClipUseCounts = [];
            result.duplicateSourceClipUseCount = 0;
            result.reconstructedVideoClipsCount = 0;
            result.reconstructedAudioClipsCount = 0;
            result.originalTrackItemsRemovedOnDuplicate = 0;
            result.originalTrackItemsRemovalFailedOnDuplicate = 0;
            result.originalResidualTrackItems = [];
            result.img5575Diagnostics = [];
            result.executionDiagnosticsPath = silenceRemovalDiagnosticsPath();
            result.operationPlanCount = 0;
            result.operationPlanBuildCalled = false;
            result.timelineClipDiscovery = inspectSilenceRemovalTimelineClips(activeSeq);
            result.currentOperationIndex = -1;
            result.totalOperationsExecuted = 0;
            result.currentTrackBeingProcessed = null;
            result.currentClipName = null;
            result.createSubClipStartTimestamp = null;
            result.createSubClipEndTimestamp = null;
            result.overwriteClipStartTimestamp = null;
            result.overwriteClipEndTimestamp = null;
            result.lastSuccessfulOperation = null;
            result.firstOperationThatNeverReturns = null;
            result.executionElapsedTimeMs = 0;
            result.originalTracksHiddenOrDisabledOnDuplicate = false;
            result.warnings = [];
            organizeExistingGeneratedProjectItems(result);
            resetSilenceRemovalDiagnosticsLog(result);

            if (!segments.length) {
                result.blockers.push("KEEP_SEGMENTS_REQUIRED");
                result.ok = false;
                return stripRuntimeSequence(result);
            }
            result.operationPlanBuildCalled = true;
            var operationPlan = buildSilenceRemovalOperationPlan(activeSeq, segments, result);
            result.operationPlanCount = operationPlan.length;
            if (operationPlan.length === 0) {
                result.blockers.push("CLEAN_SEQUENCE_NO_OPERATIONS_PLANNED");
                result.ok = false;
                return stripRuntimeSequence(result);
            }
            var cleanSequence = activeSeq;
            result.newSequence = cleanSequence;
            result.duplicateSequenceID = null;
            result.draftSequenceName = cleanSequence.name || draftName;
            removeOriginalPodcastTrackItemsOnDuplicate(cleanSequence, result);
            prepareSilenceRemovalTracks(cleanSequence, result);
            result.executionStartMs = new Date().getTime();
            writeSilenceRemovalDiagnostic(result, "operation_plan_ready", {
                operationPlanCount: operationPlan.length,
                processedVideoTracks: result.processedVideoTracks,
                processedAudioTracks: result.processedAudioTracks,
                duplicateSourceClipUseCount: result.duplicateSourceClipUseCount
            });
            result.originalTracksHiddenOrDisabledOnDuplicate = true;
            applySilenceRemovalOperationPlan(cleanSequence, operationPlan, result);
            removeSilenceCrossMediaInsertions(cleanSequence, result);
            result.executionElapsedTimeMs = new Date().getTime() - result.executionStartMs;
            collectOriginalResidualTrackItems(cleanSequence, result);
            writeSilenceRemovalDiagnostic(result, "operation_plan_complete", {
                totalOperationsExecuted: result.totalOperationsExecuted,
                executionElapsedTimeMs: result.executionElapsedTimeMs
            });
            result.ok = result.blockers.length === 0 && result.visualSegmentsInserted > 0 && result.audioSegmentsInserted > 0 && result.originalTracksHiddenOrDisabledOnDuplicate;
            return stripRuntimeSequence(result);
        });
    };

    function normalizeOptionalNumber(value) {
        if (value === null || value === undefined || value === "") return null;
        var numberValue = Number(value);
        return isNaN(numberValue) ? null : numberValue;
    }

    function silenceRemovalDiagnosticsPath() {
        return tempDir() + "silence-removal-hang-diagnostics.jsonl";
    }

    function resetSilenceRemovalDiagnosticsLog(result) {
        try {
            var file = new File(result.executionDiagnosticsPath || silenceRemovalDiagnosticsPath());
            file.encoding = "UTF-8";
            if (file.open("w")) {
                file.writeln("");
                file.close();
            }
        } catch (eResetSilenceLog) {}
    }

    function writeSilenceRemovalDiagnostic(result, eventName, payload) {
        try {
            var file = new File(result.executionDiagnosticsPath || silenceRemovalDiagnosticsPath());
            file.encoding = "UTF-8";
            if (!file.open("a")) return;
            var elapsed = result.executionStartMs ? (new Date().getTime() - result.executionStartMs) : 0;
            var line = [
                "event=" + safeLogValue(eventName),
                "time=" + safeLogValue(new Date().toString()),
                "elapsedMs=" + safeLogValue(elapsed),
                "operationPlanCount=" + safeLogValue(result.operationPlanCount || 0),
                "currentOperationIndex=" + safeLogValue(result.currentOperationIndex),
                "totalOperationsExecuted=" + safeLogValue(result.totalOperationsExecuted || 0),
                "currentTrack=" + safeLogValue(result.currentTrackBeingProcessed || ""),
                "currentClip=" + safeLogValue(result.currentClipName || ""),
                "payload=" + flattenLogPayload(payload || {})
            ].join(" | ");
            file.writeln(line);
            file.close();
        } catch (eWriteSilenceLog) {}
    }

    function safeLogValue(value) {
        return String(value === null || value === undefined ? "" : value).replace(/\r?\n/g, " ");
    }

    function flattenLogPayload(payload) {
        var out = [];
        for (var key in payload) {
            if (payload.hasOwnProperty(key)) out.push(key + "=" + safeLogValue(payload[key]));
        }
        return out.join(",");
    }

    function pushUniqueBlocker(result, blocker) {
        if (!result.blockers) result.blockers = [];
        if (result.blockers.join("|").indexOf(blocker) === -1) result.blockers.push(blocker);
    }

    function disableOriginalPodcastTrackItemsOnDuplicate(seq, result) {
        var disabledCount = 0;
        var failedCount = 0;
        disabledCount += disableOriginalTrackItemsInCollection(seq && seq.videoTracks, result, "video");
        disabledCount += disableOriginalTrackItemsInCollection(seq && seq.audioTracks, result, "audio");
        failedCount = result._originalDisableFailedCount || 0;
        try { delete result._originalDisableFailedCount; } catch (eDeleteDisableCount) { result._originalDisableFailedCount = null; }
        result.originalTrackItemsDisabledOnDuplicate = disabledCount;
        if (failedCount > 0) {
            result.blockers.push("ORIGINAL_TRACKITEM_DISABLE_FAILED_ON_DUPLICATE");
            return false;
        }
        if (disabledCount === 0) {
            result.warnings.push("NO_ORIGINAL_TRACKITEMS_TO_DISABLE_ON_DUPLICATE");
        }
        return true;
    }

    function removeOriginalPodcastTrackItemsOnDuplicate(seq, result) {
        var removedCount = 0;
        var failedCount = 0;
        removedCount += removeOriginalTrackItemsInCollection(seq && seq.videoTracks, result, "video");
        removedCount += removeOriginalTrackItemsInCollection(seq && seq.audioTracks, result, "audio");
        failedCount = result._originalRemoveFailedCount || 0;
        try { delete result._originalRemoveFailedCount; } catch (eDeleteRemoveCount) { result._originalRemoveFailedCount = null; }
        result.originalTrackItemsRemovedOnDuplicate = removedCount;
        result.originalTrackItemsRemovalFailedOnDuplicate = failedCount;
        result.originalTrackItemsDisabledOnDuplicate = removedCount;
        if (failedCount > 0) {
            pushUniqueBlocker(result, "ORIGINAL_TRACKITEM_REMOVE_FAILED_ON_DUPLICATE");
            return false;
        }
        if (removedCount === 0) {
            result.warnings.push("NO_ORIGINAL_TRACKITEMS_TO_REMOVE_ON_DUPLICATE");
        }
        return true;
    }

    function removeOriginalTrackItemsInCollection(tracks, result, mediaKind) {
        if (!tracks) return 0;
        var removedCount = 0;
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            var clips = track && track.clips;
            if (!clips) continue;
            for (var c = clips.numItems - 1; c >= 0; c--) {
                var clip = clips[c];
                if (!clip || isGeneratedPodcastSourceClip(clip)) continue;
                try {
                    if (!clip.remove) {
                        result._originalRemoveFailedCount = (result._originalRemoveFailedCount || 0) + 1;
                        result.errors.push(mediaKind + " original remove unavailable on track " + (t + 1));
                        continue;
                    }
                    clip.remove(false, false);
                    removedCount += 1;
                } catch (eRemoveOriginal) {
                    result._originalRemoveFailedCount = (result._originalRemoveFailedCount || 0) + 1;
                    result.errors.push(mediaKind + " original remove failed: " + String(eRemoveOriginal.message || eRemoveOriginal));
                }
            }
        }
        return removedCount;
    }

    function disableOriginalTrackItemsInCollection(tracks, result, mediaKind) {
        if (!tracks) return 0;
        var disabledCount = 0;
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            var clips = track && track.clips;
            if (!clips) continue;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                if (!clip || isGeneratedPodcastSourceClip(clip)) continue;
                try {
                    clip.disabled = true;
                    disabledCount += 1;
                } catch (eDisableOriginal) {
                    result._originalDisableFailedCount = (result._originalDisableFailedCount || 0) + 1;
                    result.errors.push(mediaKind + " original disable failed: " + String(eDisableOriginal.message || eDisableOriginal));
                }
            }
        }
        return disabledCount;
    }

    function collectOriginalResidualTrackItems(seq, result) {
        result.originalResidualTrackItems = [];
        result.img5575Diagnostics = [];
        collectOriginalResidualTrackItemsInCollection(seq && seq.videoTracks, result, "video");
        collectOriginalResidualTrackItemsInCollection(seq && seq.audioTracks, result, "audio");
    }

    function collectOriginalResidualTrackItemsInCollection(tracks, result, mediaKind) {
        if (!tracks) return;
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            var clips = track && track.clips;
            if (!clips) continue;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                if (!clip || isGeneratedPodcastSourceClip(clip)) continue;
                var name = "";
                try { name = clip.name ? String(clip.name) : ""; } catch (eResidualName) {}
                var disabledState = null;
                try { disabledState = clip.disabled === true; } catch (eResidualDisabled) { disabledState = null; }
                var info = {
                    mediaKind: mediaKind,
                    trackIndex: t,
                    clipIndex: c,
                    clipName: name,
                    startSec: readTimeSeconds(clip.start),
                    endSec: readTimeSeconds(clip.end),
                    disabled: disabledState
                };
                result.originalResidualTrackItems.push(info);
                if (name.indexOf("IMG_5575") !== -1) result.img5575Diagnostics.push(info);
            }
        }
    }

    function isGeneratedPodcastTestSequenceName(name) {
        return detectGeneratedPodcastSequenceName(name).matched;
    }

    function isAutoSwitchDraftSequenceName(name) {
        return String(name || "").indexOf(" - Saad Auto Switch Draft") !== -1;
    }

    function detectGeneratedPodcastSequenceName(name) {
        var value = String(name || "");
        var patterns = [
            "Saad Duplicate Runtime Test",
            "Saad Reconstruct",
            "Saad Auto Switch Visual Only Prototype",
            "Saad Silence Removed Draft"
        ];
        for (var i = 0; i < patterns.length; i++) {
            if (value.indexOf(patterns[i]) !== -1) {
                return {
                    matched: true,
                    rule: "sequence name contains generated draft marker",
                    matchedPattern: patterns[i]
                };
            }
        }
        return {
            matched: false,
            rule: "sequence name contains generated draft marker",
            matchedPattern: null
        };
    }

    function prepareSilenceRemovalTracks(seq, result) {
        var videoTrackCount = seq && seq.videoTracks ? seq.videoTracks.numTracks : 0;
        var audioTrackCount = seq && seq.audioTracks ? seq.audioTracks.numTracks : 0;
        result.processedVideoTracks = videoTrackCount;
        result.processedAudioTracks = audioTrackCount;
        for (var v = 0; v < videoTrackCount; v++) {
            result.videoSegmentsInsertedByTrack[v] = 0;
            result.skippedSegmentsByTrack.video[v] = 0;
            try {
                seq.videoTracks[v].name = v === 0 ? "Saad Silence Removed" : ("Saad Silence Removed V" + (v + 1));
            } catch (eVideoTrackName) {
                result.warnings.push("VIDEO_TRACK_RENAME_UNSUPPORTED_V" + (v + 1));
            }
            if (!seq.videoTracks[v] || !seq.videoTracks[v].overwriteClip) {
                result.blockers.push("VIDEO_TRACK_OVERWRITECLIP_NOT_AVAILABLE_V" + (v + 1));
            }
        }
        for (var a = 0; a < audioTrackCount; a++) {
            result.audioSegmentsInsertedByTrack[a] = 0;
            result.skippedSegmentsByTrack.audio[a] = 0;
            try {
                seq.audioTracks[a].name = a === 0 ? "Saad Silence Removed Audio" : ("Saad Silence Removed Audio A" + (a + 1));
            } catch (eAudioTrackName) {
                result.warnings.push("AUDIO_TRACK_RENAME_UNSUPPORTED_A" + (a + 1));
            }
            if (!seq.audioTracks[a] || !seq.audioTracks[a].overwriteClip) {
                result.blockers.push("AUDIO_TRACK_OVERWRITECLIP_NOT_AVAILABLE_A" + (a + 1));
            }
        }
        if (videoTrackCount === 0) result.blockers.push("NO_VIDEO_TRACKS_AVAILABLE");
        if (audioTrackCount === 0) result.blockers.push("NO_AUDIO_TRACKS_AVAILABLE");
    }

    function buildSilenceRemovalOperationPlan(seq, segments, result) {
        var operations = [];
        var targetCursorSec = 0;
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            var startSec = Math.max(0, Number(segment.startSec || 0));
            var endSec = Number(segment.endSec || 0);
            if (!(endSec > startSec)) {
                result.blockers.push("INVALID_KEEP_SEGMENT_TIMING");
                continue;
            }
            var segmentSummary = {
                keepSegmentIndex: i,
                startSec: startSec,
                endSec: endSec,
                videoClipsMatched: 0,
                audioClipsMatched: 0,
                videoClipsMatchedByTrack: [],
                audioClipsMatchedByTrack: []
            };
            if (seq && seq.videoTracks) {
                for (var v = 0; v < seq.videoTracks.numTracks; v++) {
                    var videoMatches = appendSilenceOperationsForTrack(seq.videoTracks[v], v, "video", startSec, endSec, i, targetCursorSec, operations, result);
                    segmentSummary.videoClipsMatched += videoMatches;
                    segmentSummary.videoClipsMatchedByTrack[v] = videoMatches;
                }
            }
            if (seq && seq.audioTracks) {
                for (var a = 0; a < seq.audioTracks.numTracks; a++) {
                    var audioMatches = appendSilenceOperationsForTrack(seq.audioTracks[a], a, "audio", startSec, endSec, i, targetCursorSec, operations, result);
                    segmentSummary.audioClipsMatched += audioMatches;
                    segmentSummary.audioClipsMatchedByTrack[a] = audioMatches;
                }
            }
            result.keepSegmentMatchSummary.push(segmentSummary);
            if (segmentSummary.videoClipsMatched > 0 || segmentSummary.audioClipsMatched > 0) {
                result.keepSegmentsProcessed += 1;
                result.lastProcessedKeepSegmentIndex = i;
                result.lastKeepSegmentEndTime = endSec;
            } else {
                result.keepSegmentsSkipped += 1;
            }
            if (segmentSummary.videoClipsMatched > 1 || segmentSummary.audioClipsMatched > 1) {
                result.multiClipKeepSegments.push({
                    keepSegmentIndex: i,
                    matchedVideoClipCount: segmentSummary.videoClipsMatched,
                    matchedAudioClipCount: segmentSummary.audioClipsMatched,
                    videoClipsMatchedByTrack: segmentSummary.videoClipsMatchedByTrack,
                    audioClipsMatchedByTrack: segmentSummary.audioClipsMatchedByTrack
                });
            }
            targetCursorSec += endSec - startSec;
        }
        summarizeSilenceSourceClipUsage(operations, result);
        return operations;
    }

    function inspectSilenceRemovalTimelineClips(seq) {
        var videoClipCounts = [];
        var audioClipCounts = [];
        var videoTrackCount = seq && seq.videoTracks ? seq.videoTracks.numTracks : 0;
        var audioTrackCount = seq && seq.audioTracks ? seq.audioTracks.numTracks : 0;
        for (var v = 0; v < videoTrackCount; v++) {
            var videoClips = seq.videoTracks[v] && seq.videoTracks[v].clips;
            videoClipCounts[v] = videoClips ? videoClips.numItems : 0;
        }
        for (var a = 0; a < audioTrackCount; a++) {
            var audioClips = seq.audioTracks[a] && seq.audioTracks[a].clips;
            audioClipCounts[a] = audioClips ? audioClips.numItems : 0;
        }
        return {
            videoTrackCount: videoTrackCount,
            audioTrackCount: audioTrackCount,
            videoClipCounts: videoClipCounts,
            audioClipCounts: audioClipCounts,
            v1ClipCount: videoClipCounts.length ? (videoClipCounts[0] || 0) : 0,
            a1ClipCount: audioClipCounts.length ? (audioClipCounts[0] || 0) : 0
        };
    }

    function appendSilenceOperationsForTrack(track, trackIndex, mediaKind, startSec, endSec, segmentIndex, targetStartSec, operations, result) {
        var matches = findOverlapClipsInTrack(track, startSec, endSec, true);
        if (!matches.length) {
            var skipped = mediaKind === "audio" ? result.skippedSegmentsByTrack.audio : result.skippedSegmentsByTrack.video;
            skipped[trackIndex] = (skipped[trackIndex] || 0) + 1;
            return 0;
        }
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var clip = match.clip;
            var projectItem = clip && clip.projectItem;
            var clipName = "";
            try { clipName = clip && clip.name ? String(clip.name) : ""; } catch (ePlanClipName) {}
            if (!projectItem) {
                pushUniqueBlocker(result, (mediaKind === "audio" ? "AUDIO_" : "VIDEO_") + "PROJECT_ITEM_MISSING");
                continue;
            }
            var sourceInSec = readTimeSeconds(clip.inPoint) + (match.overlapStartSec - match.clipStartSec);
            var sourceOutSec = readTimeSeconds(clip.inPoint) + (match.overlapEndSec - match.clipStartSec);
            if (!(sourceOutSec > sourceInSec)) {
                pushUniqueBlocker(result, "INVALID_SOURCE_SUBRANGE");
                continue;
            }
            operations.push({
                mediaKind: mediaKind,
                trackIndex: trackIndex,
                segmentIndex: segmentIndex,
                projectItem: projectItem,
                clipName: clipName,
                clipStartSec: match.clipStartSec,
                overlapStartSec: match.overlapStartSec,
                overlapEndSec: match.overlapEndSec,
                sourceInSec: sourceInSec,
                sourceOutSec: sourceOutSec,
                targetStartSec: targetStartSec + Math.max(0, match.overlapStartSec - startSec)
            });
        }
        return matches.length;
    }

    function summarizeSilenceSourceClipUsage(operations, result) {
        var map = {};
        for (var i = 0; i < operations.length; i++) {
            var op = operations[i];
            var clipName = op.clipName || "";
            var key = op.mediaKind + ":" + op.trackIndex + ":" + clipName + ":" + op.clipStartSec;
            if (!map[key]) {
                map[key] = {
                    mediaKind: op.mediaKind,
                    trackIndex: op.trackIndex,
                    clipName: clipName,
                    clipStartSec: op.clipStartSec,
                    useCount: 0
                };
            }
            map[key].useCount += 1;
        }
        result.sourceClipUseCounts = [];
        result.duplicateSourceClipUseCount = 0;
        for (var key in map) {
            if (!map.hasOwnProperty(key)) continue;
            result.sourceClipUseCounts.push(map[key]);
            if (map[key].useCount > 1) result.duplicateSourceClipUseCount += 1;
        }
    }

    function applySilenceRemovalOperationPlan(seq, operations, result) {
        for (var i = 0; i < operations.length; i++) {
            var operation = operations[i];
            var targetTrack = operation.mediaKind === "audio"
                ? (seq.audioTracks && seq.audioTracks.numTracks > operation.trackIndex ? seq.audioTracks[operation.trackIndex] : null)
                : (seq.videoTracks && seq.videoTracks.numTracks > operation.trackIndex ? seq.videoTracks[operation.trackIndex] : null);
            result.currentOperationIndex = i;
            result.currentTrackBeingProcessed = operation.mediaKind + ":" + (operation.trackIndex + 1);
            result.currentClipName = operation.clipName || null;
            writeSilenceRemovalDiagnostic(result, "operation_start", {
                operationIndex: i,
                mediaKind: operation.mediaKind,
                trackIndex: operation.trackIndex,
                clipName: result.currentClipName,
                overlapStartSec: operation.overlapStartSec,
                overlapEndSec: operation.overlapEndSec,
                targetStartSec: operation.targetStartSec
            });
            if (applySilenceOperation(operation, targetTrack, result)) {
                if (operation.mediaKind === "audio") {
                    result.audioSegmentsInserted += 1;
                    result.reconstructedAudioClipsCount += 1;
                    result.audioSegmentsInsertedByTrack[operation.trackIndex] = (result.audioSegmentsInsertedByTrack[operation.trackIndex] || 0) + 1;
                } else {
                    result.visualSegmentsInserted += 1;
                    result.reconstructedVideoClipsCount += 1;
                    result.videoSegmentsInsertedByTrack[operation.trackIndex] = (result.videoSegmentsInsertedByTrack[operation.trackIndex] || 0) + 1;
                }
                result.totalOperationsExecuted += 1;
                result.lastSuccessfulOperation = {
                    operationIndex: i,
                    mediaKind: operation.mediaKind,
                    trackIndex: operation.trackIndex,
                    clipName: result.currentClipName,
                    targetStartSec: operation.targetStartSec
                };
                writeSilenceRemovalDiagnostic(result, "operation_success", result.lastSuccessfulOperation);
            }
        }
    }

    function removeSilenceCrossMediaInsertions(seq, result) {
        var removedVideoFromAudio = removeNamedSilenceItemsFromTracks(
            seq && seq.videoTracks,
            "Saad Silence audio"
        );
        var removedAudioFromVideo = removeNamedSilenceItemsFromTracks(
            seq && seq.audioTracks,
            "Saad Silence video"
        );
        result.crossMediaVideoItemsRemoved = removedVideoFromAudio;
        result.crossMediaAudioItemsRemoved = removedAudioFromVideo;
        if (removedVideoFromAudio > 0 || removedAudioFromVideo > 0) {
            result.warnings.push(
                "CROSS_MEDIA_INSERTIONS_REMOVED:video=" + removedVideoFromAudio
                + ",audio=" + removedAudioFromVideo
            );
        }
    }

    function removeNamedSilenceItemsFromTracks(tracks, namePrefix) {
        var removed = 0;
        if (!tracks) return removed;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t] && tracks[t].clips;
            if (!clips) continue;
            for (var c = clips.numItems - 1; c >= 0; c--) {
                var clip = clips[c];
                var clipName = "";
                var projectItemName = "";
                try { clipName = clip && clip.name ? String(clip.name) : ""; } catch (eClipName) {}
                try { projectItemName = clip && clip.projectItem && clip.projectItem.name ? String(clip.projectItem.name) : ""; } catch (eProjectName) {}
                if (clipName.indexOf(namePrefix) !== 0 && projectItemName.indexOf(namePrefix) !== 0) continue;
                try {
                    clip.remove(false, false);
                    removed += 1;
                } catch (eRemove) {}
            }
        }
        return removed;
    }

    function applySilenceOperation(operation, targetTrack, result) {
        return applySilencePlannedSegment(operation, targetTrack, result);
    }

    function applySilencePlannedSegment(operation, targetTrack, result) {
        if (!targetTrack || !targetTrack.overwriteClip) {
            pushUniqueBlocker(result, (operation.mediaKind === "audio" ? "AUDIO_" : "VIDEO_") + "TARGET_OVERWRITECLIP_NOT_AVAILABLE");
            return false;
        }
        if (!operation.projectItem || !operation.projectItem.createSubClip) {
            pushUniqueBlocker(result, "CREATE_SUBCLIP_NOT_AVAILABLE");
            return false;
        }
        var sourceInSec = operation.sourceInSec;
        var sourceOutSec = operation.sourceOutSec;
        if (!(sourceOutSec > sourceInSec)) {
            pushUniqueBlocker(result, "INVALID_SOURCE_SUBRANGE");
            return false;
        }
        var subclip = null;
        try {
            result.createSubClipStartTimestamp = new Date().toString();
            result.createSubClipEndTimestamp = null;
            writeSilenceRemovalDiagnostic(result, "before_createSubClip", {
                mediaKind: operation.mediaKind,
                clipName: operation.clipName,
                sourceInSec: sourceInSec,
                sourceOutSec: sourceOutSec,
                sourceInTicks: secondsToTicksString(sourceInSec),
                sourceOutTicks: secondsToTicksString(sourceOutSec)
            });
            subclip = operation.projectItem.createSubClip(
                "Saad Silence " + operation.mediaKind + " Keep " + (operation.segmentIndex + 1) + " " + ts(),
                secondsToTicksString(sourceInSec),
                secondsToTicksString(sourceOutSec),
                0,
                operation.mediaKind === "video" ? 1 : 0,
                operation.mediaKind === "audio" ? 1 : 0
            );
            result.createSubClipEndTimestamp = new Date().toString();
            writeSilenceRemovalDiagnostic(result, "after_createSubClip", {
                mediaKind: operation.mediaKind,
                subclipName: subclip && subclip.name ? String(subclip.name) : null
            });
        } catch (eCreatePlanned) {
            pushUniqueBlocker(result, "CREATE_SUBCLIP_FAILED");
            result.errors.push("createSubClip " + operation.mediaKind + " failed on " + safeLogValue(result.currentTrackBeingProcessed) + " clip=" + safeLogValue(operation.clipName) + " sourceIn=" + sourceInSec + " sourceOut=" + sourceOutSec + " error=" + String(eCreatePlanned.message || eCreatePlanned));
            writeSilenceRemovalDiagnostic(result, "createSubClip_error", {
                error: String(eCreatePlanned.message || eCreatePlanned)
            });
            return false;
        }
        if (!subclip) {
            pushUniqueBlocker(result, "CREATE_SUBCLIP_FAILED");
            result.errors.push("createSubClip returned null for " + operation.mediaKind + " on " + safeLogValue(result.currentTrackBeingProcessed) + " clip=" + safeLogValue(operation.clipName) + " sourceIn=" + sourceInSec + " sourceOut=" + sourceOutSec);
            writeSilenceRemovalDiagnostic(result, "createSubClip_null", {
                mediaKind: operation.mediaKind,
                clipName: operation.clipName
            });
            return false;
        }
        moveGeneratedProjectItemToBin(subclip, "Silence Removal", result);
        try {
            result.overwriteClipStartTimestamp = new Date().toString();
            result.overwriteClipEndTimestamp = null;
            writeSilenceRemovalDiagnostic(result, "before_overwriteClip", {
                mediaKind: operation.mediaKind,
                clipName: operation.clipName,
                targetStartSec: operation.targetStartSec,
                targetStartTicks: secondsToTicksString(operation.targetStartSec)
            });
            targetTrack.overwriteClip(subclip, secondsToTicksString(operation.targetStartSec));
            result.overwriteClipEndTimestamp = new Date().toString();
            writeSilenceRemovalDiagnostic(result, "after_overwriteClip", {
                mediaKind: operation.mediaKind,
                clipName: operation.clipName,
                targetStartSec: operation.targetStartSec
            });
        } catch (eOverwritePlanned) {
            pushUniqueBlocker(result, (operation.mediaKind === "audio" ? "AUDIO_" : "VIDEO_") + "OVERWRITECLIP_FAILED");
            result.errors.push(String(eOverwritePlanned.message || eOverwritePlanned));
            writeSilenceRemovalDiagnostic(result, "overwriteClip_error", {
                error: String(eOverwritePlanned.message || eOverwritePlanned)
            });
            return false;
        }
        return true;
    }

    function applySilenceKeepSegmentTimelineWide(seq, segment, index, targetStartSec, result) {
        var startSec = Math.max(0, Number(segment.startSec || 0));
        var endSec = Number(segment.endSec || 0);
        if (!(endSec > startSec)) {
            result.blockers.push("INVALID_KEEP_SEGMENT_TIMING");
            return 0;
        }
        if (seq && seq.videoTracks) {
            for (var v = 0; v < seq.videoTracks.numTracks; v++) {
                applySilenceKeepSegmentToVideoTrack(seq, v, startSec, endSec, index, targetStartSec, result);
            }
        }
        if (seq && seq.audioTracks) {
            for (var a = 0; a < seq.audioTracks.numTracks; a++) {
                applySilenceKeepSegmentToAudioTrack(seq, a, startSec, endSec, index, targetStartSec, result);
            }
        }
        return endSec - startSec;
    }

    function applySilenceKeepSegmentToVideoTrack(seq, videoTrackIndex, startSec, endSec, index, targetStartSec, result) {
        var targetTrack = seq.videoTracks[videoTrackIndex];
        var matches = findOverlapClipsOnVideoTrack(seq, videoTrackIndex, startSec, endSec);
        if (!matches.length) {
            result.skippedSegmentsByTrack.video[videoTrackIndex] = (result.skippedSegmentsByTrack.video[videoTrackIndex] || 0) + 1;
            return;
        }
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var relativeTargetStart = targetStartSec + Math.max(0, match.overlapStartSec - startSec);
            if (applySilenceMatchedSegment(match, targetTrack, index, relativeTargetStart, result, "video")) {
                result.visualSegmentsInserted += 1;
                result.videoSegmentsInsertedByTrack[videoTrackIndex] = (result.videoSegmentsInsertedByTrack[videoTrackIndex] || 0) + 1;
            }
        }
    }

    function applySilenceKeepSegmentToAudioTrack(seq, audioTrackIndex, startSec, endSec, index, targetStartSec, result) {
        var targetTrack = seq.audioTracks[audioTrackIndex];
        var matches = findOverlapClipsOnAudioTrack(seq, audioTrackIndex, startSec, endSec);
        if (!matches.length) {
            result.skippedSegmentsByTrack.audio[audioTrackIndex] = (result.skippedSegmentsByTrack.audio[audioTrackIndex] || 0) + 1;
            return;
        }
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var relativeTargetStart = targetStartSec + Math.max(0, match.overlapStartSec - startSec);
            if (applySilenceMatchedSegment(match, targetTrack, index, relativeTargetStart, result, "audio")) {
                result.audioSegmentsInserted += 1;
                result.audioSegmentsInsertedByTrack[audioTrackIndex] = (result.audioSegmentsInsertedByTrack[audioTrackIndex] || 0) + 1;
            }
        }
    }

    function applySilenceMatchedSegment(match, targetTrack, index, targetStartSec, result, mediaKind) {
        if (!targetTrack || !targetTrack.overwriteClip) {
            pushUniqueBlocker(result, (mediaKind === "audio" ? "AUDIO_" : "VIDEO_") + "TARGET_OVERWRITECLIP_NOT_AVAILABLE");
            return false;
        }
        var clip = match.clip;
        var projectItem = clip && clip.projectItem;
        if (!projectItem) {
            pushUniqueBlocker(result, (mediaKind === "audio" ? "AUDIO_" : "VIDEO_") + "PROJECT_ITEM_MISSING");
            return false;
        }
        if (!projectItem.createSubClip) {
            pushUniqueBlocker(result, "CREATE_SUBCLIP_NOT_AVAILABLE");
            return false;
        }
        var sourceInSec = readTimeSeconds(clip.inPoint) + (match.overlapStartSec - match.clipStartSec);
        var sourceOutSec = readTimeSeconds(clip.inPoint) + (match.overlapEndSec - match.clipStartSec);
        if (!(sourceOutSec > sourceInSec)) {
            pushUniqueBlocker(result, "INVALID_SOURCE_SUBRANGE");
            return false;
        }
        var subclip = null;
        try {
            result.createSubClipStartTimestamp = new Date().toString();
            result.createSubClipEndTimestamp = null;
            writeSilenceRemovalDiagnostic(result, "before_createSubClip", {
                mediaKind: mediaKind,
                clipName: result.currentClipName,
                sourceInSec: sourceInSec,
                sourceOutSec: sourceOutSec,
                sourceInTicks: secondsToTicksString(sourceInSec),
                sourceOutTicks: secondsToTicksString(sourceOutSec)
            });
            subclip = projectItem.createSubClip(
                "Saad Silence " + mediaKind + " Keep " + (index + 1) + " " + ts(),
                secondsToTicksString(sourceInSec),
                secondsToTicksString(sourceOutSec),
                1,
                mediaKind === "video" ? 1 : 0,
                mediaKind === "audio" ? 1 : 0
            );
            result.createSubClipEndTimestamp = new Date().toString();
            writeSilenceRemovalDiagnostic(result, "after_createSubClip", {
                mediaKind: mediaKind,
                subclipName: subclip && subclip.name ? String(subclip.name) : null
            });
        } catch (eCreateSilence) {
            pushUniqueBlocker(result, "CREATE_SUBCLIP_FAILED");
            result.errors.push("createSubClip " + mediaKind + " failed on " + safeLogValue(result.currentTrackBeingProcessed) + " clip=" + safeLogValue(result.currentClipName) + " sourceIn=" + sourceInSec + " sourceOut=" + sourceOutSec + " error=" + String(eCreateSilence.message || eCreateSilence));
            writeSilenceRemovalDiagnostic(result, "createSubClip_error", {
                error: String(eCreateSilence.message || eCreateSilence)
            });
            return false;
        }
        if (!subclip) {
            pushUniqueBlocker(result, "CREATE_SUBCLIP_FAILED");
            result.errors.push("createSubClip returned null for " + mediaKind + " on " + safeLogValue(result.currentTrackBeingProcessed) + " clip=" + safeLogValue(result.currentClipName) + " sourceIn=" + sourceInSec + " sourceOut=" + sourceOutSec);
            writeSilenceRemovalDiagnostic(result, "createSubClip_null", {
                mediaKind: mediaKind,
                clipName: result.currentClipName
            });
            return false;
        }
        moveGeneratedProjectItemToBin(subclip, "Silence Removal", result);
        try {
            result.overwriteClipStartTimestamp = new Date().toString();
            result.overwriteClipEndTimestamp = null;
            writeSilenceRemovalDiagnostic(result, "before_overwriteClip", {
                mediaKind: mediaKind,
                clipName: result.currentClipName,
                targetStartSec: targetStartSec,
                targetStartTicks: secondsToTicksString(targetStartSec)
            });
            targetTrack.overwriteClip(subclip, secondsToTicksString(targetStartSec));
            result.overwriteClipEndTimestamp = new Date().toString();
            writeSilenceRemovalDiagnostic(result, "after_overwriteClip", {
                mediaKind: mediaKind,
                clipName: result.currentClipName,
                targetStartSec: targetStartSec
            });
        } catch (eOverwriteSilence) {
            pushUniqueBlocker(result, (mediaKind === "audio" ? "AUDIO_" : "VIDEO_") + "OVERWRITECLIP_FAILED");
            result.errors.push(String(eOverwriteSilence.message || eOverwriteSilence));
            writeSilenceRemovalDiagnostic(result, "overwriteClip_error", {
                error: String(eOverwriteSilence.message || eOverwriteSilence)
            });
            return false;
        }
        return true;
    }

    function findBestOverlapClipOnAudioTrack(seq, audioTrackIndex, startSec, endSec) {
        if (!seq || !seq.audioTracks || audioTrackIndex < 0 || seq.audioTracks.numTracks <= audioTrackIndex) return null;
        var track = seq.audioTracks[audioTrackIndex];
        var clips = track && track.clips;
        if (!clips) return null;
        var best = null;
        for (var c = 0; c < clips.numItems; c++) {
            var clip = clips[c];
            if (isGeneratedPodcastSourceClip(clip)) continue;
            var clipStart = readTimeSeconds(clip.start);
            var clipEnd = readTimeSeconds(clip.end);
            var overlapStart = Math.max(startSec, clipStart);
            var overlapEnd = Math.min(endSec, clipEnd);
            if (overlapEnd > overlapStart) {
                var candidate = {
                    clip: clip,
                    clipStartSec: clipStart,
                    clipEndSec: clipEnd,
                    overlapStartSec: overlapStart,
                    overlapEndSec: overlapEnd,
                    overlapDurationSec: overlapEnd - overlapStart,
                    full: clipStart <= startSec && clipEnd >= endSec
                };
                if (!best || candidate.full || candidate.overlapDurationSec > best.overlapDurationSec) best = candidate;
                if (candidate.full) break;
            }
        }
        return best;
    }

    function findOverlapClipsOnVideoTrack(seq, videoTrackIndex, startSec, endSec) {
        if (!seq || !seq.videoTracks || videoTrackIndex < 0 || seq.videoTracks.numTracks <= videoTrackIndex) return [];
        return findOverlapClipsInTrack(seq.videoTracks[videoTrackIndex], startSec, endSec);
    }

    function findOverlapClipsOnAudioTrack(seq, audioTrackIndex, startSec, endSec) {
        if (!seq || !seq.audioTracks || audioTrackIndex < 0 || seq.audioTracks.numTracks <= audioTrackIndex) return [];
        return findOverlapClipsInTrack(seq.audioTracks[audioTrackIndex], startSec, endSec);
    }

    function findOverlapClipsInTrack(track, startSec, endSec, allowGeneratedSilence) {
        var out = [];
        var clips = track && track.clips;
        if (!clips) return out;
        for (var c = 0; c < clips.numItems; c++) {
            var clip = clips[c];
            if (isGeneratedPodcastSourceClip(clip) && !(allowGeneratedSilence && isGeneratedSilenceSourceClip(clip))) continue;
            var clipStart = readTimeSeconds(clip.start);
            var clipEnd = readTimeSeconds(clip.end);
            var overlapStart = Math.max(startSec, clipStart);
            var overlapEnd = Math.min(endSec, clipEnd);
            if (overlapEnd > overlapStart) {
                out.push({
                    clip: clip,
                    clipStartSec: clipStart,
                    clipEndSec: clipEnd,
                    overlapStartSec: overlapStart,
                    overlapEndSec: overlapEnd,
                    overlapDurationSec: overlapEnd - overlapStart,
                    full: clipStart <= startSec && clipEnd >= endSec
                });
            }
        }
        return out;
    }

    function isGeneratedSilenceSourceClip(clip) {
        var clipName = "";
        var projectItemName = "";
        try { clipName = clip && clip.name ? String(clip.name) : ""; } catch (eClipName) {}
        try { projectItemName = clip && clip.projectItem && clip.projectItem.name ? String(clip.projectItem.name) : ""; } catch (ePiName) {}
        return clipName.indexOf("Saad Silence ") === 0
            || projectItemName.indexOf("Saad Silence ") === 0;
    }

    function prepareVisualOnlyCameraDecisionSegment(seq, decision, index) {
        var publicResult = emptyApplyCameraDecisionSegmentResult(decision, index);
        var sourceTrackIndex = Number(decision.videoTrackIndex);
        publicResult.cameraLabel = decision.cameraLabel || ("V" + (sourceTrackIndex + 1));
        var rawStart = Number(decision.startSec);
        var rawEnd = Number(decision.endSec);
        var timelineDuration = readSequenceDurationSec(seq);
        var decisionStart = rawStart;
        var decisionEnd = rawEnd;
        publicResult.isValidTiming = true;
        publicResult.invalidReason = null;

        if (!isFinite(rawStart)) {
            publicResult.isValidTiming = false;
            publicResult.invalidReason = "START_NOT_FINITE";
        }
        if (!isFinite(rawEnd)) {
            publicResult.isValidTiming = false;
            publicResult.invalidReason = publicResult.invalidReason ? publicResult.invalidReason + "|END_NOT_FINITE" : "END_NOT_FINITE";
        }
        if (!publicResult.isValidTiming) {
            publicResult.matchType = "SKIPPED_NO_OVERLAP";
            publicResult.blockers.push("INVALID_CAMERA_DECISION_TIMING:" + publicResult.invalidReason);
            return { publicResult: publicResult, subclip: null };
        }

        if (decisionStart < 0) decisionStart = 0;
        if (timelineDuration && decisionEnd > timelineDuration) decisionEnd = timelineDuration;
        publicResult.decisionStartSec = decisionStart;
        publicResult.decisionEndSec = decisionEnd;
        publicResult.durationSec = decisionEnd - decisionStart;

        if (!(decisionEnd > decisionStart)) {
            publicResult.isValidTiming = false;
            publicResult.invalidReason = "END_NOT_GREATER_THAN_START";
            publicResult.matchType = "SKIPPED_NO_OVERLAP";
            publicResult.blockers.push("INVALID_CAMERA_DECISION_TIMING:" + publicResult.invalidReason);
            return { publicResult: publicResult, subclip: null };
        }
        if (!(publicResult.durationSec > 0)) {
            publicResult.isValidTiming = false;
            publicResult.invalidReason = "DURATION_NOT_POSITIVE";
            publicResult.matchType = "SKIPPED_NO_OVERLAP";
            publicResult.blockers.push("INVALID_CAMERA_DECISION_TIMING:" + publicResult.invalidReason);
            return { publicResult: publicResult, subclip: null };
        }

        var match = findBestOverlapClipForDecision(seq, sourceTrackIndex, decisionStart, decisionEnd);
        if (!match) {
            publicResult.matchType = "SKIPPED_NO_OVERLAP";
            publicResult.matchingSourceClipFound = false;
            publicResult.invalidReason = "NO_SOURCE_CLIP_OVERLAP";
            return { publicResult: publicResult, subclip: null };
        }

        var clip = match.clip;
        publicResult.matchingSourceClipFound = true;
        publicResult.matchType = match.full ? "FULL_MATCH" : "PARTIAL_MATCH";
        publicResult.clipName = clip.name || null;
        publicResult.matchingClipName = publicResult.clipName;
        publicResult.clipStartSec = match.clipStartSec;
        publicResult.clipEndSec = match.clipEndSec;
        publicResult.matchingClipStartSec = match.clipStartSec;
        publicResult.matchingClipEndSec = match.clipEndSec;
        publicResult.overlapStartSec = match.overlapStartSec;
        publicResult.overlapEndSec = match.overlapEndSec;
        publicResult.overlapDurationSec = match.overlapDurationSec;
        if (!(match.overlapDurationSec > 0)) {
            publicResult.isValidTiming = false;
            publicResult.invalidReason = "OVERLAP_DURATION_NOT_POSITIVE";
            publicResult.matchType = "SKIPPED_NO_OVERLAP";
            publicResult.blockers.push("INVALID_CAMERA_DECISION_TIMING:" + publicResult.invalidReason);
            return { publicResult: publicResult, subclip: null };
        }

        var projectItem = clip.projectItem;
        if (!projectItem) {
            publicResult.blockers.push("PROJECT_ITEM_MISSING");
            return { publicResult: publicResult, subclip: null };
        }
        if (!projectItem.createSubClip) {
            publicResult.blockers.push("CREATE_SUBCLIP_NOT_AVAILABLE");
            return { publicResult: publicResult, subclip: null };
        }

        var clipInPointSec = readTimeSeconds(clip.inPoint);
        var sourceInSec = clipInPointSec + (match.overlapStartSec - match.clipStartSec);
        var sourceOutSec = clipInPointSec + (match.overlapEndSec - match.clipStartSec);
        publicResult.sourceInSec = sourceInSec;
        publicResult.sourceOutSec = sourceOutSec;
        if (!(sourceOutSec > sourceInSec)) {
            publicResult.blockers.push("INVALID_SOURCE_SUBRANGE");
            return { publicResult: publicResult, subclip: null };
        }

        var subclip = null;
        var generatedCameraIdentity = String(decision.speakerId || "") === "wide"
            ? "WIDE " + publicResult.cameraLabel
            : publicResult.cameraLabel;
        try {
            subclip = projectItem.createSubClip(
                "Saad Auto Switch " + generatedCameraIdentity + " " + (index + 1) + " " + ts(),
                secondsToTicksString(sourceInSec),
                secondsToTicksString(sourceOutSec),
                1,
                1,
                0
            );
        } catch (eCreateApply) {
            publicResult.blockers.push("CREATE_SUBCLIP_FAILED");
            publicResult.errors.push(String(eCreateApply.message || eCreateApply));
            return { publicResult: publicResult, subclip: null };
        }
        if (!subclip) {
            publicResult.blockers.push("CREATE_SUBCLIP_FAILED");
            return { publicResult: publicResult, subclip: null };
        }

        moveGeneratedProjectItemToBin(subclip, "Multi-Cam Auto Switch", publicResult);

        publicResult.subclipCreated = true;
        return { publicResult: publicResult, subclip: subclip };
    }

    function emptyAutoZoomInspectionResult() {
        return {
            ok: false,
            sequenceName: null,
            sequenceId: null,
            durationSec: 0,
            videoTrackCount: 0,
            analyzedVideoTrackIndexes: [],
            cutEventsSec: [],
            adjustmentLayerCount: 0,
            qeAvailable: false,
            newAdjustmentLayerAvailable: false,
            directTransformAvailable: false,
            executionMode: null,
            blockers: [],
            warnings: []
        };
    }

    function emptyAutoZoomApplyResult() {
        return {
            ok: false,
            sequenceName: null,
            eventsDetected: 0,
            eventsSelected: 0,
            adjustmentLayersInserted: 0,
            effectsApplied: 0,
            failedEvents: 0,
            previewTimeSec: null,
            createdProjectItemName: null,
            executionMode: null,
            eventResults: [],
            blockers: [],
            warnings: [],
            errors: [],
            timelineMutation: "none"
        };
    }

    function readSequenceDurationSec(seq) {
        var duration = readTimeSeconds(seq && seq.end);
        if (duration > 0) return duration;
        var maxEnd = 0;
        var tracks = seq && seq.videoTracks;
        if (!tracks) return maxEnd;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t] && tracks[t].clips;
            if (!clips) continue;
            for (var c = 0; c < clips.numItems; c++) {
                maxEnd = Math.max(maxEnd, readTimeSeconds(clips[c] && clips[c].end));
            }
        }
        return maxEnd;
    }

    function readSequenceFrameDurationSec(seq) {
        try {
            var timebaseTicks = Number(seq && seq.timebase);
            if (timebaseTicks > 0) return timebaseTicks / PREMIERE_TICKS_PER_SECOND;
        } catch (eTimebase) {}
        try {
            var settings = seq && seq.getSettings ? seq.getSettings() : null;
            var frameRateTicks = Number(settings && settings.videoFrameRate && settings.videoFrameRate.ticks);
            if (frameRateTicks > 0) return frameRateTicks / PREMIERE_TICKS_PER_SECOND;
        } catch (eSettings) {}
        return 1 / 25;
    }

    function collectAutoZoomCutEvents(seq, trackIndexes, excludedSourceVideoTrackIndex) {
        var events = [];
        var seen = {};
        var duration = readSequenceDurationSec(seq);
        var tracks = seq && seq.videoTracks;
        if (!tracks) return events;
        var indexes = trackIndexes;
        if (!indexes || !indexes.length) {
            indexes = [];
            for (var all = 0; all < tracks.numTracks; all++) indexes.push(all);
        }
        for (var i = 0; i < indexes.length; i++) {
            var trackIndex = Number(indexes[i]);
            if (trackIndex < 0 || trackIndex >= tracks.numTracks) continue;
            var clips = tracks[trackIndex] && tracks[trackIndex].clips;
            if (!clips) continue;
            for (var c = 0; c < clips.numItems; c++) {
                if (isAutoSwitchWideClip(clips[c])) continue;
                var srcTrackIndex = readAutoSwitchSourceVideoTrackIndex(clips[c]);
                var excludeTrack = (excludedSourceVideoTrackIndex !== null) ? excludedSourceVideoTrackIndex : 0;
                if (srcTrackIndex === excludeTrack) continue;
                var start = readTimeSeconds(clips[c] && clips[c].start);
                var end = readTimeSeconds(clips[c] && clips[c].end);
                var clipDur = end - start;
                if (clipDur < 1.0) continue;
                addAutoZoomCutEvent(events, seen, start, duration);
            }
        }
        events.sort(function (a, b) { return a - b; });
        return events;
    }

    function findBestAutoZoomTrackIndex(seq) {
        var tracks = seq && seq.videoTracks;
        if (!tracks) return -1;
        var bestTrackIndex = -1;
        var bestEventCount = 0;
        for (var trackIndex = 0; trackIndex < tracks.numTracks; trackIndex++) {
            var eventCount = collectAutoZoomCutEvents(seq, [trackIndex], null).length;
            if (eventCount > bestEventCount || (eventCount === bestEventCount && eventCount > 0 && trackIndex > bestTrackIndex)) {
                bestTrackIndex = trackIndex;
                bestEventCount = eventCount;
            }
        }
        return bestEventCount > 0 ? bestTrackIndex : -1;
    }

    function normalizeOptionalTrackIndex(value) {
        if (value === null || typeof value === "undefined" || value === "") return null;
        var normalized = Number(value);
        return isFinite(normalized) && normalized >= 0 ? Math.floor(normalized) : null;
    }

    function readAutoSwitchSourceVideoTrackIndex(clip) {
        var names = [];
        try { if (clip && clip.name) names.push(String(clip.name)); } catch (eClipName) {}
        try {
            if (clip && clip.projectItem && clip.projectItem.name) names.push(String(clip.projectItem.name));
        } catch (eProjectItemName) {}
        for (var i = 0; i < names.length; i++) {
            var match = /Saad Auto Switch(?: WIDE)? V(\d+)/i.exec(names[i]);
            if (match && Number(match[1]) > 0) return Number(match[1]) - 1;
        }
        return null;
    }

    function isAutoSwitchWideClip(clip) {
        var names = [];
        try { if (clip && clip.name) names.push(String(clip.name)); } catch (eClipName) {}
        try {
            if (clip && clip.projectItem && clip.projectItem.name) names.push(String(clip.projectItem.name));
        } catch (eProjectItemName) {}
        for (var i = 0; i < names.length; i++) {
            if (/Saad Auto Switch WIDE V\d+/i.test(names[i])) return true;
        }
        return false;
    }

    function addAutoZoomCutEvent(events, seen, timeSec, durationSec) {
        if (!(timeSec > 0.001) || !(timeSec < durationSec - 0.001)) return;
        var frameAligned = Math.round(timeSec * 1000) / 1000;
        var key = String(frameAligned);
        if (seen[key]) return;
        seen[key] = true;
        events.push(frameAligned);
    }

    function selectAutoZoomEvents(events, rhythmPercentage, zoomDurationSec) {
        var spacedEvents = [];
        var minimumSpacingSec = Math.max(0.05, Number(zoomDurationSec) || 0);
        for (var eventIndex = 0; eventIndex < events.length; eventIndex++) {
            var eventTime = Number(events[eventIndex]);
            if (!spacedEvents.length || eventTime - spacedEvents[spacedEvents.length - 1] >= minimumSpacingSec - 0.001) {
                spacedEvents.push(eventTime);
            }
        }
        if (rhythmPercentage >= 0.999) return spacedEvents;
        var selected = [];
        var targetCount = Math.max(1, Math.min(spacedEvents.length, Math.round(spacedEvents.length * rhythmPercentage)));
        if (!spacedEvents.length) return selected;
        if (targetCount === 1) {
            selected.push(spacedEvents[Math.floor(spacedEvents.length / 2)]);
            return selected;
        }
        for (var i = 0; i < targetCount; i++) {
            var spacedIndex = Math.round(i * (spacedEvents.length - 1) / (targetCount - 1));
            selected.push(spacedEvents[spacedIndex]);
        }
        return selected;
    }

    function normalizeAutoZoomStyles(styles) {
        var out = [];
        var input = styles || [];
        for (var i = 0; i < input.length; i++) {
            var style = String(input[i]);
            if (style !== "jump" && style !== "smooth" && style !== "snap") continue;
            var exists = false;
            for (var j = 0; j < out.length; j++) if (out[j] === style) exists = true;
            if (!exists) out.push(style);
        }
        return out;
    }

    function clampNumber(value, min, max) {
        if (!isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    function countAdjustmentLayersInProject(parent) {
        var count = 0;
        var children = parent && parent.children;
        if (!children) return count;
        for (var i = 0; i < children.numItems; i++) {
            var child = children[i];
            try {
                if (child && child.isAdjustmentLayer && child.isAdjustmentLayer()) count += 1;
            } catch (eAdjustment) {}
            count += countAdjustmentLayersInProject(child);
        }
        return count;
    }

    function collectAdjustmentLayerNodeIds(parent, ids) {
        var children = parent && parent.children;
        if (!children) return;
        for (var i = 0; i < children.numItems; i++) {
            var child = children[i];
            try {
                if (child && child.isAdjustmentLayer && child.isAdjustmentLayer()) {
                    ids[String(child.nodeId || child.treePath || child.name)] = true;
                }
            } catch (eAdjustment) {}
            collectAdjustmentLayerNodeIds(child, ids);
        }
    }

    function findNewAdjustmentLayer(parent, beforeIds) {
        var children = parent && parent.children;
        if (!children) return null;
        for (var i = 0; i < children.numItems; i++) {
            var child = children[i];
            try {
                if (child && child.isAdjustmentLayer && child.isAdjustmentLayer()) {
                    var key = String(child.nodeId || child.treePath || child.name);
                    if (!beforeIds[key]) return child;
                }
            } catch (eAdjustment) {}
            var nested = findNewAdjustmentLayer(child, beforeIds);
            if (nested) return nested;
        }
        return null;
    }

    function hasAutoZoomAdjustmentLayerRuntime() {
        try {
            if (app.project && typeof app.project.newAdjustmentLayer === "function") return true;
        } catch (eAppProjectAdjustment) {}
        try {
            app.enableQE();
            return typeof qe !== "undefined"
                && !!qe.project
                && typeof qe.project.newAdjustmentLayer === "function";
        } catch (eQEAdjustment) {}
        return false;
    }

    function hasAutoZoomDirectTransformRuntime(seq, trackIndexes) {
        var tracks = seq && seq.videoTracks;
        var indexes = trackIndexes || [];
        if (tracks) {
            for (var i = 0; i < indexes.length; i++) {
                var trackIndex = Number(indexes[i]);
                var clips = trackIndex >= 0 && trackIndex < tracks.numTracks && tracks[trackIndex]
                    ? tracks[trackIndex].clips
                    : null;
                if (!clips) continue;
                for (var c = 0; c < clips.numItems; c++) {
                    if (findAutoZoomMotionScaleProperty(clips[c])) return true;
                }
            }
        }
        try {
            app.enableQE();
            return typeof qe !== "undefined"
                && !!qe.project
                && !!qe.project.getVideoEffectByName("Transform");
        } catch (eTransformRuntime) {}
        return false;
    }

    function findAutoZoomSourceClipAtTime(seq, trackIndexes, timeSec) {
        var tracks = seq && seq.videoTracks;
        if (!tracks) return null;
        var best = null;
        var indexes = trackIndexes || [];
        for (var i = indexes.length - 1; i >= 0; i--) {
            var trackIndex = Number(indexes[i]);
            if (trackIndex < 0 || trackIndex >= tracks.numTracks) continue;
            var clips = tracks[trackIndex] && tracks[trackIndex].clips;
            if (!clips) continue;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                var start = readTimeSeconds(clip && clip.start);
                var end = readTimeSeconds(clip && clip.end);
                if (timeSec + 0.001 < start || timeSec >= end - 0.001) continue;
                if (!best || Math.abs(start - timeSec) < best.distance) {
                    best = {
                        trackIndex: trackIndex,
                        clipIndex: c,
                        clip: clip,
                        distance: Math.abs(start - timeSec)
                    };
                }
            }
            if (best && best.distance < 0.05) return best;
        }
        return best;
    }

    function getOrCreateAutoZoomAdjustmentLayer(seq, durationSec, result) {
        var bin = getOrCreateSaadGeneratedToolBin("Auto Zoom");
        var children = bin && bin.children;
        if (children) {
            for (var i = 0; i < children.numItems; i++) {
                var existing = children[i];
                try {
                    if (existing && existing.isAdjustmentLayer && existing.isAdjustmentLayer()
                        && String(existing.name).indexOf("Saad Auto Zoom Adjustment") === 0) return existing;
                } catch (eExisting) {}
            }
        }
        var beforeIds = {};
        collectAdjustmentLayerNodeIds(app.project.rootItem, beforeIds);
        var appProjectCreatorAvailable = false;
        var qeCreatorAvailable = false;
        try {
            appProjectCreatorAvailable = !!app.project
                && typeof app.project.newAdjustmentLayer === "function";
        } catch (eAppProjectCreator) {}
        try { app.enableQE(); } catch (eEnableQE) {
            if (!appProjectCreatorAvailable) {
                result.blockers.push("QE_RUNTIME_UNAVAILABLE");
                result.errors.push(String(eEnableQE.message || eEnableQE));
                return null;
            }
            result.warnings.push("QE_RUNTIME_UNAVAILABLE");
        }
        try {
            qeCreatorAvailable = typeof qe !== "undefined"
                && !!qe.project
                && typeof qe.project.newAdjustmentLayer === "function";
        } catch (eQECreator) {}
        if (!appProjectCreatorAvailable && !qeCreatorAvailable) {
            result.blockers.push("NEW_ADJUSTMENT_LAYER_RUNTIME_UNAVAILABLE");
            return null;
        }
        var width = Number(seq.frameSizeHorizontal || 1920);
        var height = Number(seq.frameSizeVertical || 1080);
        var fps = 25;
        try { fps = PREMIERE_TICKS_PER_SECOND / Number(seq.timebase || PREMIERE_TICKS_PER_SECOND / 25); } catch (eFps) {}
        var created = null;
        for (var a = 0; a < 6 && !created; a++) {
            try {
                var returned = null;
                if (a === 0 && appProjectCreatorAvailable) returned = app.project.newAdjustmentLayer(width, height, 1, 1, fps, durationSec);
                if (a === 1 && appProjectCreatorAvailable) returned = app.project.newAdjustmentLayer(width, height, 1, 1, Math.round(fps), durationSec);
                if (a === 2 && appProjectCreatorAvailable) returned = app.project.newAdjustmentLayer(width, height, 1, fps, durationSec);
                if (a === 3 && qeCreatorAvailable) returned = qe.project.newAdjustmentLayer(width, height, 1, 1, fps, durationSec);
                if (a === 4 && qeCreatorAvailable) returned = qe.project.newAdjustmentLayer(width, height, 1, 1, Math.round(fps), durationSec);
                if (a === 5 && qeCreatorAvailable) returned = qe.project.newAdjustmentLayer(width, height, 1, fps, durationSec);
                try {
                    if (returned && returned.isAdjustmentLayer && returned.isAdjustmentLayer()) created = returned;
                } catch (eReturnedAdjustment) {}
            } catch (eCreate) {
                result.warnings.push("ADJUSTMENT_LAYER_SIGNATURE_" + (a + 1) + "_FAILED");
            }
            if (!created) created = findNewAdjustmentLayer(app.project.rootItem, beforeIds);
        }
        if (!created) {
            result.blockers.push("AUTO_ZOOM_ADJUSTMENT_LAYER_CREATION_FAILED");
            return null;
        }
        try { created.name = "Saad Auto Zoom Adjustment " + ts(); } catch (eName) {}
        moveGeneratedProjectItemToBin(created, "Auto Zoom", result);
        return created;
    }

    function findTrackItemAtTime(track, startSec, expectedName) {
        var clips = track && track.clips;
        if (!clips) return null;
        var best = null;
        var bestDistance = 999999;
        for (var i = 0; i < clips.numItems; i++) {
            var clip = clips[i];
            var distance = Math.abs(readTimeSeconds(clip.start) - startSec);
            var nameMatches = !expectedName || String(clip.name || "") === String(expectedName);
            if (distance < 0.05 && nameMatches && distance < bestDistance) {
                best = { clip: clip, index: i };
                bestDistance = distance;
            }
        }
        return best;
    }

    function applyAutoZoomTransform(seq, trackIndex, clipIndex, clip, startSec, endSec, style, zoomRatio, frameDurationSec, result) {
        var motionScale = findAutoZoomMotionScaleProperty(clip);
        if (motionScale) {
            var motionApplied = applyAutoZoomScaleProperty(motionScale, clip, startSec, endSec, style, zoomRatio, null, frameDurationSec);
            if (motionApplied) {
                return true;
            }
            appendAll(result.warnings, ["INTRINSIC_MOTION_SCALE_WRITE_FAILED"]);
        } else {
            appendAll(result.warnings, ["INTRINSIC_MOTION_SCALE_NOT_FOUND"]);
        }

        try { app.enableQE(); } catch (eQE) { return false; }
        var qeSeq = qe.project.getActiveSequence();
        if (!qeSeq) return false;
        var qeTrack = qeSeq.getVideoTrackAt(trackIndex);
        if (!qeTrack) return false;
        var clipStartSec = readTimeSeconds(clip && clip.start);
        var qeClip = findQeVideoItemAtTime(qeTrack, clipStartSec, clipIndex);
        if (!qeClip || !qeClip.addVideoEffect) return false;
        var transform = null;
        try { transform = qe.project.getVideoEffectByName("Transform"); } catch (eEffect) {}
        if (!transform) {
            result.warnings.push("TRANSFORM_VIDEO_EFFECT_NOT_FOUND");
            return false;
        }
        try { qeClip.addVideoEffect(transform); } catch (eAddEffect) {
            result.warnings.push("TRANSFORM_VIDEO_EFFECT_ADD_FAILED");
            return false;
        }
        var refreshed = findTrackItemAtTime(seq.videoTracks[trackIndex], clipStartSec, "");
        var refreshedClip = refreshed && refreshed.clip ? refreshed.clip : clip;
        var component = findAutoZoomTransformComponent(refreshedClip);
        if (!component) {
            result.warnings.push("TRANSFORM_COMPONENT_NOT_VISIBLE_AFTER_ADD");
            return false;
        }
        var scaleWidth = findComponentPropertyByNames(component, ["Scale Width", "Scale"]);
        var scaleHeight = findComponentPropertyByNames(component, ["Scale Height"]);
        if (!scaleWidth && component.properties && component.properties.numItems > 3) scaleWidth = component.properties[3];
        if (!scaleHeight && component.properties && component.properties.numItems > 2) scaleHeight = component.properties[2];
        if (!scaleWidth) {
            result.warnings.push("TRANSFORM_SCALE_PROPERTY_NOT_FOUND");
            return false;
        }
        return applyAutoZoomScaleProperty(scaleWidth, refreshedClip, startSec, endSec, style, zoomRatio, scaleHeight, frameDurationSec);
    }

    function findAutoZoomMotionScaleProperty(clip) {
        var components = clip && clip.components;
        if (!components) return null;
        var motion = null;
        for (var i = 0; i < components.numItems; i++) {
            var component = components[i];
            var name = "";
            try { name = (String(component.matchName || "") + "|" + String(component.displayName || "")).toLowerCase(); } catch (eName) {}
            if (name === "adbe motion" || name.indexOf("motion") >= 0) {
                motion = component;
                break;
            }
        }
        if (!motion && components.numItems > 1) motion = components[1];
        if (!motion) return null;
        var scale = findComponentPropertyByNames(motion, ["Scale", "ADBE Scale", "ADBE Motion Scale"]);
        if (!scale && motion.properties && motion.properties.numItems > 1) scale = motion.properties[1];
        return scale || null;
    }

    function applyAutoZoomScaleProperty(scaleWidth, clip, startSec, endSec, style, zoomRatio, scaleHeight, frameDurationSec) {
        var clipStartSec = readTimeSeconds(clip && clip.start);
        var clipEndSec = readTimeSeconds(clip && clip.end);
        var safeStartSec = Math.max(clipStartSec, startSec);
        var safeEndSec = Math.min(clipEndSec, endSec);
        if (!(safeEndSec > safeStartSec)) return false;
        var baseWidth = readAutoZoomScaleValue(scaleWidth, 100);
        var baseHeight = scaleHeight && scaleHeight !== scaleWidth
            ? readAutoZoomScaleValue(scaleHeight, baseWidth)
            : baseWidth;
        var duration = safeEndSec - safeStartSec;
        var entryDuration = autoZoomEntryDuration(style, duration, frameDurationSec);
        var widthKeys = buildAutoZoomScaleKeys(safeStartSec, safeEndSec, style, baseWidth, baseWidth * zoomRatio, entryDuration, clipStartSec);
        var heightKeys = buildAutoZoomScaleKeys(safeStartSec, safeEndSec, style, baseHeight, baseHeight * zoomRatio, entryDuration, clipStartSec);
        var widthOk = setComponentPropertyKeys(scaleWidth, widthKeys, clipStartSec, clipEndSec);
        var heightOk = true;
        if (scaleHeight && scaleHeight !== scaleWidth) heightOk = setComponentPropertyKeys(scaleHeight, heightKeys, clipStartSec, clipEndSec);
        return widthOk && heightOk;
    }

    function autoZoomEntryDuration(style, durationSec, frameDurationSec) {
        if (style === "jump") return Math.min(frameDurationSec || 1 / 25, durationSec / 4);
        if (style === "snap") return Math.min(0.16, durationSec / 3);
        return Math.min(0.3, durationSec / 3);
    }

    function calculateAutoZoomPeakTime(startSec, endSec, style, frameDurationSec) {
        var duration = Math.max(0, Number(endSec) - Number(startSec));
        return Number(startSec) + autoZoomEntryDuration(style, duration, frameDurationSec);
    }

    function buildAutoZoomScaleKeys(startSec, endSec, style, baseScale, zoomScale, transitionSec, clipStartSec) {
        var transition = Math.max(0.001, Math.min(transitionSec, (endSec - startSec) / 3));
        if (style === "jump") {
            var keys = [];
            var preTime = startSec - 0.01;
            if (typeof clipStartSec === "number" && preTime > clipStartSec) {
                keys.push({ time: preTime, value: baseScale });
            }
            keys.push({ time: startSec, value: zoomScale });
            keys.push({ time: Math.max(startSec, endSec - transition), value: zoomScale });
            keys.push({ time: endSec, value: baseScale });
            return keys;
        }
        return [
            { time: startSec, value: baseScale },
            { time: Math.min(endSec, startSec + transition), value: zoomScale },
            { time: Math.max(startSec, endSec - transition), value: zoomScale },
            { time: endSec, value: baseScale }
        ];
    }

    function readAutoZoomScaleValue(property, fallback) {
        try {
            var value = property && property.getValue ? property.getValue() : null;
            if (typeof value === "number" && isFinite(value) && value > 0) return value;
            if (value && typeof value.length !== "undefined" && typeof value[0] === "number" && isFinite(value[0]) && value[0] > 0) {
                return value[0];
            }
        } catch (eValue) {}
        return fallback;
    }

    function findQeVideoItemAtTime(qeTrack, startSec, preferredIndex) {
        if (!qeTrack) return null;
        if (preferredIndex >= 0 && preferredIndex < qeTrack.numItems) {
            try {
                var preferred = qeTrack.getItemAt(preferredIndex);
                if (preferred && Math.abs(readTimeSeconds(preferred.start) - startSec) < 0.05) return preferred;
            } catch (ePreferred) {}
        }
        for (var i = 0; i < qeTrack.numItems; i++) {
            try {
                var item = qeTrack.getItemAt(i);
                if (!item || !item.addVideoEffect) continue;
                if (Math.abs(readTimeSeconds(item.start) - startSec) < 0.05) return item;
            } catch (eItem) {}
        }
        return null;
    }

    function findAutoZoomTransformComponent(clip) {
        var components = clip && clip.components;
        if (!components) return null;
        for (var i = components.numItems - 1; i >= 0; i--) {
            var component = components[i];
            var name = "";
            try { name = (String(component.matchName || "") + "|" + String(component.displayName || "")).toLowerCase(); } catch (eName) {}
            if (name.indexOf("transform") >= 0 || name.indexOf("geometry2") >= 0) return component;
            if (findComponentPropertyByNames(component, ["Scale Width"]) && findComponentPropertyByNames(component, ["Scale Height"])) {
                return component;
            }
        }
        return null;
    }

    function findComponentPropertyByNames(component, names) {
        var properties = component && component.properties;
        if (!properties) return null;
        for (var i = 0; i < properties.numItems; i++) {
            var property = properties[i];
            var label = "";
            try { label = String(property.displayName || "").toLowerCase(); } catch (eLabel) {}
            var matchName = "";
            try { matchName = String(property.matchName || "").toLowerCase(); } catch (eMatchName) {}
            for (var n = 0; n < names.length; n++) {
                var expected = String(names[n]).toLowerCase();
                if (label === expected || matchName === expected) return property;
            }
        }
        return null;
    }

    function setComponentPropertyStatic(property, value) {
        try {
            if (property.setTimeVarying) property.setTimeVarying(false);
            var result = property.setValue(value, true);
            return result === 0 || result === true || typeof result === "undefined";
        } catch (eSet) { return false; }
    }

    function setComponentPropertyKeys(property, keys, clipStartSec, clipEndSec) {
        try {
            var baseScale = 100;
            if (keys && keys.length > 0) {
                baseScale = keys[keys.length - 1].value;
            }
            if (typeof property.setTimeVarying === "function") {
                property.setTimeVarying(false);
                property.setValue(baseScale, true);
                property.setTimeVarying(true);
                // Clear any auto-generated keyframe at the playhead inside the clip range
                if (typeof property.removeKeyRange === "function" && typeof clipStartSec === "number" && typeof clipEndSec === "number") {
                    var tStart = new Time();
                    tStart.seconds = clipStartSec;
                    var tEnd = new Time();
                    tEnd.seconds = clipEndSec;
                    property.removeKeyRange(tStart, tEnd);
                }
            } else {
                property.setTimeVarying(true);
            }
            for (var i = 0; i < keys.length; i++) {
                var time = new Time();
                time.seconds = keys[i].time;
                property.addKey(time);
                property.setValueAtKey(time, keys[i].value, true);
                try { property.setInterpolationTypeAtKey(time, 1, true); } catch (eInterpolation) {}
            }
            return verifyComponentPropertyKeys(property, keys);
        } catch (eKeys) { return false; }
    }

    function verifyComponentPropertyKeys(property, expectedKeys) {
        if (!property || typeof property.getKeys !== "function") return true;
        try {
            var actualKeys = property.getKeys();
            if (!actualKeys || actualKeys.length < expectedKeys.length) return false;
            for (var expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex++) {
                var expectedTime = Number(expectedKeys[expectedIndex].time);
                var matched = false;
                for (var actualIndex = 0; actualIndex < actualKeys.length; actualIndex++) {
                    var actualTime = readTimeSeconds(actualKeys[actualIndex]);
                    if (Math.abs(actualTime - expectedTime) <= 0.002) {
                        if (!autoZoomKeyValueMatches(property, actualKeys[actualIndex], expectedKeys[expectedIndex].value)) {
                            return false;
                        }
                        matched = true;
                        break;
                    }
                }
                if (!matched) return false;
            }
            return true;
        } catch (eVerify) { return false; }
    }

    function autoZoomKeyValueMatches(property, keyTime, expectedValue) {
        var actualValue;
        var valueReadable = false;
        try {
            if (typeof property.getValueAtKey === "function") {
                actualValue = property.getValueAtKey(keyTime);
                valueReadable = true;
            } else if (typeof property.getValueAtTime === "function") {
                actualValue = property.getValueAtTime(keyTime);
                valueReadable = true;
            }
        } catch (eReadValue) { return false; }
        if (!valueReadable) return true;
        if (actualValue && typeof actualValue.length !== "undefined") actualValue = actualValue[0];
        actualValue = Number(actualValue);
        return isFinite(actualValue) && Math.abs(actualValue - Number(expectedValue)) <= 0.01;
    }

    function organizeExistingGeneratedProjectItems(result) {
        var root = app.project && app.project.rootItem;
        if (!root || !root.children) return;
        for (var i = root.children.numItems - 1; i >= 0; i--) {
            var item = root.children[i];
            var name = "";
            try { name = item && item.name ? String(item.name) : ""; } catch (eName) {}
            if (name.indexOf("Saad Silence ") === 0) {
                moveGeneratedProjectItemToBin(item, "Silence Removal", result);
            } else if (name.indexOf("Saad Auto Switch ") === 0) {
                moveGeneratedProjectItemToBin(item, "Multi-Cam Auto Switch", result);
            }
        }
    }

    function moveGeneratedProjectItemToBin(projectItem, toolBinName, result) {
        if (!projectItem || !projectItem.moveBin) return false;
        var toolBin = getOrCreateSaadGeneratedToolBin(toolBinName);
        if (!toolBin) {
            if (result && result.warnings) result.warnings.push("GENERATED_PROJECT_BIN_UNAVAILABLE:" + toolBinName);
            return false;
        }
        try {
            projectItem.moveBin(toolBin);
            return true;
        } catch (eMoveBin) {
            if (result && result.warnings) result.warnings.push("GENERATED_PROJECT_ITEM_MOVE_FAILED:" + toolBinName);
            return false;
        }
    }

    function getOrCreateSaadGeneratedToolBin(toolBinName) {
        var root = app.project && app.project.rootItem;
        if (!root) return null;
        var generatedRootName = "Saad Studio - " + readSaadProjectName();
        var generatedRoot = findDirectProjectBin(root, generatedRootName);
        if (!generatedRoot && root.createBin) {
            try {
                generatedRoot = root.createBin(generatedRootName);
            } catch (eRootBin) {}
            if (!generatedRoot) generatedRoot = findDirectProjectBin(root, generatedRootName);
        }
        if (!generatedRoot) return null;
        var toolBin = findDirectProjectBin(generatedRoot, toolBinName);
        if (!toolBin && generatedRoot.createBin) {
            try {
                toolBin = generatedRoot.createBin(toolBinName);
            } catch (eToolBin) {}
            if (!toolBin) toolBin = findDirectProjectBin(generatedRoot, toolBinName);
        }
        return toolBin;
    }

    function readSaadProjectName() {
        var projectName = "Untitled Project";
        try {
            if (app.project && app.project.name) projectName = String(app.project.name);
        } catch (eProjectName) {}
        projectName = projectName.replace(/\.prproj$/i, "");
        projectName = projectName.replace(/[\\\/:*?"<>|]/g, "-");
        return projectName || "Untitled Project";
    }

    function findDirectProjectBin(parent, name) {
        var children = parent && parent.children;
        if (!children) return null;
        for (var i = 0; i < children.numItems; i++) {
            var child = children[i];
            try {
                if (child && child.name === name && child.children) return child;
            } catch (eChild) {}
        }
        return null;
    }

    function emptyApplyCameraDecisionSegmentResult(decision, index) {
        return {
            decisionIndex: index,
            cameraLabel: decision && decision.cameraLabel ? decision.cameraLabel : "",
            videoTrackIndex: decision && typeof decision.videoTrackIndex !== "undefined" ? Number(decision.videoTrackIndex) : null,
            matchType: "SKIPPED_NO_OVERLAP",
            decisionStartSec: Number(decision && decision.startSec ? decision.startSec : 0),
            decisionEndSec: Number(decision && decision.endSec ? decision.endSec : 0),
            durationSec: Number(decision && decision.durationSec ? decision.durationSec : 0),
            isValidTiming: false,
            invalidReason: null,
            matchingSourceClipFound: false,
            clipName: null,
            matchingClipName: null,
            clipStartSec: null,
            clipEndSec: null,
            matchingClipStartSec: null,
            matchingClipEndSec: null,
            overlapStartSec: null,
            overlapEndSec: null,
            overlapDurationSec: null,
            sourceInSec: null,
            sourceOutSec: null,
            subclipCreated: false,
            overwriteResult: false,
            blockers: [],
            errors: []
        };
    }

    function findBestOverlapClipForDecision(seq, videoTrackIndex, startSec, endSec) {
        if (!seq || !seq.videoTracks || videoTrackIndex < 0 || seq.videoTracks.numTracks <= videoTrackIndex) return null;
        var track = seq.videoTracks[videoTrackIndex];
        var clips = track && track.clips;
        if (!clips) return null;
        var best = null;
        for (var c = 0; c < clips.numItems; c++) {
            var clip = clips[c];
            if (isGeneratedPodcastSourceClip(clip)) continue;
            var clipStart = readTimeSeconds(clip.start);
            var clipEnd = readTimeSeconds(clip.end);
            var overlapStart = Math.max(startSec, clipStart);
            var overlapEnd = Math.min(endSec, clipEnd);
            if (overlapEnd > overlapStart) {
                var candidate = {
                    clip: clip,
                    clipStartSec: clipStart,
                    clipEndSec: clipEnd,
                    overlapStartSec: overlapStart,
                    overlapEndSec: overlapEnd,
                    overlapDurationSec: overlapEnd - overlapStart,
                    full: clipStart <= startSec && clipEnd >= endSec
                };
                if (!best || candidate.full || candidate.overlapDurationSec > best.overlapDurationSec) {
                    best = candidate;
                }
                if (candidate.full) break;
            }
        }
        return best;
    }

    function isGeneratedPodcastSourceClip(clip) {
        var clipName = "";
        var projectItemName = "";
        try { clipName = clip && clip.name ? String(clip.name) : ""; } catch (eClipName) {}
        try { projectItemName = clip && clip.projectItem && clip.projectItem.name ? String(clip.projectItem.name) : ""; } catch (ePiName) {}
        return clipName.indexOf("Saad Proof Segment") === 0
            || projectItemName.indexOf("Saad Proof Segment") === 0
            || clipName.indexOf("Saad Silence ") === 0
            || projectItemName.indexOf("Saad Silence ") === 0
            || clipName.indexOf("Saad Auto Switch ") === 0
            || projectItemName.indexOf("Saad Auto Switch ") === 0;
    }

    function readSequenceSnapshots() {
        var out = [];
        var seqs = app.project && app.project.sequences;
        if (!seqs) return out;
        for (var i = 0; i < seqs.numSequences; i++) {
            out.push({
                name: seqs[i].name || null,
                sequenceID: readSequenceID(seqs[i])
            });
        }
        return out;
    }

    function readSequenceID(seq) {
        try {
            return seq.sequenceID || null;
        } catch (eId) {
            return null;
        }
    }

    function sequenceIDSet(snapshots) {
        var ids = {};
        for (var i = 0; i < snapshots.length; i++) {
            if (snapshots[i].sequenceID) ids[snapshots[i].sequenceID] = true;
        }
        return ids;
    }

    function sequenceNamesFromSnapshots(snapshots) {
        var out = [];
        for (var i = 0; i < snapshots.length; i++) out.push(snapshots[i].name);
        return out;
    }

    function sequenceIDsFromSnapshots(snapshots) {
        var out = [];
        for (var i = 0; i < snapshots.length; i++) out.push(snapshots[i].sequenceID);
        return out;
    }

    function findNewSequenceBySequenceIDDiff(beforeIds) {
        var seqs = app.project && app.project.sequences;
        if (!seqs) return null;
        for (var i = 0; i < seqs.numSequences; i++) {
            var seq = seqs[i];
            var id = readSequenceID(seq);
            if (id && !beforeIds[id]) return seq;
        }
        return null;
    }

    function createPodcastResearchDuplicate(label, exactDuplicateName) {
        var result = {
            ok: false,
            label: label,
            originalSequenceName: null,
            originalSequenceID: null,
            newSequenceName: null,
            newSequenceID: null,
            cloneResult: false,
            renameResult: false,
            duplicateValidationPassed: false,
            activeSequenceAfterCloneID: null,
            activeSequenceAfterCloneName: null,
            workingSequenceID: null,
            workingSequenceName: null,
            workingSequenceVideoTrackCount: null,
            workingSequenceAudioTrackCount: null,
            errors: [],
            blockers: [],
            newSequence: null
        };
        if (!IS_PPRO) {
            result.blockers.push("PREMIERE_REQUIRED");
            return result;
        }
        var seq = app.project && app.project.activeSequence;
        if (!seq) {
            result.blockers.push("NO_ACTIVE_SEQUENCE");
            return result;
        }
        if (!seq.clone) {
            result.blockers.push("SEQUENCE_CLONE_UNAVAILABLE");
            return result;
        }
        result.originalSequenceName = seq.name || null;
        result.originalSequenceID = readSequenceID(seq);
        var beforeSnapshots = readSequenceSnapshots();
        var beforeIds = sequenceIDSet(beforeSnapshots);
        var beforeCount = app.project.sequences ? app.project.sequences.numSequences : 0;
        try {
            result.cloneResult = seq.clone() === true;
        } catch (eClone) {
            result.errors.push(String(eClone.message || eClone));
            result.cloneResult = false;
        }
        if (!result.cloneResult) {
            result.blockers.push("SEQUENCE_CLONE_FAILED");
            return result;
        }
        var newSeq = findNewSequenceBySequenceIDDiff(beforeIds);
        if (!newSeq && app.project.sequences && app.project.sequences.numSequences > beforeCount) {
            newSeq = app.project.sequences[app.project.sequences.numSequences - 1];
        }
        if (!newSeq) {
            result.blockers.push("DUPLICATED_SEQUENCE_NOT_DETECTED");
            return result;
        }
        var desiredName = exactDuplicateName
            ? String(exactDuplicateName)
            : String((result.originalSequenceName || "Sequence") + " - Saad " + label);
        try { newSeq.name = desiredName; } catch (eName) { result.errors.push(String(eName.message || eName)); }
        try { if (newSeq.projectItem) newSeq.projectItem.name = desiredName; } catch (ePiName) { result.errors.push(String(ePiName.message || ePiName)); }
        try { if (newSeq.projectItem) moveGeneratedProjectItemToBin(newSeq.projectItem, "Sequences", result); } catch (eMoveSequence) {}
        result.newSequence = newSeq;
        result.newSequenceName = newSeq.name || null;
        result.newSequenceID = readSequenceID(newSeq);
        result.renameResult = result.newSequenceName === desiredName;
        var activeAfterClone = app.project && app.project.activeSequence;
        result.activeSequenceAfterCloneID = activeAfterClone ? readSequenceID(activeAfterClone) : null;
        result.activeSequenceAfterCloneName = activeAfterClone ? (activeAfterClone.name || null) : null;
        result.workingSequenceID = result.newSequenceID;
        result.workingSequenceName = result.newSequenceName;
        result.workingSequenceVideoTrackCount = newSeq.videoTracks ? newSeq.videoTracks.numTracks : null;
        result.workingSequenceAudioTrackCount = newSeq.audioTracks ? newSeq.audioTracks.numTracks : null;
        result.duplicateValidationPassed = result.cloneResult === true
            && !!result.newSequenceID
            && result.newSequenceID !== result.originalSequenceID;
        if (!result.renameResult) result.blockers.push("DUPLICATED_SEQUENCE_RENAME_FAILED");
        if (!result.duplicateValidationPassed) {
            if (result.cloneResult !== true) result.blockers.push("DUPLICATE_SEQUENCE_FAILED");
            else if (!result.newSequenceID) result.blockers.push("DUPLICATED_SEQUENCE_ID_NOT_DETECTED");
            else if (result.newSequenceID === result.originalSequenceID) result.blockers.push("DUPLICATED_SEQUENCE_ID_MATCHES_ORIGINAL");
        }
        result.ok = result.blockers.length === 0 && result.duplicateValidationPassed;
        return result;
    }

    function emptyPodcastExecutionResult() {
        return {
            ok: false,
            errors: [],
            blockers: [],
            warnings: [],
            newSequence: null,
            newSequenceID: null,
            newSequenceName: null,
            duplicateValidationPassed: false
        };
    }

    function createCleanSilenceSequence(sequenceName, result) {
        if (!app.project || !app.project.createNewSequence) {
            result.blockers.push("CLEAN_SEQUENCE_CREATION_NOT_AVAILABLE");
            result.errors.push("app.project.createNewSequence is unavailable in this Premiere runtime.");
            return null;
        }
        var presetPath = findSequencePresetPathForCleanDraft();
        result.cleanSequencePresetPath = presetPath;
        if (!presetPath) {
            result.blockers.push("CLEAN_SEQUENCE_CREATION_NOT_AVAILABLE");
            result.errors.push("No .sqpreset file was found for app.project.createNewSequence.");
            return null;
        }
        var beforeIds = {};
        var beforeSnapshots = readSequenceSnapshots();
        for (var i = 0; i < beforeSnapshots.length; i++) beforeIds[beforeSnapshots[i].sequenceID] = true;
        try {
            app.project.createNewSequence(sequenceName, presetPath);
        } catch (eCreateCleanSequence) {
            result.blockers.push("CLEAN_SEQUENCE_CREATION_NOT_AVAILABLE");
            result.errors.push("createNewSequence failed: " + String(eCreateCleanSequence.message || eCreateCleanSequence));
            return null;
        }
        var newSeq = findNewSequenceBySequenceIDDiff(beforeIds);
        if (!newSeq && app.project.sequences && app.project.sequences.numSequences > beforeSnapshots.length) {
            newSeq = app.project.sequences[app.project.sequences.numSequences - 1];
        }
        if (!newSeq) {
            result.blockers.push("CLEAN_SEQUENCE_CREATION_NOT_AVAILABLE");
            result.errors.push("createNewSequence returned but no new sequence could be detected.");
            return null;
        }
        try { newSeq.name = sequenceName; } catch (eRenameClean) {}
        try { if (newSeq.projectItem) moveGeneratedProjectItemToBin(newSeq.projectItem, "Silence Removal", result); } catch (eMoveCleanSequence) {}
        result.newSequence = newSeq;
        result.newSequenceID = readSequenceID(newSeq);
        result.newSequenceName = newSeq.name || sequenceName;
        result.cleanSequenceCreated = true;
        return newSeq;
    }

    function findSequencePresetPathForCleanDraft() {
        var candidates = [];
        try {
            if (app.path) candidates.push(app.path + "\\Settings\\SequencePresets");
        } catch (eAppPath) {}
        candidates.push("C:\\Program Files\\Adobe\\Adobe Premiere Pro 2026\\Settings\\SequencePresets");
        candidates.push("C:\\Program Files\\Adobe\\Adobe Premiere Pro 2025\\Settings\\SequencePresets");
        candidates.push("C:\\Program Files\\Adobe\\Adobe Premiere Pro 2024\\Settings\\SequencePresets");
        var best = null;
        for (var i = 0; i < candidates.length; i++) {
            best = findPreferredSequencePresetInFolder(new Folder(candidates[i]), 0);
            if (best) return best;
        }
        return null;
    }

    function findPreferredSequencePresetInFolder(folder, depth) {
        if (!folder || !folder.exists || depth > 5) return null;
        var files = folder.getFiles();
        var fallback = null;
        for (var i = 0; i < files.length; i++) {
            var item = files[i];
            if (item instanceof Folder) {
                var nested = findPreferredSequencePresetInFolder(item, depth + 1);
                if (nested && String(nested).toLowerCase().indexOf("1080") !== -1) return nested;
                if (!fallback && nested) fallback = nested;
                continue;
            }
            var path = item.fsName || String(item);
            if (!/\.sqpreset$/i.test(path)) continue;
            if (!fallback) fallback = path;
            var lower = path.toLowerCase();
            if (lower.indexOf("1080") !== -1 && (lower.indexOf("30") !== -1 || lower.indexOf("29") !== -1)) return path;
        }
        return fallback;
    }

    function cleanSequenceHasEnoughTracks(cleanSeq, originalSeq, result) {
        var cleanVideo = cleanSeq && cleanSeq.videoTracks ? cleanSeq.videoTracks.numTracks : 0;
        var cleanAudio = cleanSeq && cleanSeq.audioTracks ? cleanSeq.audioTracks.numTracks : 0;
        var originalVideo = originalSeq && originalSeq.videoTracks ? originalSeq.videoTracks.numTracks : 0;
        var originalAudio = originalSeq && originalSeq.audioTracks ? originalSeq.audioTracks.numTracks : 0;
        if (cleanVideo < originalVideo || cleanAudio < originalAudio) {
            result.blockers.push("CLEAN_SEQUENCE_TRACK_COUNT_INSUFFICIENT");
            result.errors.push("Clean sequence tracks " + cleanVideo + " video/" + cleanAudio + " audio; original requires " + originalVideo + " video/" + originalAudio + " audio.");
            return false;
        }
        return true;
    }

    function firstClipFromSequence(seq) {
        if (!seq) return null;
        var tracks = seq.videoTracks;
        if (!tracks) return null;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t] && tracks[t].clips;
            if (clips && clips.numItems > 0) return clips[0];
        }
        return null;
    }

    function firstLongClipOnVideoTrack(seq, trackIndex, minDurationSec) {
        if (!seq || !seq.videoTracks || seq.videoTracks.numTracks <= trackIndex) return null;
        var track = seq.videoTracks[trackIndex];
        var clips = track && track.clips;
        if (!clips) return null;
        for (var c = 0; c < clips.numItems; c++) {
            var clip = clips[c];
            if (selectedTimelineDurationSec(clip) >= minDurationSec) return clip;
        }
        return null;
    }

    function hasTimeRangeDisableApi(clip) {
        if (!clip) return false;
        var methodNames = [
            "disableRange",
            "setDisabledRange",
            "setDisabledAtTime",
            "createSetDisabledRangeAction",
            "createSetDisabledActionForRange"
        ];
        for (var i = 0; i < methodNames.length; i++) {
            try {
                if (typeof clip[methodNames[i]] === "function") return true;
            } catch (eMethod) {}
        }
        return false;
    }

    function reconstructDecisionSegment(seq, targetTrack, decision, index) {
        var result = emptyReconstructSegmentResult(decision, index);
        result.targetTrackHasOverwriteClip = !!(targetTrack && targetTrack.overwriteClip);
        result.availableClipsOnTrack = listClipsOnVideoTrack(seq, decision.sourceVideoTrackIndex);
        var clip = findClipCoveringTimelineRange(seq, decision.sourceVideoTrackIndex, decision.startSec, decision.endSec);
        if (!clip) {
            result.partialOverlap = findPartialClipOverlap(seq, decision.sourceVideoTrackIndex, decision.startSec, decision.endSec);
            if (result.partialOverlap) result.blockers.push("PARTIAL_SOURCE_CLIP_OVERLAP");
            result.blockers.push("SOURCE_CLIP_NOT_FOUND");
            return result;
        }
        result.sourceClipFound = true;
        result.sourceClipName = clip.name || null;
        result.sourceClipStartSec = readTimeSeconds(clip.start);
        result.sourceClipEndSec = readTimeSeconds(clip.end);
        var projectItem = clip.projectItem;
        if (!projectItem) {
            result.blockers.push("PROJECT_ITEM_MISSING");
            return result;
        }
        result.projectItemFound = true;
        result.projectItemName = projectItem.name || null;
        result.projectItemHasCreateSubClip = !!projectItem.createSubClip;
        if (!projectItem.createSubClip) {
            result.blockers.push("CREATE_SUBCLIP_NOT_AVAILABLE");
            return result;
        }
        var sourceIn = readTimeSeconds(clip.inPoint) + (decision.startSec - readTimeSeconds(clip.start));
        var sourceOut = readTimeSeconds(clip.inPoint) + (decision.endSec - readTimeSeconds(clip.start));
        if (!(sourceOut > sourceIn)) {
            result.blockers.push("INVALID_SOURCE_SUBRANGE");
            return result;
        }
        result.sourceInSec = sourceIn;
        result.sourceOutSec = sourceOut;
        result.sourceInTicks = secondsToTicksString(sourceIn);
        result.sourceOutTicks = secondsToTicksString(sourceOut);
        if (!result.targetTrackHasOverwriteClip) {
            result.blockers.push("OVERWRITECLIP_NOT_AVAILABLE");
            return result;
        }
        var subclip = null;
        result.createSubClipAttempted = true;
        try {
            subclip = projectItem.createSubClip(
                "Saad Proof Segment " + (index + 1) + " " + ts(),
                result.sourceInTicks,
                result.sourceOutTicks,
                1,
                1,
                0
            );
        } catch (eSubclip) {
            result.createSubClipResult = "error";
            result.blockers.push("CREATE_SUBCLIP_FAILED");
            result.errors.push(String(eSubclip.message || eSubclip));
            return result;
        }
        if (!subclip) {
            result.createSubClipResult = String(subclip);
            result.blockers.push("CREATE_SUBCLIP_FAILED");
            return result;
        }
        moveGeneratedProjectItemToBin(subclip, "Runtime Proof", result);
        result.createSubClipResult = "success";
        result.subclipName = subclip.name || null;
        result.overwriteAttempted = true;
        try {
            targetTrack.overwriteClip(subclip, secondsToTicksString(decision.targetStartSec));
            result.overwriteResult = true;
        } catch (eOverwrite) {
            result.overwriteResult = false;
            result.blockers.push("OVERWRITECLIP_FAILED");
            result.errors.push(String(eOverwrite.message || eOverwrite));
            return result;
        }
        result.ok = true;
        return result;
    }

    function emptyReconstructSegmentResult(decision, index) {
        return {
            ok: false,
            segmentIndex: index,
            cameraLabel: decision.cameraLabel || null,
            sourceVideoTrackIndex: decision.sourceVideoTrackIndex,
            sourceClipFound: false,
            sourceClipName: null,
            sourceClipStartSec: null,
            sourceClipEndSec: null,
            projectItemFound: false,
            projectItemName: null,
            projectItemHasCreateSubClip: false,
            sourceInSec: null,
            sourceOutSec: null,
            sourceInTicks: null,
            sourceOutTicks: null,
            createSubClipAttempted: false,
            createSubClipResult: null,
            subclipName: null,
            targetVideoTrackIndex: 0,
            targetTrackHasOverwriteClip: false,
            overwriteAttempted: false,
            overwriteResult: null,
            availableClipsOnTrack: [],
            partialOverlap: null,
            blockers: [],
            errors: []
        };
    }

    function appendAll(target, values) {
        if (!values) return;
        for (var i = 0; i < values.length; i++) {
            if (values[i] && target.join("|").indexOf(values[i]) === -1) target.push(values[i]);
        }
    }

    function findClipCoveringTimelineRange(seq, videoTrackIndex, startSec, endSec) {
        if (!seq || !seq.videoTracks || seq.videoTracks.numTracks <= videoTrackIndex) return null;
        var track = seq.videoTracks[videoTrackIndex];
        var clips = track && track.clips;
        if (!clips) return null;
        for (var c = 0; c < clips.numItems; c++) {
            var clip = clips[c];
            var clipStart = readTimeSeconds(clip.start);
            var clipEnd = readTimeSeconds(clip.end);
            if (clipStart <= startSec && clipEnd >= endSec) return clip;
        }
        return null;
    }

    function listClipsOnVideoTrack(seq, videoTrackIndex) {
        var out = [];
        if (!seq || !seq.videoTracks || seq.videoTracks.numTracks <= videoTrackIndex) return out;
        var track = seq.videoTracks[videoTrackIndex];
        var clips = track && track.clips;
        if (!clips) return out;
        for (var c = 0; c < clips.numItems; c++) {
            var clip = clips[c];
            var projectItem = clip && clip.projectItem;
            out.push({
                sourceVideoTrackIndex: videoTrackIndex,
                clipIndex: c,
                clipName: clip && clip.name ? String(clip.name) : null,
                clipStartSec: readTimeSeconds(clip && clip.start),
                clipEndSec: readTimeSeconds(clip && clip.end),
                clipInPointSec: readTimeSeconds(clip && clip.inPoint),
                clipOutPointSec: readTimeSeconds(clip && clip.outPoint),
                projectItemName: projectItem && projectItem.name ? String(projectItem.name) : null,
                hasProjectItem: !!projectItem
            });
        }
        return out;
    }

    function findPartialClipOverlap(seq, videoTrackIndex, startSec, endSec) {
        var clips = listClipsOnVideoTrack(seq, videoTrackIndex);
        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            if (typeof clip.clipStartSec !== "number" || typeof clip.clipEndSec !== "number") continue;
            var overlapStart = Math.max(startSec, clip.clipStartSec);
            var overlapEnd = Math.min(endSec, clip.clipEndSec);
            if (overlapEnd > overlapStart) {
                return {
                    sourceVideoTrackIndex: videoTrackIndex,
                    clipIndex: clip.clipIndex,
                    clipName: clip.clipName,
                    decisionStartSec: startSec,
                    decisionEndSec: endSec,
                    clipStartSec: clip.clipStartSec,
                    clipEndSec: clip.clipEndSec,
                    overlapStartSec: overlapStart,
                    overlapEndSec: overlapEnd,
                    overlapDurationSec: overlapEnd - overlapStart
                };
            }
        }
        return null;
    }

    function secondsToTicksString(seconds) {
        return String(Math.round(Number(seconds || 0) * PREMIERE_TICKS_PER_SECOND));
    }

    function timelineSecondsToPlayerTicks(sequence, seconds) {
        var timelineTicks = Math.round(Number(seconds || 0) * PREMIERE_TICKS_PER_SECOND);
        var zeroPointTicks = 0;
        try {
            var zeroPoint = sequence ? sequence.zeroPoint : 0;
            if (zeroPoint && typeof zeroPoint.ticks !== "undefined") zeroPoint = zeroPoint.ticks;
            zeroPointTicks = Number(zeroPoint || 0);
            if (!isFinite(zeroPointTicks)) zeroPointTicks = 0;
        } catch (eZeroPoint) {
            zeroPointTicks = 0;
        }
        return String(Math.max(0, Math.round(timelineTicks - zeroPointTicks)));
    }

    function selectAutoZoomPreviewClip(sequence, eventResult) {
        var trackIndex = Number(eventResult && eventResult.targetTrackIndex);
        var clipIndex = Number(eventResult && eventResult.targetClipIndex);
        var tracks = sequence && sequence.videoTracks;
        if (!tracks || !isFinite(trackIndex) || !isFinite(clipIndex)
            || trackIndex < 0 || trackIndex >= tracks.numTracks) return false;
        var targetTrack = tracks[trackIndex];
        var targetClips = targetTrack && targetTrack.clips;
        if (!targetClips || clipIndex < 0 || clipIndex >= targetClips.numItems) return false;
        try {
            for (var videoTrackIndex = 0; videoTrackIndex < tracks.numTracks; videoTrackIndex++) {
                var clips = tracks[videoTrackIndex] && tracks[videoTrackIndex].clips;
                if (!clips) continue;
                for (var itemIndex = 0; itemIndex < clips.numItems; itemIndex++) {
                    var item = clips[itemIndex];
                    if (item && typeof item.setSelected === "function") item.setSelected(false, false);
                }
            }
            var targetClip = targetClips[clipIndex];
            if (!targetClip || typeof targetClip.setSelected !== "function") return false;
            targetClip.setSelected(true, true);
            return true;
        } catch (eSelectPreviewClip) {
            return false;
        }
    }

    function stripRuntimeSequence(result) {
        try { delete result.newSequence; } catch (eDelete) { result.newSequence = null; }
        return result;
    }

    function podcastEmptyTimelineLayout(status, message) {
        return {
            status: status,
            sequenceId: null,
            sequenceName: null,
            sequenceDurationSec: null,
            workArea: null,
            videoTracks: [],
            audioTracks: [],
            supportedExecutionStrategies: ["decision-plan-only"],
            unsupportedApis: [
                "Official ExtendScript API for set/get active multicam camera angle"
            ],
            recommendedStrategy: "decision-plan-only",
            messages: [message]
        };
    }

    function readPodcastTracks(tracks, kind) {
        var out = [];
        if (!tracks) return out;
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            var clips = track && track.clips;
            var clipCount = clips ? clips.numItems : 0;
            var firstClip = null;
            try {
                firstClip = clipCount > 0 ? clips[0] : null;
            } catch (eClip) { firstClip = null; }
            out.push({
                kind: kind,
                index: t,
                name: readTrackName(track, kind, t),
                clipCount: clipCount,
                firstClipStartSec: firstClip && firstClip.start ? firstClip.start.seconds : null,
                firstClipEndSec: firstClip && firstClip.end ? firstClip.end.seconds : null
            });
        }
        return out;
    }

    function podcastEmptySynchronizationSnapshot(status, message) {
        return {
            status: status,
            sequenceId: null,
            sequenceName: null,
            sequenceDurationSec: null,
            videoTrackCount: 0,
            audioTrackCount: 0,
            videoClips: [],
            audioClips: [],
            messages: [message],
            blockers: [],
            timelineMutation: "none",
            sequenceMutation: "none"
        };
    }

    function readPodcastTimelineClips(tracks, kind) {
        var out = [];
        if (!tracks) return out;
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            var clips = track && track.clips;
            if (!clips) continue;
            for (var c = 0; c < clips.numItems; c++) {
                out.push(readPodcastTimelineClip(track, clips[c], kind, t, c));
            }
        }
        return out;
    }

    function readPodcastTimelineClip(track, clip, kind, trackIndex, clipIndex) {
        var projectItem = clip && clip.projectItem;
        var sourcePath = null;
        try {
            sourcePath = projectItem && projectItem.getMediaPath ? projectItem.getMediaPath() : null;
        } catch (ePath) { sourcePath = null; }
        var timelineStartSec = readTimeSeconds(clip && clip.start);
        var timelineEndSec = readTimeSeconds(clip && clip.end);
        return {
            kind: kind,
            trackIndex: trackIndex,
            clipIndex: clipIndex,
            trackName: readTrackName(track, kind, trackIndex),
            clipName: clip && clip.name ? String(clip.name) : null,
            projectItemName: projectItem && projectItem.name ? String(projectItem.name) : null,
            sourcePath: sourcePath ? String(sourcePath) : null,
            mediaAvailable: !!sourcePath,
            timelineStartSec: timelineStartSec,
            timelineEndSec: timelineEndSec,
            sourceInPointSec: readTimeSeconds(clip && clip.inPoint),
            sourceOutPointSec: readTimeSeconds(clip && clip.outPoint),
            durationSec: (typeof timelineStartSec === "number" && typeof timelineEndSec === "number")
                ? Math.max(0, timelineEndSec - timelineStartSec)
                : selectedTimelineDurationSec(clip)
        };
    }

    function moveSyncTrackItem(tracks, kind, trackIndex, clipIndex, moveSec, targetStartSec, result) {
        if (!tracks || trackIndex < 0 || trackIndex >= tracks.numTracks) {
            result.blockers.push((kind === "video" ? "VIDEO" : "AUDIO") + "_TRACK_NOT_FOUND:" + (trackIndex + 1));
            return 0;
        }
        var track = tracks[trackIndex];
        var clips = track && track.clips;
        if (!clips || clipIndex < 0 || clipIndex >= clips.numItems) {
            result.blockers.push((kind === "video" ? "VIDEO" : "AUDIO") + "_CLIP_NOT_FOUND:" + (trackIndex + 1) + ":" + clipIndex);
            return 0;
        }
        var clip = clips[clipIndex];
        if (!clip || !clip.start || !clip.end) {
            result.blockers.push((kind === "video" ? "VIDEO" : "AUDIO") + "_CLIP_TIMELINE_RANGE_UNAVAILABLE:" + (trackIndex + 1) + ":" + clipIndex);
            return 0;
        }
        var before = readTimeSeconds(clip.start);
        var beforeEnd = readTimeSeconds(clip.end);
        if (typeof before !== "number" || typeof beforeEnd !== "number" || !(beforeEnd > before)) {
            result.blockers.push((kind === "video" ? "VIDEO" : "AUDIO") + "_CLIP_TIMELINE_RANGE_INVALID:" + before + ":" + beforeEnd);
            return 0;
        }
        var durationSec = beforeEnd - before;
        var targetEndSec = targetStartSec + durationSec;
        var targetStartTime = new Time();
        targetStartTime.seconds = targetStartSec;
        var targetEndTime = new Time();
        targetEndTime.seconds = targetEndSec;
        var moveResult = null;
        try {
            if (targetStartSec >= before) {
                clip.end = targetEndTime;
                clip.start = targetStartTime;
            } else {
                clip.start = targetStartTime;
                clip.end = targetEndTime;
            }
            moveResult = 0;
        } catch (eMove) {
            result.blockers.push((kind === "video" ? "VIDEO" : "AUDIO") + "_CLIP_RANGE_WRITE_FAILED:" + String(eMove.message || eMove));
            return 0;
        }
        var after = readTimeSeconds(clip.start);
        var afterEnd = readTimeSeconds(clip.end);
        if (typeof after !== "number" || typeof afterEnd !== "number"
            || Math.abs(after - targetStartSec) > 0.05
            || Math.abs(afterEnd - targetEndSec) > 0.05) {
            result.blockers.push((kind === "video" ? "VIDEO" : "AUDIO") + "_CLIP_RANGE_WRITE_NOT_VERIFIED:"
                + targetStartSec + ":" + after + ":" + targetEndSec + ":" + afterEnd);
            return 0;
        }
        result.clipsMoved += 1;
        result.movedItems.push({
            kind: kind,
            trackIndex: trackIndex,
            clipIndex: clipIndex,
            clipName: clip && clip.name ? String(clip.name) : null,
            moveSec: moveSec,
            beforeStartSec: before,
            afterStartSec: after,
            result: moveResult
        });
        return 1;
    }

    function readTrackName(track, kind, index) {
        try {
            if (track && track.name) return String(track.name);
        } catch (eName) {}
        return (kind === "video" ? "V" : "A") + (index + 1);
    }

    function inspectMappedAudioTrack(seq, mapping, result) {
        var audioTrackIndex = Number(mapping.audioTrackIndex);
        var speakerId = mapping.speakerId || ("speaker_" + (audioTrackIndex + 1));
        if (!seq.audioTracks || audioTrackIndex < 0 || audioTrackIndex >= seq.audioTracks.numTracks) {
            result.blockers.push("AUDIO_TRACK_NOT_FOUND");
            result.sources.push({
                audioTrackIndex: audioTrackIndex,
                speakerId: speakerId,
                mediaAvailable: false,
                sourceKind: "unknown",
                reason: "Audio track does not exist."
            });
            return;
        }
        var track = seq.audioTracks[audioTrackIndex];
        var clips = track && track.clips;
        var clipCount = clips ? clips.numItems : 0;
        if (clipCount === 0) {
            result.blockers.push("AUDIO_TRACK_HAS_NO_CLIPS");
            result.sources.push({
                audioTrackIndex: audioTrackIndex,
                speakerId: speakerId,
                mediaAvailable: false,
                sourceKind: "unknown",
                reason: "Audio track has no clips."
            });
            return;
        }
        if (clipCount > 1) {
            result.blockers.push("AUDIO_TRACK_HAS_MULTIPLE_CLIPS");
        }
        for (var c = 0; c < clipCount; c++) {
            var clip = clips[c];
            var sourceInfo = readAudioSourceInfo(audioTrackIndex, speakerId, c, clip, clipCount);
            result.sources.push(sourceInfo);
            if (sourceInfo.reason === "INVALID_CLIP_TIMING") result.blockers.push("INVALID_CLIP_TIMING");
            else if (!sourceInfo.mediaAvailable && sourceInfo.reason) result.blockers.push("AUDIO_SOURCE_UNAVAILABLE");
        }
    }

    function readAudioSourceInfo(audioTrackIndex, speakerId, trackItemIndex, clip, clipCount) {
        var info = {
            audioTrackIndex: audioTrackIndex,
            speakerId: speakerId,
            trackItemIndex: trackItemIndex,
            clipName: clip && clip.name ? String(clip.name) : null,
            projectItemName: null,
            sourcePath: null,
            timelineStartSec: readTimeSeconds(clip && clip.start),
            timelineEndSec: readTimeSeconds(clip && clip.end),
            sourceInPointSec: readTimeSeconds(clip && clip.inPoint),
            sourceOutPointSec: readTimeSeconds(clip && clip.outPoint),
            durationSec: selectedTimelineDurationSec(clip),
            mediaAvailable: false,
            sourceKind: clipCount > 1 ? "multiple-clips" : "unknown",
            reason: null
        };
        var projectItem = clip && clip.projectItem;
        if (projectItem) {
            try { info.projectItemName = projectItem.name ? String(projectItem.name) : null; } catch (eName) {}
        }
        if (!isValidAudioClipTiming(info)) {
            info.reason = "INVALID_CLIP_TIMING";
            return info;
        }
        if (!projectItem) {
            info.reason = "Clip has no projectItem.";
            return info;
        }
        var canChangePath = false;
        try {
            if (typeof projectItem.canChangeMediaPath === "function") {
                canChangePath = projectItem.canChangeMediaPath();
            } else {
                canChangePath = !!projectItem.canChangeMediaPath;
            }
        } catch (eCanChange) { canChangePath = false; }
        var sourcePath = null;
        try {
            sourcePath = projectItem.getMediaPath ? projectItem.getMediaPath() : null;
        } catch (ePath) { sourcePath = null; }
        if (!sourcePath) {
            info.sourceKind = canChangePath ? "unknown" : "nested-sequence";
            info.reason = canChangePath ? "ProjectItem returned no media path." : "ProjectItem has no changeable media path.";
            return info;
        }
        info.sourcePath = String(sourcePath);
        info.sourceKind = podcastSourceKindFromPath(info.sourcePath);
        info.mediaAvailable = true;
        if (clipCount > 1) {
            info.reason = "Audio track has multiple clips; each clip must be analyzed independently.";
        }
        return info;
    }

    function readTimeSeconds(time) {
        try {
            if (time && typeof time.seconds !== "undefined") return Number(time.seconds);
        } catch (eTime) {}
        return null;
    }

    function isValidAudioClipTiming(info) {
        return typeof info.timelineStartSec === "number"
            && typeof info.timelineEndSec === "number"
            && typeof info.sourceInPointSec === "number"
            && typeof info.sourceOutPointSec === "number"
            && info.timelineEndSec > info.timelineStartSec
            && info.sourceOutPointSec > info.sourceInPointSec;
    }

    function podcastSourceKindFromPath(sourcePath) {
        if (/\.(mp3|wav|m4a|aac|ogg|flac|aif|aiff)$/i.test(sourcePath)) return "independent-audio";
        if (/\.(mp4|mov|m4v|mkv|avi|webm)$/i.test(sourcePath)) return "audio-inside-video";
        return "unknown";
    }

    function readSequenceDurationSec(seq) {
        var directDuration = null;
        try {
            if (seq && seq.end && typeof seq.end.seconds !== "undefined") directDuration = Number(seq.end.seconds);
        } catch (eEnd) {}
        try {
            if (!(directDuration > 0) && seq && seq.duration && typeof seq.duration.seconds !== "undefined") directDuration = Number(seq.duration.seconds);
        } catch (eDuration) {}
        if (directDuration > 0) return directDuration;
        return readSequenceDurationFromTrackItems(seq);
    }

    function readSequenceDurationFromTrackItems(seq) {
        var maxEnd = 0;
        maxEnd = Math.max(maxEnd, readMaxTrackItemEnd(seq && seq.videoTracks));
        maxEnd = Math.max(maxEnd, readMaxTrackItemEnd(seq && seq.audioTracks));
        return maxEnd > 0 ? maxEnd : null;
    }

    function readMaxTrackItemEnd(tracks) {
        var maxEnd = 0;
        if (!tracks) return maxEnd;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t] && tracks[t].clips;
            if (!clips) continue;
            for (var c = 0; c < clips.numItems; c++) {
                var endSec = readTimeSeconds(clips[c] && clips[c].end);
                if (endSec > maxEnd) maxEnd = endSec;
            }
        }
        return maxEnd;
    }

    function readSequenceWorkArea(seq) {
        var start = null;
        var end = null;
        try {
            if (seq && seq.workInPoint && typeof seq.workInPoint.seconds !== "undefined") start = seq.workInPoint.seconds;
        } catch (eIn) {}
        try {
            if (seq && seq.workOutPoint && typeof seq.workOutPoint.seconds !== "undefined") end = seq.workOutPoint.seconds;
        } catch (eOut) {}
        try {
            if (start === null && seq && seq.getWorkInPoint) {
                var wi = seq.getWorkInPoint();
                start = wi && typeof wi.seconds !== "undefined" ? wi.seconds : null;
            }
        } catch (eGetIn) {}
        try {
            if (end === null && seq && seq.getWorkOutPoint) {
                var wo = seq.getWorkOutPoint();
                end = wo && typeof wo.seconds !== "undefined" ? wo.seconds : null;
            }
        } catch (eGetOut) {}
        if (start === null && end === null) return null;
        return { startSec: start, endSec: end };
    }

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

    function importProjectItemOnly(path, toolBinName) {
        if (!path) throw new Error("No path provided");
        var f = new File(path);
        if (!f.exists) throw new Error("File not found: " + path);

        if (IS_PPRO) {
            var destinationBin = getOrCreateSaadGeneratedToolBin(toolBinName || "Generated Media");
            app.project.importFiles([f.fsName], true, destinationBin || app.project.rootItem, false);
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
            return importProjectItemOnly(path, "Generated Media");
        });
    };

    host.saadstudio.importSrtToProject = function (path) {
        return safe(function () {
            return importProjectItemOnly(path, "Captions");
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

    host.saadstudio.importMediaFromPath = function (path, toolBinName) {
        return safe(function () {
            if (!path) throw new Error("No path provided");
            var f = new File(path);
            if (!f.exists) throw new Error("File not found: " + path);

            if (IS_PPRO) {
                var destinationBin = getOrCreateSaadGeneratedToolBin(toolBinName || "Generated Media");
                app.project.importFiles([f.fsName], true,
                    destinationBin || app.project.rootItem, false);
                // Try to insert at the playhead of the active sequence
                try {
                    var seq = app.project.activeSequence;
                    if (seq) {
                        var imported = findProjectItemByPath(destinationBin || app.project.rootItem, f.fsName)
                            || findRootItemByPath(f.fsName);
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
        return findProjectItemByPath(app.project && app.project.rootItem, fsName);
    }

    function findProjectItemByPath(parent, fsName) {
        var children = parent && parent.children;
        if (!children) return null;
        for (var i = 0; i < children.numItems; i++) {
            var child = children[i];
            try {
                if (child.getMediaPath && normalizePathValue(child.getMediaPath()) === normalizePathValue(fsName)) {
                    return child;
                }
            } catch (ePath) {}
            var nested = findProjectItemByPath(child, fsName);
            if (nested) return nested;
        }
        return null;
    }

    // ─── importRemoveBackgroundMaskFromPath(path) ──────────────────────
    // Mirrors the regular import but tags the layer/clip for matte use.

    host.saadstudio.importRemoveBackgroundMaskFromPath = function (path) {
        return safe(function () {
            var res = host.saadstudio.importMediaFromPath(path, "Remove Background");
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

    host.saadstudio.importAndPlaceOnTimeline = function (path, toolBinName) {
        return safe(function () {
            if (!path) throw new Error("No path provided");
            var f = new File(path);
            if (!f.exists) throw new Error("File not found: " + path);

            if (IS_PPRO) {
                var destinationBin = getOrCreateSaadGeneratedToolBin(toolBinName || "Generated Media");
                app.project.importFiles([f.fsName], true,
                    destinationBin || app.project.rootItem, false);

                var seq = app.project.activeSequence;
                if (!seq) return { ok: true, placed: false, reason: "no active sequence" };

                var imported = findProjectItemByPath(destinationBin || app.project.rootItem, f.fsName)
                    || findRootItemByPath(f.fsName);
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
                var destinationBin = getOrCreateSaadGeneratedToolBin("Captions");
                app.project.importFiles([f.fsName], true,
                    destinationBin || app.project.rootItem, false);

                var imported = findProjectItemByPath(destinationBin || app.project.rootItem, f.fsName)
                    || findRootItemByPath(f.fsName);
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
