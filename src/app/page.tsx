export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Parkflow Valencia</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Encuentra aparcamiento libre cerca de ti sin dar vueltas.
        </p>
      </header>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Estamos preparando los datos abiertos del Ajuntament de València. El mapa y las
        recomendaciones llegan en la siguiente fase.
      </p>

      <footer className="mt-auto flex flex-col gap-1 text-xs text-zinc-500">
        <span>Datos: Ajuntament de València (CC BY 4.0)</span>
        <span>Mapas: OpenStreetMap</span>
        <span>Parkflow no garantiza ni reserva plazas de aparcamiento.</span>
      </footer>
    </main>
  );
}
