import { forwardRef, useState, type InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">

const PasswordInput = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...props} ref={ref} type={visible ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
})
PasswordInput.displayName = "PasswordInput"

export default PasswordInput
