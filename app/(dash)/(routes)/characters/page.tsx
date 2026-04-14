"use client";

export default function CharactersPage() {
  return (
    <iframe
      src="/characters.html"
      className="w-full border-0"
      style={{ height: "calc(100vh - 64px)" }}
      title="Characters"
    />
  );
}

