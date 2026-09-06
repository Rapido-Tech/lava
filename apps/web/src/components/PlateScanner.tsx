import { useEffect, useRef, useState } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { createWorker, PSM, type Worker } from "tesseract.js"

interface Props {
  onResult: (plate: string) => void
}

// Kenyan plates: 2-3 letters, 3 digits, 1 letter (e.g. KDA 452B). Anchoring to
// this pattern stops a noisy real-world photo (background text, labels, etc.)
// from dumping a huge garbled OCR string into the plate field.
const PLATE_PATTERN = /\b[A-Z]{2,3}\s?\d{3}\s?[A-Z]\b/

// Plates are roughly 3.5x wider than tall — used to shape the on-screen guide
// so users frame just the plate, which is what the OCR actually needs.
const GUIDE_ASPECT = "3.5 / 1"

// The engine load (WASM + language data) is the slow part, not the actual
// recognition — so one worker is created lazily and reused for every scan
// across the whole session instead of being spun up and torn down each time.
let workerPromise: Promise<Worker> | null = null
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng").then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",
        // the crop is always a single line of text — skipping full-page
        // layout analysis makes recognition both faster and more accurate
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      })
      return worker
    })
  }
  return workerPromise
}

export default function PlateScanner({ onResult }: Props) {
  const [scanning, setScanning] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // kick off the (slow) engine load as soon as the scanner is on screen,
    // so it's usually ready by the time the user has framed and captured a photo
    getWorker()
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function openCamera() {
    setNotFound(false)
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      // permission denied, no camera, etc. — fall back to the native picker
      fileInputRef.current?.click()
    }
  }

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOpen])

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  function capture() {
    const video = videoRef.current
    const guide = guideRef.current
    if (!video || !guide) return

    const videoRect = video.getBoundingClientRect()
    const guideRect = guide.getBoundingClientRect()

    // video is rendered with object-fit: cover — map the guide box's on-screen
    // position into the video's native pixel space so we crop exactly what
    // the user framed, not the whole photo. With "cover", the dimension with
    // the *smaller* native/display ratio is the one shown edge-to-edge, so
    // that's the conversion factor (the other axis is what gets cropped).
    const scale = Math.min(
      video.videoWidth / videoRect.width,
      video.videoHeight / videoRect.height
    )
    const offsetX = (video.videoWidth - videoRect.width * scale) / 2
    const offsetY = (video.videoHeight - videoRect.height * scale) / 2

    const sx = offsetX + (guideRect.left - videoRect.left) * scale
    const sy = offsetY + (guideRect.top - videoRect.top) * scale
    const sw = guideRect.width * scale
    const sh = guideRect.height * scale

    const canvas = document.createElement("canvas")
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext("2d")
    closeCamera()
    if (!ctx) return
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
    runOcr(canvas)
  }

  async function runOcr(source: HTMLCanvasElement | File) {
    setScanning(true)
    setNotFound(false)
    try {
      const worker = await getWorker()
      const { data: { text } } = await worker.recognize(source)

      // collapse whitespace and uppercase
      const cleaned = text.replace(/[^A-Z0-9]/gi, " ").replace(/\s+/g, " ").trim().toUpperCase()
      const match = cleaned.match(PLATE_PATTERN)
      if (match) {
        onResult(match[0].replace(/\s+/g, " ").trim())
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setScanning(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await runOcr(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={openCamera}
        disabled={scanning}
        title="Scan plate with camera"
        className="flex items-center justify-center gap-2 h-full px-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition whitespace-nowrap text-sm"
      >
        {scanning ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span className="hidden sm:inline">Scanning…</span>
          </>
        ) : (
          <>
            <Camera size={16} />
            <span className="hidden sm:inline">Scan</span>
          </>
        )}
      </button>
      {notFound && (
        <p className="absolute top-full right-0 mt-1 text-xs text-amber-600 whitespace-nowrap z-10">
          Couldn't read a plate — enter manually
        </p>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div
            ref={guideRef}
            className="absolute left-1/2 top-1/2 w-[78%] max-w-sm border-2 border-white/90 rounded-lg"
            style={{ aspectRatio: GUIDE_ASPECT, transform: "translate(-50%, -50%)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
          />
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 text-white text-sm font-medium text-center w-full px-6"
             style={{ transform: "translate(-50%, calc(-50% - 100px))" }}>
            Fit the plate inside the frame
          </p>

          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-10 pb-10 pt-6 bg-linear-to-t from-black/60 to-transparent">
            <button
              type="button"
              onClick={closeCamera}
              aria-label="Cancel"
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition"
            >
              <X size={22} />
            </button>
            <button
              type="button"
              onClick={capture}
              aria-label="Capture"
              className="w-16 h-16 rounded-full bg-white border-4 border-white/40 hover:scale-105 transition-transform"
            />
          </div>
        </div>
      )}
    </div>
  )
}
