import type { Metadata } from 'next';
import Link from 'next/link';
import { contactEmail } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacidad · Parkflow',
  description: 'Cómo trata Parkflow la ubicación y los reportes de la comunidad.',
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12 text-sm leading-relaxed text-zinc-700">
      <Link href="/" className="text-emerald-700 hover:text-emerald-800">
        ← Volver a Parkflow
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Privacidad</h1>
        <p className="text-xs text-zinc-500">Última actualización: 20 de octubre de 2026.</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Sin cuentas ni publicidad</h2>
        <p>
          Parkflow no requiere registro, no usa cookies de publicidad ni elabora perfiles de
          usuarios. No vendemos ni cedemos datos personales.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Ubicación</h2>
        <p>
          La ubicación solo se solicita cuando pulsas «Aparcar cerca de mí». Se usa para calcular
          las recomendaciones y no se guarda en la base de datos. No hay seguimiento en segundo
          plano ni geofencing. Si deniegas el permiso, puedes tocar el mapa o buscar una calle.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Reportes de la comunidad</h2>
        <p>
          Los reportes son anónimos. Guardamos el tipo de reporte, una coordenada redondeada a unas
          decenas de metros, la hora y un hash con sal del identificador de tu navegador. El hash no
          permite identificarte y se usa solo para limitar el abuso. Los reportes caducan a los 15
          minutos y se borran automáticamente.
        </p>
        <p>
          La dirección IP se usa de forma transitoria para limitar la frecuencia de envío y no se
          almacena.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Mapas y datos municipales</h2>
        <p>
          El mapa usa MapLibre con MapTiler y datos de OpenStreetMap, que reciben la petición de tu
          navegador con la información técnica habitual. Los datos de aparcamiento proceden del
          Ajuntament de València y se publican con licencia CC BY 4.0. Las cámaras de tráfico solo
          se muestran como ubicación con un enlace al visor oficial: Parkflow no descarga ni publica
          sus imágenes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Conservación</h2>
        <p>
          Los reportes se eliminan a los 15 minutos. Los registros técnicos de ingesta se conservan
          como máximo 30 días. No hay otros datos personales que conservar.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Contacto</h2>
        <p>
          Para cualquier consulta sobre privacidad puedes escribir a{' '}
          <a className="underline underline-offset-2" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
