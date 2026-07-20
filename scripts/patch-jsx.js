const fs = require('fs');
const path = require('path');

const jsxFile = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'jsx', 'index.jsx');
let code = fs.readFileSync(jsxFile, 'utf8');

// 1. Update activeSequence check in getPodcastSynchronizationSnapshot
const oldSeqCheck = `var seq = app.project && app.project.activeSequence;
            if (!seq) {`;

const newSeqCheck = `var seq = app.project ? app.project.activeSequence : null;
            if (!seq && app.project && app.project.sequences && app.project.sequences.numSequences > 0) {
                seq = app.project.sequences[0];
            }
            if (!seq) {`;

code = code.replace(oldSeqCheck, newSeqCheck);

// 2. Enhance readProjectItemMediaPath
const oldMediaPathFunc = `    function readProjectItemMediaPath(projectItem) {
        if (!projectItem || typeof projectItem.getMediaPath !== "function") return null;
        try {
            var path = projectItem.getMediaPath();
            return path ? String(path) : null;
        } catch (eMediaPath) {
            return null;
        }
    }`;

const newMediaPathFunc = `    function readProjectItemMediaPath(projectItem, depth) {
        if (!projectItem) return null;
        if (typeof depth === "undefined") depth = 0;
        if (depth > 5) return null;

        try {
            if (typeof projectItem.getMediaPath === "function") {
                var p = projectItem.getMediaPath();
                if (p && String(p).length > 0) return String(p);
            }
        } catch (e1) {}

        try {
            if (projectItem.mediaPath && String(projectItem.mediaPath).length > 0) {
                return String(projectItem.mediaPath);
            }
        } catch (e2) {}

        try {
            if (projectItem.isSequence && projectItem.isSequence()) {
                var seq = projectItem.getSequence();
                if (seq) {
                    if (seq.audioTracks) {
                        for (var at = 0; at < seq.audioTracks.numTracks; at++) {
                            var aClips = seq.audioTracks[at].clips;
                            for (var ac = 0; ac < aClips.numItems; ac++) {
                                var innerAudio = readProjectItemMediaPath(aClips[ac].projectItem, depth + 1);
                                if (innerAudio) return innerAudio;
                            }
                        }
                    }
                    if (seq.videoTracks) {
                        for (var vt = 0; vt < seq.videoTracks.numTracks; vt++) {
                            var vClips = seq.videoTracks[vt].clips;
                            for (var vc = 0; vc < vClips.numItems; vc++) {
                                var innerVideo = readProjectItemMediaPath(vClips[vc].projectItem, depth + 1);
                                if (innerVideo) return innerVideo;
                            }
                        }
                    }
                }
            }
        } catch (e3) {}

        try {
            var nameToFind = projectItem.name;
            if (nameToFind && depth === 0 && app.project && app.project.rootItem) {
                var found = findMediaPathInBin(app.project.rootItem, String(nameToFind));
                if (found) return found;
            }
        } catch (e4) {}

        return null;
    }

    function findMediaPathInBin(folderItem, nameToFind) {
        if (!folderItem || !folderItem.children) return null;
        for (var i = 0; i < folderItem.children.numItems; i++) {
            var child = folderItem.children[i];
            if (child.type === 2) {
                var res = findMediaPathInBin(child, nameToFind);
                if (res) return res;
            } else if (child.name && String(child.name).toLowerCase() === String(nameToFind).toLowerCase()) {
                if (typeof child.getMediaPath === "function") {
                    var p = child.getMediaPath();
                    if (p && String(p).length > 0) return String(p);
                }
            }
        }
        return null;
    }`;

code = code.replace(oldMediaPathFunc, newMediaPathFunc);

fs.writeFileSync(jsxFile, code, 'utf8');
console.log('Successfully patched adobe/saadstudio-cep/jsx/index.jsx!');
