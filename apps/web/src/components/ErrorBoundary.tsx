import { Component, ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-64 gap-4 text-center p-8">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">Something went wrong</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
