import argparse
import json
import os
import sys

from faster_whisper import WhisperModel


def srt_time(seconds: float) -> str:
    milliseconds = max(0, int(round(seconds * 1000)))
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def transcribe(args):
    language = None if args.language == "auto" else args.language
    attempts = [("cuda", "float16"), ("cpu", "int8")]
    last_error = None
    cuda_error = None
    for device, compute_type in attempts:
        try:
            model = WhisperModel(
                args.model,
                device=device,
                compute_type=compute_type,
                local_files_only=True,
            )
            segments, info = model.transcribe(
                args.audio,
                language=language,
                vad_filter=True,
                word_timestamps=True,
                beam_size=5,
            )
            materialized = list(segments)
            return materialized, info, device, compute_type, cuda_error
        except Exception as error:
            last_error = error
            if device == "cuda":
                cuda_error = str(error)
    raise RuntimeError(f"TRANSCRIPTION_FAILED:{last_error}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--language", choices=["auto", "ar", "en"], required=True)
    parser.add_argument("--output-srt", required=True)
    parser.add_argument("--output-json", required=True)
    args = parser.parse_args()

    segments, info, device, compute_type, cuda_error = transcribe(args)
    captions = []
    for segment in segments:
        text = (segment.text or "").strip()
        if not text or segment.end <= segment.start:
            continue
        captions.append({"start": float(segment.start), "end": float(segment.end), "text": text})

    os.makedirs(os.path.dirname(args.output_srt), exist_ok=True)
    with open(args.output_srt, "w", encoding="utf-8-sig", newline="\n") as handle:
        for index, caption in enumerate(captions, 1):
            handle.write(f"{index}\n{srt_time(caption['start'])} --> {srt_time(caption['end'])}\n{caption['text']}\n\n")

    result = {
        "ok": True,
        "language": getattr(info, "language", None),
        "languageProbability": getattr(info, "language_probability", None),
        "durationSec": getattr(info, "duration", None),
        "captionCount": len(captions),
        "device": device,
        "computeType": compute_type,
        "cudaError": cuda_error,
        "srtPath": args.output_srt,
    }
    with open(args.output_json, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
    sys.stdout.write(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
