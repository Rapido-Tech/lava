import { createContext, useCallback, useContext, useState } from "react"
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  add: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((type: ToastType, message: string) => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm max-w-sm bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
          >
            {t.type === "success" && <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
            {t.type === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
            {t.type === "info" && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="ml-1 shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}
