"use client";

export default function AudioPage() {
  return (
    <iframe
      src="/stude/sound.html?embed=1"
      className="w-full border-0"
      style={{ height: "calc(100vh - 64px)", display: "block" }}
      title="Audio Studio"
      allow="microphone; autoplay"
    />
  );
}
