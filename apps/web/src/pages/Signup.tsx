import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, Link } from "react-router-dom"
import { authClient } from "../lib/auth-client"
import { useAuth } from "../context/auth"

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Must be at least 8 characters")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter"),
})

type FormValues = z.infer<typeof schema>

export default function Signup() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const canSubmit = (() => !isSubmitting)()

  async function onSubmit(data: FormValues) {
    const { data: result, error } = await authClient.signUp({
      name: data.name,
      email: data.email,
      password: data.password,
    })
    if (error || !result) {
      setError("root", { message: error ?? "Could not create account" })
      return
    }
    setUser(result.user)
    navigate("/onboarding")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1E3A5F] tracking-tight">lava</h1>
          <p className="text-slate-500 mt-1 text-sm">Car Wash Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Create your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                {...register("name")}
                type="text"
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent transition"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent transition"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent transition"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {errors.root && <p className="text-red-500 text-xs">{errors.root.message}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[#00C2D1] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
