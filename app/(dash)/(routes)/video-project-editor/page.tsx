"use client";

export default function VideoProjectEditorPage() {
  return (
    <iframe
      src="/pikaso-video-editor.html"
      className="w-full border-0"
      style={{ height: "calc(100vh - 64px)" }}
      title="Pikaso Video Project Editor"
    />
  );
}

