import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

/**
 * Distancia desde el borde, en px, dentro de la cual el cursor "empuja" el
 * scroll. Es aproximadamente el ancho de un dedo sobre un trackpad: lo que
 * hace falta para acertar la banda sin tener que apuntar.
 */
const MARGEN_EDGE = 40;

/** Píxeles por frame. A 60fps son 600px/s: rápido para leer, lento para marear. */
const VELOCIDAD = 10;

/**
 * Auto-scroll horizontal por proximidad del cursor a los bordes.
 *
 * Existe para cuando la barra de scroll está oculta: sin ella no hay ningún
 * indicio de que la tira se pueda mover, y en desktop —donde no hay gesto de
 * arrastre ni scroll con el dedo— el cursor pegado al borde es el único lenguaje
 * que queda para dizer "esto se mueve".
 *
 * El scroll lo hace un loop de `requestAnimationFrame`, no el `mousemove`: el
 * evento solo decide la DIRECCIÓN. Mover el contenido desde el evento lo haría a
 * saltos y dependiente de la frecuencia con la que el mouse emite; con el loop
 * la velocidad es constante y el movimiento sale parejo.
 *
 * Se engancha a `mousemove` y no a `pointermove` a propósito. Es lo que deja el
 * gesto de arrastre con el dedo fuera del asunto sin ninguna guarda: en
 * pantalla táctil el dedo mueve la tira con su propio scroll, y los dos motions
 * escribiendo `scrollLeft` en el mismo frame se pelean. Un arrastre táctil no
 * emite `mousemove`, así que acá nunca se dispara.
 */
export function useAutoScrollHover<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [direccion, setDireccion] = useState<-1 | 0 | 1>(0);

  useEffect(() => {
    if (direccion === 0) return;

    let frame = 0;

    const paso = () => {
      const el = ref.current;

      // Se corta solo si dejó de haber algo que scrollear, o si ya se llegó al
      // tope: `scrollLeft` se satura y el loop seguiría girando en el vacío,
      // gastando un frame por vez mientras el cursor sigue en el borde.
      if (!el || el.scrollWidth - el.clientWidth <= 1) {
        setDireccion(0);
        return;
      }

      el.scrollLeft += direccion * VELOCIDAD;
      frame = requestAnimationFrame(paso);
    };

    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [direccion]);

  const alMover = useCallback((event: ReactMouseEvent<T>) => {
    const el = event.currentTarget;
    if (el.scrollWidth - el.clientWidth <= 1) return;

    const { left, right } = el.getBoundingClientRect();
    const x = event.clientX;

    if (x - left < MARGEN_EDGE) setDireccion(-1);
    else if (right - x < MARGEN_EDGE) setDireccion(1);
    else setDireccion(0);
  }, []);

  const alSalir = useCallback(() => setDireccion(0), []);

  return { ref, alMover, alSalir };
}
