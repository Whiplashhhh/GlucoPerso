"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/dishes";

export type GalleryPhoto = { id: string; label: string };

/** Swipeable strip of every photo of the dish; a tap opens it full size. */
export function PhotoGallery({ name, photos }: { name: string; photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const strip = useRef<HTMLUListElement>(null);

  function onScroll() {
    const element = strip.current;
    if (!element) return;
    setCurrent(Math.round(element.scrollLeft / element.clientWidth));
  }

  return (
    <>
      <ul
        ref={strip}
        onScroll={onScroll}
        aria-label={`Photos : ${name}`}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain rounded-b-[32px] shadow-soft [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, index) => (
          <li key={photo.id} className="w-full shrink-0 snap-center">
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`Voir la photo en grand (${photo.label})`}
              className="block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- authenticated photo route */}
              <img
                src={photoUrl(photo.id, "full")}
                alt={`Photo : ${name}, ${photo.label}`}
                loading={index === 0 ? "eager" : "lazy"}
                className="aspect-[4/3] w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      {photos.length > 1 && (
        <span
          aria-hidden="true"
          className="absolute right-4 bottom-4 rounded-full bg-black/55 px-3 py-1 text-sm font-extrabold text-white tabular backdrop-blur"
        >
          {current + 1} / {photos.length}
        </span>
      )}
      <Lightbox name={name} photos={photos} start={open} onClose={() => setOpen(null)} />
    </>
  );
}

function Lightbox({
  name,
  photos,
  start,
  onClose,
}: {
  name: string;
  photos: GalleryPhoto[];
  start: number | null;
  onClose: () => void;
}) {
  const strip = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (start === null) return;
    const element = strip.current;
    if (element) element.scrollLeft = start * element.clientWidth;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, onClose]);

  return (
    <AnimatePresence>
      {start !== null && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Photos : ${name}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-[#120e1c]/95 pt-safe pb-safe"
        >
          <div className="flex justify-end px-3 py-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la photo"
              autoFocus
              className="grid size-12 place-items-center rounded-full bg-white/15 text-white"
            >
              <X size={26} />
            </button>
          </div>
          <ul
            ref={strip}
            className="flex flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
          >
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-3 px-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- authenticated photo route */}
                <img
                  src={photoUrl(photo.id, "full")}
                  alt={`Photo : ${name}, ${photo.label}`}
                  className="max-h-[78dvh] w-full rounded-[20px] object-contain"
                />
                <p className="text-sm font-bold text-white/80">{photo.label}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
