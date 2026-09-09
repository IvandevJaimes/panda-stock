import { Fragment } from "react";
import { cn } from "../../lib/cn";

interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
}

function escaparRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightMatch({
  text,
  query,
  className,
}: HighlightMatchProps) {
  const termino = query.trim();
  if (!termino || termino.length < 2 || !text) return <>{text}</>;

  const partes = text.split(new RegExp(`(${escaparRegex(termino)})`, "gi"));
  if (partes.length === 1) return <>{text}</>;

  return (
    <>
      {partes.map((parte, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className={cn(
              "rounded-xs bg-emerald-500/15 px-0.5 font-semibold text-emerald-600 dark:text-emerald-400",
              className,
            )}
          >
            {parte}
          </mark>
        ) : (
          <Fragment key={index}>{parte}</Fragment>
        ),
      )}
    </>
  );
}