import { useEffect, useRef, useState } from "react"
import { Camera, Loader2, Upload, X } from "lucide-react"
import { createWorker, PSM, type Worker } from "tesseract.js"

interface Props {
  onResult: (plate: string) => void
}

// Kenyan plates: 2-4 letters, 3 digits, 1 letter (e.g. KDA 452B, or KMFA 123B
// for motorcycles). Matched globally rather than taking the first hit — a
// noisy photo can coincidentally contain more than one plate-shaped
// substring, and blindly accepting the first one is how a wrong plate (or
// a chunk of unrelated background text) ends up in the field. We only
// accept the result when there's exactly one candidate and it accounts for
// almost the entire cleaned OCR text.
const PLATE_PATTERN = /\b[A-Z]{2,4}\s?\d{3}\s?[A-Z]\b/g

// Most Kenyan plates are a single wide row, but motorcycles/trailers often
// use a "boxed" two-line plate instead — the guide can be shaped for either.
const GUIDE_ASPECT = { standard: "3.5 / 1", boxed: "4 / 3" } as const
type PlateShape = keyof typeof GUIDE_ASPECT

// The engine load (WASM + language data) is the slow part, not the actual
// recognition — so one worker is created lazily and reused for every scan
// across the whole session instead of being spun up and torn down each time.
let workerPromise: Promise<Worker> | null = null
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng").then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",
        // the crop is a small block of text (one row for a standard plate,
        // two for a "boxed" one) — skipping full-page layout analysis is
        // still much faster than AUTO, but SINGLE_BLOCK (unlike SINGLE_LINE)
        // also handles the two-line case correctly
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
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
  const [plateShape, setPlateShape] = useState<PlateShape>("standard")

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
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      // default is often a fixed focus distance chosen once at stream start —
      // ask for continuous autofocus so the plate is actually sharp when
      // it's captured close-up. Not all browsers expose this; best-effort.
      // `focusMode` is a real, Chrome/Android-supported capability that
      // TypeScript's DOM lib doesn't know about yet
      const track = stream.getVideoTracks()[0]
      const focusModes: string[] | undefined = (track.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[] })?.focusMode
      if (focusModes?.includes("continuous")) {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] })
        } catch {
          // unsupported on this device/browser — ignore
        }
      }
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
      const matches = [...cleaned.matchAll(PLATE_PATTERN)]
      const leftover = cleaned.replace(PLATE_PATTERN, "").trim()
      // only trust the read when there's exactly one plate-shaped candidate
      // and it accounts for essentially the whole crop — anything noisier
      // than that is how a stray digit or background text turns into a
      // wrong plate instead of a clean "couldn't read it" failure
      if (matches.length === 1 && leftover.length <= 2) {
        onResult(matches[0][0].replace(/\s+/g, " ").trim())
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
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex h-full gap-2">
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          title="Upload a photo of the plate"
          className="flex items-center justify-center h-full px-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <Upload size={16} />
        </button>
      </div>
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

          {/* stacked in normal flow (header / guide / footer) instead of
              absolute-positioned offsets, so the header and footer never
              overlap the guide box no matter how tall its aspect ratio is */}
          <div className="absolute inset-0 flex flex-col">
            <div className="flex flex-col items-center gap-3 pt-8 px-6">
              <p className="text-white text-sm font-medium text-center">
                Fit the plate inside the frame
              </p>
              <div className="flex rounded-full bg-white/10 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPlateShape("standard")}
                  className={`px-3 py-1.5 rounded-full transition ${plateShape === "standard" ? "bg-white text-slate-900" : "text-white/80"}`}
                >
                  Standard plate
                </button>
                <button
                  type="button"
                  onClick={() => setPlateShape("boxed")}
                  className={`px-3 py-1.5 rounded-full transition ${plateShape === "boxed" ? "bg-white text-slate-900" : "text-white/80"}`}
                >
                  Boxed plate
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center px-6">
              <div
                ref={guideRef}
                className="w-full max-w-sm border-2 border-white/90 rounded-lg"
                style={{ aspectRatio: GUIDE_ASPECT[plateShape], boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
              />
            </div>

            <div className="flex flex-col items-center gap-4 pb-10 pt-6 bg-linear-to-t from-black/60 to-transparent">
              <div className="flex items-center justify-center gap-10">
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
              <button
                type="button"
                onClick={() => {
                  closeCamera()
                  fileInputRef.current?.click()
                }}
                className="text-white/80 text-sm underline underline-offset-2"
              >
                Upload photo instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
