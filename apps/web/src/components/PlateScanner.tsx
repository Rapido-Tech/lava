import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { createWorker } from "tesseract.js"

interface Props {
  onResult: (plate: string) => void
}

export default function PlateScanner({ onResult }: Props) {
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
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
      if (cleaned) onResult(cleaned)
    } catch {
      // OCR failed — user can type manually
    } finally {
      setScanning(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
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
    </>
  )
}
