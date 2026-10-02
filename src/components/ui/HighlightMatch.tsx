import { Fragment } from "react";
import { cn } from "../../lib/cn";

interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
  compact?: boolean;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type Segmento = { ini: number; fin: number; esMatch: boolean };

/**
 * Para cada offset del texto NORMALIZADO, el índice del carácter original al que
 * pertenece. Permite recortar en el string ORIGINAL un match hallado en el
 * normalizado, que puede tener otro largo ("Café" -> "cafe", 4 vs 4, pero
 * "ñ"/"Ñ" o caracteres que decomponen a varios lo rompen).
 */
function construirIndice(original: string): number[] {
  const indice: number[] = [];
  for (let i = 0; i < original.length; i++) {
    indice.push(normalizar(original.slice(0, i + 1)).length);
  }
  return indice;
}

/** Parte el texto original en trozos alternados normal/match, según el término. */
function segmentar(
  original: string,
  indice: number[],
  normalizado: string,
  termino: string,
): Segmento[] {
  const segmentos: Segmento[] = [];
  let cursor = 0;
  let desde = 0;

  while (desde < normalizado.length) {
    const encontrado = normalizado.indexOf(termino, desde);
    if (encontrado === -1) break;

    const inicioOriginal =
      encontrado === 0 ? 0 : (indice[encontrado - 1] ?? original.length);
    const finOriginal =
      indice[encontrado + termino.length - 1] ?? original.length;

    // Un rango de ancho cero (ej. carácter combinante suelto) no se puede
    // resaltar: se avanza sin cortar para no perder texto.
    if (finOriginal <= inicioOriginal) {
      desde = encontrado + 1;
      continue;
    }

    if (inicioOriginal > cursor) {
      segmentos.push({ ini: cursor, fin: inicioOriginal, esMatch: false });
    }
    segmentos.push({ ini: inicioOriginal, fin: finOriginal, esMatch: true });
    cursor = finOriginal;
    desde = encontrado + termino.length;
  }

  if (cursor < original.length) {
    segmentos.push({ ini: cursor, fin: original.length, esMatch: false });
  }
  return segmentos;
}

export function HighlightMatch({
  text,
  query,
  className,
  compact = false,
}: HighlightMatchProps) {
  const termino = normalizar(query.trim());
  if (!termino || termino.length < 2 || !text) return <>{text}</>;

  const normalizado = normalizar(text);
  if (!normalizado.includes(termino)) return <>{text}</>;

  const segmentos = segmentar(
    text,
    construirIndice(text),
    normalizado,
    termino,
  );

  return (
    <>
      {segmentos.map((segmento, index) => {
        const parte = text.slice(segmento.ini, segmento.fin);
        if (!segmento.esMatch) return <Fragment key={index}>{parte}</Fragment>;
        return (
          <mark
            key={index}
            className={cn(
              "rounded-xs bg-emerald-500/15 px-0.5 font-semibold text-emerald-600 dark:text-emerald-400",
              compact &&
                "px-0 font-normal text-emerald-700 dark:text-emerald-400",
              className,
            )}
          >
            {parte}
          </mark>
        );
      })}
    </>
  );
}
