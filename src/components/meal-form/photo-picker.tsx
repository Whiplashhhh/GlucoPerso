"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/button";
import { MAX_PHOTO_BYTES } from "@/lib/photos/magic";

type Props = { photoId: string | null; onChange: (photoId: string | null) => void };

/** Camera or gallery; the photo is uploaded right away and re-encoded server-side. */
export function PhotoPicker({ onChange }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Cette photo est un peu lourde (10 Mo max).");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const body = new FormData();
    body.append("photo", file);
    try {
      const response = await fetch("/api/photos", { method: "POST", body });
      const json = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !json.id) throw new Error(json.error ?? "Envoi impossible");
      onChange(json.id);
    } catch (cause) {
      setPreview(null);
      onChange(null);
      setError(cause instanceof Error ? cause.message : "Envoi impossible, on réessaie ?");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
  }

  const inputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => upload(event.target.files?.[0])}
        data-testid="photo-gallery-input"
      />
    </>
  );

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-[24px] shadow-soft">
        {inputs}
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
        <img
          src={preview}
          alt="Aperçu de la photo du repas"
          className="aspect-[4/3] w-full object-cover"
        />
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-ink/25 text-white">
            <Spinner className="size-8" />
          </div>
        )}
        <button
          type="button"
          onClick={clear}
          aria-label="Retirer la photo"
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-surface/90 text-ink shadow-soft"
        >
          <X size={22} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {inputs}
      <div className="grid grid-cols-2 gap-2 rounded-[24px] border-2 border-dashed border-line p-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex min-h-16 items-center justify-center gap-2 rounded-[18px] bg-surface font-bold text-ink shadow-soft transition active:scale-95"
        >
          <Camera size={22} className="text-coral-ink" /> Photo
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex min-h-16 items-center justify-center gap-2 rounded-[18px] bg-surface font-bold text-ink shadow-soft transition active:scale-95"
        >
          <ImagePlus size={22} className="text-coral-ink" /> Galerie
        </button>
      </div>
      {error && <p className="pl-1 text-sm font-semibold text-coral-ink">{error}</p>}
    </div>
  );
}
