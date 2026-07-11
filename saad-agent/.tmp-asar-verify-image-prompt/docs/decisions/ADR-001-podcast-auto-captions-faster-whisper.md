# ADR-001: Podcast Auto Captions with Faster-Whisper

- Status: APPROVED WITH REQUIRED CHANGES INCORPORATED
- Date: 2026-06-20
- Target: Saad Studio CEP / Premiere Pro 26.2.0 / Windows x64
- Primary requirement: Arabic, including Iraqi Arabic

## Decision

Podcast Auto Captions is a local pipeline independent from Reap:

1. Install and verify a locked Faster-Whisper runtime and selected model.
2. Render the edited active sequence audio to WAV, with a proof-gated FFmpeg fallback.
3. Transcribe locally in Arabic with VAD and word timestamps.
4. Generate UTF-8 SRT relative to the sequence.
5. Import it into Premiere and verify creation of an editable caption track.

No stage may report success without readback or an explicit proof result.

## Why Faster-Whisper?

- CTranslate2 provides strong NVIDIA CUDA performance and a CPU fallback.
- The API directly supports forced Arabic (`ar`), VAD, and word timestamps.
- It avoids sending podcast audio to Reap or another transcription service.
- The runtime/model already passed CUDA loading on the target development machine.

Faster-Whisper does not change the underlying Whisper model's inherent accuracy; this decision concerns runtime performance, integration, and required features.

## Why not whisper.cpp?

whisper.cpp remains a valid future portable backend. It is not primary now because Windows CUDA requires a separately built/tested native distribution, it uses a separate GGML/GGUF model lifecycle, and its timing/VAD/package behavior would require another acceptance suite. Reconsider it if a single portable binary becomes the dominant requirement.

## First-run model choice

Model Manager offers these explicit first-run options:

- `base`: smaller and faster; available as required for first run.
- `medium`: larger and slower; recommended for Arabic transcription quality.

The UI shows download size and quality guidance. No model is downloaded silently when Generate Captions is pressed.

## Download and activation

1. Read the bundled version-lock manifest.
2. User explicitly chooses `base` or `medium` and starts the download.
3. Show progress, cancellation, retry, and remaining size.
4. Download into a `.partial` directory with resume support.
5. Verify every required file by byte size and SHA-256.
6. Atomically rename verified files to the pinned revision directory.
7. Run the mandatory model self-test.
8. Activate the model only after the self-test succeeds.

Offline packages must pass the same lock and checksum validation.

## Storage

Runtime, models, jobs, and logs are outside the replaceable CEP directory:

```text
%LOCALAPPDATA%\SaadStudio\
  runtime\faster-whisper\<locked-runtime-version>\
  models\faster-whisper\base\<pinned-revision>\
  models\faster-whisper\medium\<pinned-revision>\
  cache\captions\<job-id>\
  logs\auto-captions\
```

The CEP package contains only UI/host code, the lock manifest, launcher contract, self-test fixture, and Premiere audio preset. CEP `file:///` paths must be normalized to native Windows paths before filesystem or process calls.

The current prototype's `CAPTIONS_RUNTIME_MISSING` result confirms that storing/discovering runtime files beside the CEP panel is rejected as a production design.

## Runtime and model version lock

Each supported release ships an immutable JSON lock manifest containing:

```json
{
  "schemaVersion": 1,
  "runtime": {
    "fasterWhisper": "1.2.1",
    "ctranslate2": "4.8.0",
    "python": "3.12.x",
    "platform": "win-x64"
  },
  "models": {
    "base": { "repository": "Systran/faster-whisper-base", "revision": "<commit>", "files": [] },
    "medium": { "repository": "Systran/faster-whisper-medium", "revision": "<commit>", "files": [] }
  },
  "ffmpeg": { "version": "6.1.1", "sha256": "<sha256>" },
  "audioPreset": { "sha256": "<sha256>" },
  "selfTestFixture": { "sha256": "<sha256>", "expectedTokens": [] }
}
```

Every locked file records relative path, size, and SHA-256. Installed metadata records the manifest SHA-256, installation time, selected model, actual device, and self-test result. Runtime/model versions cannot float independently; unsupported pairs are blocked until a new manifest is shipped.

## Mandatory model self-test

Every installed or updated runtime/model pair remains quarantined until it passes:

1. Validate executable, dependency versions, model files, sizes, and hashes.
2. Load the selected model on CUDA `float16`; if CUDA is unavailable, test the declared CPU `int8` fallback.
3. Transcribe a bundled, checksum-locked short Arabic speech fixture.
4. Require exit code zero, Arabic language, at least one timed segment, monotonic timestamps within fixture duration, and the expected normalized Arabic token set.
5. Write local self-test metadata containing manifest digest, device, duration, timestamp, and result.
6. Activate atomically only after success. Failure keeps caption generation disabled and offers Repair/Retry.

The self-test repeats after runtime/model upgrades and whenever a required file or lock digest changes.

## WAV extraction

### Primary method: Premiere sequence render

1. Capture active sequence identity, zero point, and duration.
2. Export the edited sequence audio mix using a bundled audio-only Premiere preset.
3. Output `%LOCALAPPDATA%\SaadStudio\cache\captions\<job-id>\sequence.wav` as PCM mono, 16 kHz, 16-bit.
4. Wait for a positive export result and verify file existence, non-zero size, readable audio, and plausible duration.
5. Transcribe only after proof succeeds.

This represents the final edited sequence rather than the original A1 source file.

### Required FFmpeg fallback

If Premiere export fails:

1. Inspect the selected caption audio track and all TrackItems.
2. For one uncut, unnested, normal-speed source, use FFmpeg `-ss/-t` with proven source in/out values.
3. For multiple normal-speed clips, build a deterministic graph: `atrim` source in/out, `asetpts` reset, `adelay` to timeline position, `amix`, trim to sequence duration, and resample to mono 16 kHz PCM.
4. Verify source paths, ranges, output duration, and non-empty audio.
5. Block nested, mixed/unresolved, reverse, speed-changed, missing-source, or ambiguous-offset timelines with `CAPTIONS_FFMPEG_TIMELINE_UNSUPPORTED`. Never transcribe the unedited source as an approximation.

Job metadata records one of:

- `premiere-sequence-render`
- `ffmpeg-single-source`
- `ffmpeg-timeline-rebuild`

## Transcription

- Model: user-selected locked `base` or `medium`; recommend `medium` for Arabic.
- Language: user-selected `auto`, `ar`, or `en`; `medium` remains recommended for Arabic quality.
- Device: CUDA `float16`, with tested CPU `int8` fallback.
- VAD: enabled.
- Word timestamps: enabled.
- Output: normalized UTF-8 JSON, then UTF-8 SRT.
- JavaScript must not reverse or reshape Arabic; Premiere owns RTL rendering.

Caption chunk duration, character count, punctuation, line count, and minimum screen time require Arabic fixtures before styling is declared ready.

## SRT import

1. Generate timecodes relative to the rendered sequence starting at `00:00:00,000`.
2. Save UTF-8 SRT in the job cache.
3. Import it into `Saad Studio/Podcast Captions` in the project.
4. Record caption-track count before insertion.
5. Call `activeSequence.createCaptionTrack(projectItem, 0, Sequence.CAPTION_FORMAT_SUBTITLE)`.
6. Verify return value and/or caption-track count increase.
7. Report `Applied` only after verification. On failure, retain SRT in the bin and report `Generated, not inserted`.

No clip selection and no random insertion fallback are allowed. A Premiere 26.2 fixture must prove correct behavior with a non-zero sequence zero point.

## Failure contract

Stop without timeline mutation for runtime/self-test failure, missing or corrupt model, lock mismatch, WAV export/rebuild failure, empty transcription, invalid SRT timing, or unverified caption-track insertion. Production UI shows stable readable errors and actions, not raw filesystem-path dumps.

## Acceptance criteria

1. First-run install, lock verification, activation, and restart persistence for `base` and `medium`.
2. Mandatory Arabic fixture self-test on CUDA and CPU fallback.
3. Four-minute edited podcast sequence render and transcription.
4. Verified FFmpeg single-source and multi-clip fallback fixtures.
5. Explicit unsupported-timeline blocker fixture.
6. Iraqi Arabic quality, RTL, punctuation, timing, and editability checks.
7. Non-zero sequence zero-point alignment.
8. Missing/corrupt/tampered model recovery.
9. Runtime/model version mismatch rejection.
10. Re-run behavior without duplicate or randomly offset tracks.

## Mandatory long-duration fixtures

Long-form operation is a release gate, not an optional benchmark. The locked test suite includes:

| Fixture | Content profile | Required proof |
|---|---|---|
| 30 minutes | Continuous Arabic interview with normal pauses | Complete WAV export, transcription, SRT validation, and verified Premiere insertion. |
| 60 minutes | Multi-speaker Arabic podcast with timeline cuts and silence gaps | Correct final-sequence timing across edits, monotonic captions, and successful FFmpeg fallback fixture. |
| 120 minutes | Long-form Arabic stress fixture with dense and sparse speech regions | Completion without crash or out-of-memory failure, bounded resources, valid final timestamps, and recovery from an injected interruption. |

Each duration must run with both supported first-run models, `base` and `medium`, on the locked Windows x64 runtime. CUDA is required for the full matrix; the CPU fallback must complete at least the 30-minute fixture and a resumability test for a longer fixture.

For every run, retain structured test metadata containing:

- fixture audio and expected-timeline manifest SHA-256;
- runtime/model lock digest and actual device;
- WAV export method and duration;
- transcription wall time and real-time factor;
- peak process memory and peak GPU memory when applicable;
- segment count, first/last timestamp, and SRT duration;
- invalid, reversed, overlapping, or out-of-range timestamp counts;
- caption-track count before/after insertion;
- final result and stable failure code.

Pass conditions:

1. No caption begins before zero or ends after the verified rendered-audio duration beyond one video-frame tolerance.
2. Caption timestamps remain monotonic; overlap is permitted only when explicitly allowed by the caption segmentation policy.
3. The first and final expected speech anchors remain aligned within the fixture's locked tolerance.
4. Memory use stays within the resource budget stored in the fixture manifest and does not show unbounded growth across time windows.
5. Cancelling or injecting a failure leaves no activated partial model, corrupt SRT, or partially inserted caption track.
6. Retry/resume produces the same normalized transcript and timing digest as an uninterrupted run, subject only to fields explicitly marked nondeterministic.
7. Temporary WAV/JSON artifacts follow the documented cleanup/diagnostic-retention policy.

## Consequences

- First-run downloads range from the smaller `base` package to approximately 1.5 GB for `medium`, plus runtime.
- Model Manager, version-lock validation, a mandatory self-test, and two audio export paths are required.
- Reap Captions and Podcast Auto Captions remain separate products and code paths.
- The design is update-safe and fails closed instead of claiming success with missing or ambiguous assets.

## Implementation gate

ADR-001 is approved with all four required changes incorporated: first-run `base`, defined FFmpeg fallback, mandatory post-install self-test, and runtime/model version-lock metadata. Implementation may proceed only against this approved revision. Architectural deviations require an ADR update first.
