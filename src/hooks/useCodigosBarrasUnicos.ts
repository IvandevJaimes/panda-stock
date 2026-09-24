import { useEffect, useRef } from "react";
import {
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { productosService } from "../services/productos.service";
import {
  formatearConflictos,
  obtenerCodigosParaVerificacion,
} from "../lib/codigosBarras";

type OpcionesHook = {
  /** Producto en edición: sus propios códigos no se consideran conflicto. */
  excluirProductoId?: number | null;
  /** Debounce en ms antes de consultar al proceso principal. */
  delayMs?: number;
};

/**
 * Chequea en caliente (debounced) que los códigos de barra del formulario no
 * estén ya asociados a otro producto activo. Marca o limpia el error del campo
 * "codigosBarras" a través de los callbacks que recibe por props.
 *
 * Los callbacks se guardan en refs para que el effect no se reinicie por
 * identidad cambiante (evita resetear el debounce en cada render).
 */
export function useCodigosBarrasUnicos<TFieldValues extends FieldValues>(
  control: Control<TFieldValues>,
  setErrorCampo: (mensaje: string) => void,
  clearErrorCampo: () => void,
  opciones?: OpcionesHook,
): void {
  const { excluirProductoId = null, delayMs = 300 } = opciones ?? {};
  const valor = useWatch({
    control,
    name: "codigosBarras" as unknown as Path<TFieldValues>,
  }) as unknown as string | undefined;

  const setErrorRef = useRef(setErrorCampo);
  const clearErrorRef = useRef(clearErrorCampo);

  // Los callbacks se sincronizan en un effect (nunca en render) para que el
  // effect de verificación no dependa de su identidad y el debounce no se reinicie.
  useEffect(() => {
    setErrorRef.current = setErrorCampo;
    clearErrorRef.current = clearErrorCampo;
  });

  const ultimaSolicitud = useRef(0);

  useEffect(() => {
    const texto = (typeof valor === "string" ? valor : "").trim();
    if (!texto) {
      clearErrorRef.current();
      return;
    }

    const codigos = obtenerCodigosParaVerificacion(texto);
    if (codigos.length === 0) {
      clearErrorRef.current();
      return;
    }

    const solicitud = ++ultimaSolicitud.current;
    const timer = setTimeout(() => {
      void productosService
        .verificarCodigosEnUso(codigos, excluirProductoId)
        .then((conflictos) => {
          if (solicitud !== ultimaSolicitud.current) return;
          const mensaje = formatearConflictos(conflictos);
          if (mensaje) setErrorRef.current(mensaje);
          else clearErrorRef.current();
        })
        .catch(() => {
          if (solicitud !== ultimaSolicitud.current) return;
          clearErrorRef.current();
        });
    }, delayMs);

    return () => {
      clearTimeout(timer);
      // Invalida cualquier respuesta pendiente (re-render del effect o desmontaje).
      ultimaSolicitud.current += 1;
    };
  }, [valor, excluirProductoId, delayMs]);
}