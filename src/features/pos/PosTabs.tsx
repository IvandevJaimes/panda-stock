import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Tooltip } from "../../components/ui/Tooltip";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAutoScrollHover } from "../../hooks/useAutoScrollHover";
import { MAX_TICKETS, type TicketSession } from "./posQuery";

/**
 * Redondeo de las esquinas superiores de las pestañas.
 *
 * Todas usan el MISMO valor, y ese valor es el del panel de `Cart`
 * (`rounded-2xl`). No es decorativo: la primera pestaña se apoya contra el
 * borde izquierdo del panel, así que si su radio no coincidiera con el del
 * panel, la silueta del conjunto se rompería con un escalón — que es
 * justamente la pestaña "sobresaliendo" de la izquierda. Igualarlas entre sí
 * además evita que un mismo grupo muestre radios distintos según la posición.
 *
 * Va escrito literal a propósito: Tailwind escanea el fuente buscando clases
 * completas, así que un radio armado por interpolación no generaría nada. Si se
 * cambia el `rounded-2xl` del `Cart` hay que cambiar esto también, y el test
 * de `PosTabs.test.tsx` avisa si se separan.
 */
const REDONDEO_PESTANA = "rounded-t-2xl";

type PosTabsProps = {
  tickets: TicketSession[];
  activeTicketId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: (id: string) => void;
};

function unidades(ticket: TicketSession): number {
  return ticket.items.reduce((total, item) => total + item.cantidad, 0);
}

export function PosTabs({
  tickets,
  activeTicketId,
  onSelect,
  onNew,
  onClose,
}: PosTabsProps) {
  const [aConfirmar, setAConfirmar] = useState<TicketSession | null>(null);
  const { ref, alMover, alSalir } = useAutoScrollHover<HTMLDivElement>();

  const alTope = tickets.length >= MAX_TICKETS;

  /**
   * La primera pestaña es fija y no se cierra. No es una preferencia visual:
   * siempre tiene que quedar un ticket abierto donde armar la venta siguiente,
   * y cerrar el último obligaría al componente a inventarse uno nuevo con el
   * teclado en la mano, en el peor momento posible — con la gente esperando.
   */
  const cerrar = (ticket: TicketSession) => {
    // Un ticket con productos dentro es trabajo de armado: se pide confirmación
    // por la misma razón que "Vaciar" la pide. Uno vacío se cierra sin preguntar,
    // porque no hay nada que perder.
    if (unidades(ticket) > 0) {
      setAConfirmar(ticket);
      return;
    }
    onClose(ticket.id);
  };

  return (
    // Sin fondo, sin borde y sin margen abajo: las pestañas no son una barra
    // encima del ticket, son el borde superior del ticket. El `-mb-px` de cada
    // pestaña tira del `Cart` un píxel hacia arriba para tapar su borde
    // superior. Es el patrón de carpeta de archivo de `TabsModal`.
    //
    // `pr-6` y nada de `pl`: la primera pestaña va pegada al borde izquierdo con
    // su esquina redondeada igual a la del panel, así que el conjunto se lee como
    // una sola silueta. Del lado derecho sí hay que dejar aire, porque el botón
    // de sumar no lleva esquinas y no puede absorber la curva del panel.
    // Sin `gap` en este nivel: los dos únicos hijos de esta fila son el grupo de
    // pestañas y el botón de sumar, así que un `gap` acá es exactamente y solo
    // el separador entre la última pestaña y el `+`. Quitarlo los deja pegados,
    // que es como se ven en un navegador. El aire ENTRE pestañas lo aporta el
    // `gap-1.5` del grupo de adentro, que sí tiene que estar.
    <div className="flex items-end pr-6 ml-3">
      {/*
        Sin `flex-1` a propósito: el grupo se ajusta a lo que ocupan las
        pestañas, así el botón de sumar queda pegado a la última, como en un
        navegador. Con `flex-1` el botón se iba al extremo derecho del panel,
        lejos de donde está la última pestaña, que es donde el ojo va después de
        abrirla. `overflow-x-auto` sigue funcionando: si no entran, scrollean.
      */}
      <div
        ref={ref}
        role="group"
        aria-label="Tickets de venta abiertos"
        onMouseMove={alMover}
        onMouseLeave={alSalir}
        // `scrollbar-none` no es decorativo: sin él, la barra de scroll horizontal
        // le ROBA altura al grupo y, como la fila de afuera alinea todo con
        // `items-end`, las pestañas quedan flotando ~15px por encima del `Cart`
        // con un hueco vacío entre la tira y el panel. Ocultarla devuelve esa
        // altura a la tira, que vuelve a apoyarse contra el borde de arriba del
        // `Cart`. El scroll sigue funcionando (rueda, trackpad, teclado) y, con
        // la barra invisible, `alMover` es lo que hace discoverrible que la tira
        // se mueve: al pegar el cursor a un borde, corre sola para ese lado.
        className="scrollbar-none flex min-w-0 items-end gap-1.5 overflow-x-auto"
      >
        {tickets.map((ticket, indice) => {
          const activo = ticket.id === activeTicketId;
          const esPrimera = indice === 0;
          const sePuedeCerrar = !esPrimera;
          const esUltima = indice === tickets.length - 1;
          // El borde derecho de la última depende de si al lado hay un `+` o no.
          //
          // Con el `+` pegado, el borde caía justo sobre el botón y se leía como
          // una línea que lo separaba de la pestaña, cuando en realidad el `+` no
          // tiene borde propio. Al llegar al tope el `+` desaparece, y entonces la
          // última pestaña queda con el flanco derecho abierto: se lee como una
          // pestaña a la que le falta el borde, y con ella se cae toda la
          // silueta de la tira. Por eso el borde se pone solo cuando hace falta
          // para cerrar la forma.
          const cierraLaTira = esUltima && alTope;

          return (
            // El `-mb-px` va en el ENVOLTORIO, no en el botón: el wrapper es el
            // ítem flex, y si el margen estuviera adentro, el wrapper mediría un
            // píxel más que la pestaña y la costura quedaría a la vista.
            <div key={ticket.id} className="relative  shrink-0">
              <button
                type="button"
                onClick={() => onSelect(ticket.id)}
                aria-pressed={activo}
                className={cn(
                  // Borde por lados, NO el shorthand `border`. El atajo de
                  // Tailwind se lleva las cuatro esquinas y después hay que
                  // desarmarlo con `border-b-0` y `border-r-0`; peor todavía,
                  // para `tailwind-merge` esos tres son grupos distintos, así que
                  // conviven y gana el que esté último en el CSS generado, no el
                  // que va último en el string. Por eso `border-r-0` no tapaba
                  // nada. Declarando los lados que se usan, `cierraLaTira` sí
                  // agrega el derecho de verdad, sin tener que pelear con nadie.
                  "flex items-center gap-1.5 border-t border-l py-2 text-sm font-medium transition-colors duration-200 select-none",
                  cierraLaTira && "border-r",
                  REDONDEO_PESTANA,
                  // `pl-4 pr-8` en vez de `px-4` cuando hay ✕: hace falta ancho a
                  // la derecha, y `px-4` + `pr-8` no se combinan bien — `cn`
                  // resuelve el conflicto y se come el padding izquierdo.
                  sePuedeCerrar ? "pl-4 pr-8" : "px-4",

                  activo
                    ? // Mismo fondo que el `Cart` justo debajo: por eso la
                      // costura desaparece y la pestaña se lee como la parte de
                      // arriba del panel y no como un elemento pegado.
                      "relative z-10 cursor-default bg-white text-emerald-600 border-slate-200 dark:bg-[#111827] dark:text-emerald-400 dark:border-slate-800"
                    : "cursor-pointer bg-slate-100 text-slate-500 hover:text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800 dark:hover:text-slate-200",
                )}
              >
                {/*
                  La etiqueta se anima sola al activarse la pestaña. No hace
                  falta estado ni `effect` para re-dispararla: una animación CSS
                  arranca en el momento en que se agrega la clase, y como la
                  clase es exactamente `activo && ...`, se agrega al pasar a
                  activa y se quita al dejar de serlo.

                  Va en un `span` y no en el botón a propósito. El `span` lleva
                  el desplazamiento y el botón el `transition-colors` del fondo:
                  son dos capas del mismo gesto, y en el mismo elemento una
                  pisaría a la otra. Además el fondo tiene que crossfear con
                  TODAS las pestañas a la vez —cambia el color de la nueva activa
                  y de la que estaba activa— y eso lo hace la transición del
                  botón, no la animación de la etiqueta.
                */}
                <span className={cn(activo && "animate-entry-up")}>
                  Ticket {ticket.numero}
                </span>
              </button>

              {/*
                La ✕ es HERMANA del botón de la pestaña, nunca hija. Un
                `<button>` dentro de otro `<button>` es HTML inválido y rompe la
                activación por teclado en varios navegadores. Va posicionada
                dentro de la pestaña (no afuera, que se montaría sobre la vecina).
              */}
              {sePuedeCerrar && (
                <Tooltip
                  content={`Cerrar el ticket ${ticket.numero}`}
                  placement="bottom"
                >
                  <button
                    type="button"
                    onClick={() => cerrar(ticket)}
                    aria-label={`Cerrar el ticket ${ticket.numero}`}
                    className="absolute top-1/2 cursor-pointer right-2 z-20 grid h-4 w-4 -translate-y-1/2 place-items-center rounded text-slate-400 transition-colors hover:text-red-500 focus-visible:text-red-500 focus-visible:outline-none dark:text-slate-500 dark:hover:text-red-400"
                  >
                    <X size={11} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>

      {/*
        El botón de sumar va pegado a la última pestaña, no anclado al borde del
        panel.

        Es un botón de PESTAÑA completo, no un `IconButton` circular. Con el
        círculo de 26px quedaba 10px más bajo que las pestañas y pegado al piso
        por un `pb-1`, y se leía como un bodo achizado y glueado al final de la
        tira; además su hover se encendía sobre un círculo chico, así que el
        área sensible parecía arbitraria. Ahora ocupa lo mismo de alto que una
        pestaña (`h-9`, el mismo `py-2` + `text-sm`), con la misma curva y el
        mismo `-mb-px`, así que es un elemento más de la tira y su hover se
        lee como el de cualquier pestaña.

        Sin bordes y sin fondo: el `border-t border-l` de las pestañas ya cierra
        la tira, y cualquier borde acá volvía a dibujar la línea divisoria contra
        la última pestaña. El hover solo cambia el color del ícono, igual que en
        las pestañas inactivas; un fondo al hover hacía que el `+` se leyera como
        un elemento aparte y no como parte de la tira.

        En el tope NO se renderiza, en vez de quedar deshabilitado. Un botón
        apagado al 40% de opacidad es una promesa que el sistema no puede cumplir
        —no hay un sexto ticket, no hay un estado alternativo— y encima obligaba
        a mantener el `aria-label` del límite y el `title` para explicarlo. Sin
        él, la ausencia ES el mensaje: no hay ningún botón porque no hay nada
        que abrir. Y como la última pestaña es la única cerrable en ese momento
        —la primera nunca se cierra y las otras cuatro siguen abiertas—, el
        `+` tampoco era la única forma de seguir trabajando: alcanza con cerrar
        cualquiera.
      */}
      {!alTope && (
        <div className="-mb-px shrink-0">
          <Tooltip content="Abrir un ticket nuevo" placement="bottom">
            <button
              type="button"
              onClick={onNew}
              aria-label="Abrir un ticket nuevo"
              className={cn(
                "grid h-9 w-9 shrink-0 cursor-pointer place-items-center transition-colors duration-150",
                REDONDEO_PESTANA,
                "text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400",
                "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900",
              )}
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      )}

      {aConfirmar && (
        <ConfirmModal
          isOpen
          onClose={() => setAConfirmar(null)}
          onConfirm={() => {
            onClose(aConfirmar.id);
            setAConfirmar(null);
          }}
          title={`Cerrar el ticket ${aConfirmar.numero}`}
          description="Se van a quitar los productos de este ticket. No se puede deshacer."
          confirmText="Cerrar"
        />
      )}
    </div>
  );
}
