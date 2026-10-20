import type { Metadata } from 'next';
import Link from 'next/link';
import { contactEmail } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Aviso legal · Parkflow',
  description: 'Condiciones de uso y atribución de datos de Parkflow Valencia.',
};

export default function AvisoLegalPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12 text-sm leading-relaxed text-zinc-700">
      <Link href="/" className="text-emerald-700 hover:text-emerald-800">
        ← Volver a Parkflow
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Aviso legal</h1>
        <p className="text-xs text-zinc-500">Última actualización: 20 de octubre de 2026.</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Titular</h2>
        <p>
          Parkflow es un proyecto abierto e independiente. Para cualquier comunicación, escribe a{' '}
          <a className="underline underline-offset-2" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Sin afiliación municipal</h2>
        <p>
          Parkflow no está afiliado ni patrocinado por el Ajuntament de València. Las señales de
          tráfico, las normas de estacionamiento y las indicaciones de los agentes prevalecen sobre
          cualquier recomendación de la aplicación.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Datos y atribución</h2>
        <p>
          Los datos de aparcamiento, tráfico y cámaras proceden del Ajuntament de València y se
          publican con licencia{' '}
          <a
            className="underline underline-offset-2"
            href="https://creativecommons.org/licenses/by/4.0/deed.es"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY 4.0
          </a>
          . La cartografía es de OpenStreetMap, con sus propios términos de uso.
        </p>
        <p>
          Las cámaras se muestran únicamente por su ubicación y un enlace al visor oficial. No se
          reproducen, graban, difunden ni ceden sus imágenes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Sin garantías</h2>
        <p>
          Las disponibilidades son estimaciones y pueden estar desactualizadas. Parkflow no reserva
          ni garantiza plazas de aparcamiento y no se responsabiliza de las decisiones de
          estacionamiento ni de las sanciones que pudieran derivarse.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Reportes de la comunidad</h2>
        <p>
          Al enviar un reporte confirmas que la información es veraz según tu observación. No se
          permite el uso abusivo, automatizado o fraudulento del servicio.
        </p>
      </section>
    </main>
  );
}
