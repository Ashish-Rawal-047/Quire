"use client";

import jsQR from "jsqr";
import { Camera, CameraOff, ImageUp, ScanLine } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";

type Status = "idle" | "starting" | "scanning" | "denied" | "unavailable";

function decode(source: CanvasImageSource, width: number, height: number, canvas: HTMLCanvasElement): string | null {
  const scale = Math.min(1, 900 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

/**
 * Reads a QR code from the camera, or from a photo/screenshot of one. Calls `onResult` with the
 * decoded text; the caller decides whether it's a valid shop code. Decoding runs on the device.
 */
export function QrScanner({
  onResult,
  error,
  hint = "Point your camera at the QR code on the shop’s counter.",
}: {
  onResult: (text: string) => void;
  error?: string | null;
  hint?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const [fileError, setFileError] = React.useState<string | null>(null);

  const stop = React.useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => stop, [stop]);

  async function start() {
    setFileError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");
      let last = 0;
      const tick = (t: number) => {
        frameRef.current = requestAnimationFrame(tick);
        if (t - last < 200 || video.readyState < 2 || !canvasRef.current) return;
        last = t;
        const text = decode(video, video.videoWidth, video.videoHeight, canvasRef.current);
        if (text) {
          stop();
          setStatus("idle");
          onResult(text);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      stop();
      const name = (err as { name?: string })?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
    }
  }

  async function fromFile(file: File) {
    setFileError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const text = canvasRef.current ? decode(bitmap, bitmap.width, bitmap.height, canvasRef.current) : null;
      if (text) onResult(text);
      else setFileError("No QR code found in that image. Try a sharper, closer photo.");
    } catch {
      setFileError("That file isn't an image we can read.");
    }
  }

  const live = status === "scanning" || status === "starting";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-[20rem] overflow-hidden rounded-lg border border-rule-strong bg-[#0f1b2d]">
        <video ref={videoRef} muted playsInline className={cn("h-full w-full object-cover", !live && "hidden")} />
        {!live ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
            <ScanLine className="size-10 text-[#8fb2ff]" aria-hidden />
            <p className="text-small">{hint}</p>
          </div>
        ) : null}
        {/* viewfinder corners */}
        <div aria-hidden className="pointer-events-none absolute inset-8">
          {["left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-lg", "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-lg", "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg", "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg"].map((c) => (
            <span key={c} className={cn("absolute size-8 border-[#8fb2ff]", c)} />
          ))}
          {status === "scanning" ? <span className="qr-scan-line absolute inset-x-2 h-0.5 rounded-full bg-[#8fb2ff] shadow-[0_0_12px_#8fb2ff]" /> : null}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-wrap justify-center gap-2">
        {live ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              stop();
              setStatus("idle");
            }}
          >
            <CameraOff aria-hidden />
            Stop camera
          </Button>
        ) : (
          <Button type="button" onClick={() => void start()}>
            <Camera aria-hidden />
            Scan with camera
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
          <ImageUp aria-hidden />
          Upload a photo of the QR
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void fromFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {status === "denied" ? (
        <Callout tone="warning" title="Camera access is off">
          Allow camera access for this site in your browser, or upload a photo of the QR code instead.
        </Callout>
      ) : status === "unavailable" ? (
        <Callout tone="warning" title="No camera found">
          Upload a photo or screenshot of the QR code instead.
        </Callout>
      ) : null}
      {fileError || error ? <Callout tone="danger">{fileError ?? error}</Callout> : null}
    </div>
  );
}
