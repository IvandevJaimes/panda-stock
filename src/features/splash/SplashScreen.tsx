export function SplashScreen() {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0b0f17] text-slate-100">
      <section
        aria-label="Cargando Panda Stock"
        className="flex flex-col items-center text-center"
      >
        <img
          src="./panda-stock-logo-512x512.png"
          alt="Panda Stock"
          className="mb-5 h-24 w-24 object-contain"
          draggable={false}
        />

        <h1 className="font-display text-xl font-semibold tracking-tight text-white">
          Panda Stock
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-300">Cargando…</p>

        <div
          className="mt-5 flex h-5 items-center justify-center"
          role="status"
          aria-live="polite"
          aria-label="Cargando"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
        </div>
      </section>
    </main>
  );
}
