export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1E3A5F]">lava</h1>
        <span className="text-sm text-slate-500">Dashboard</span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Welcome back</h2>
        <p className="text-slate-500 text-sm mb-8">Here's what's happening at your locations today.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Vehicles Today", value: "—" },
            { label: "Revenue Today", value: "—" },
            { label: "Active Queue", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-3xl font-bold text-[#1E3A5F] mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
