import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { createWorker } from "tesseract.js"

interface Props {
  onResult: (plate: string) => void
}

// Kenyan plates: 2-3 letters, 3 digits, 1 letter (e.g. KDA 452B). Anchoring to
// this pattern stops a noisy real-world photo (background text, labels, etc.)
// from dumping a huge garbled OCR string into the plate field.
const PLATE_PATTERN = /\b[A-Z]{2,3}\s?\d{3}\s?[A-Z]\b/

export default function PlateScanner({ onResult }: Props) {
  const [scanning, setScanning] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setNotFound(false)
    try {
      const worker = await createWorker("eng")
      await worker.setParameters({
        // restrict to characters found on plates
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

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
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImage}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
    </div>
  )
}
