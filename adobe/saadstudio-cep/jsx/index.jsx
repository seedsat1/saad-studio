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

    function createPodcastResearchDuplicate(label) {
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
        var desiredName = String((result.originalSequenceName || "Sequence") + " - Saad " + label);
        try { newSeq.name = desiredName; } catch (eName) { result.errors.push(String(eName.message || eName)); }
        try { if (newSeq.projectItem) newSeq.projectItem.name = desiredName; } catch (ePiName) { result.errors.push(String(ePiName.message || ePiName)); }
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
        info.mediaAvailable = clipCount === 1;
        if (clipCount > 1) {
            info.reason = "Audio track has multiple clips; version 1 does not infer continuity.";
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
        try {
            if (seq && seq.end && typeof seq.end.seconds !== "undefined") return seq.end.seconds;
        } catch (eEnd) {}
        try {
            if (seq && seq.duration && typeof seq.duration.seconds !== "undefined") return seq.duration.seconds;
        } catch (eDuration) {}
        return null;
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
