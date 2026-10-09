/**
 * Coordinador global de prioridad de sonidos.
 *
 * El sonido de cobro del POS no debe interferir con los sonidos de alerta
 * de stock (críticas ni ámbar). Este módulo es la fuente única de verdad
 * para que los reproductores se consulten y se callen entre sí, sin
 * importarse los unos de los otros.
 */

type InicioAlertaListener = () => void;

let alertasEnCurso = 0;
const alIniciarAlerta = new Set<InicioAlertaListener>();

/** true mientras haya al menos una alerta de stock sonando. */
export function hayAlertaStockActiva(): boolean {
  return alertasEnCurso > 0;
}

/**
 * Se ejecuta cuando empieza a sonar una alerta de stock.
 * Retorna la función de desuscripción.
 */
export function alIniciarAlertaStock(listener: InicioAlertaListener): () => void {
  alIniciarAlerta.add(listener);
  return () => {
    alIniciarAlerta.delete(listener);
  };
}

/** Debe llamarlo quien reproduce un sonido de alerta, al empezar. */
export function marcarAlertaStockIniciada(): void {
  alertasEnCurso += 1;
  if (alertasEnCurso === 1) {
    for (const listener of alIniciarAlerta) listener();
  }
}

/** Debe llamarlo al terminar (ended/error) o al interrumpirse. Balancea el contador. */
export function marcarAlertaStockFinalizada(): void {
  if (alertasEnCurso === 0) return;
  alertasEnCurso -= 1;
}
