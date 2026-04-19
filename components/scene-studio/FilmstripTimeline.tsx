"use client";

import { useEffect, useRef } from "react";
import { useStudioStore } from "@/hooks/use-studio-store";
import FilmstripThumb from "./FilmstripThumb";

export default function FilmstripTimeline() {
  const scenes = useStudioStore((s) => s.scenes);
  const addScene = useStudioStore((s) => s.addScene);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [scenes.length]);

  return (
    <div className="border-y border-gray-800 px-4 py-3 sm:px-6">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {scenes.map((_, i) => (
          <FilmstripThumb key={scenes[i]!.id} idx={i} />
        ))}

        <button
          onClick={addScene}
          className="flex-shrink-0 flex items-center justify-center w-32 h-20 rounded-md border-2 border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 transition snap-start"
        >
          <span className="text-2xl">+</span>
        </button>
      </div>
    </div>
  );
}
