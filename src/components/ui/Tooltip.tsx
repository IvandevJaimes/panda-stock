import type { ReactElement, ReactNode } from "react";
import Tippy, { type TippyProps } from "@tippyjs/react";
import "tippy.js/animations/scale.css";

type TooltipPlacement = TippyProps["placement"];
type TooltipDelay = TippyProps["delay"];

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  placement?: TooltipPlacement;
  delay?: TooltipDelay;
  duration?: number | [number, number];
  disabled?: boolean;
  maxWidth?: number;
}

const innerShape =
  "inline-block rounded-lg border px-3 py-1.5 text-xs leading-snug shadow-md " +
  "bg-white text-slate-800 border-slate-200 " +
  "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 dark:shadow-black/50";

export function Tooltip({
  content,
  children,
  placement = "top",
  delay = [500, 50],
  duration = [180, 150],
  disabled = false,
  maxWidth = 220,
}: TooltipProps) {
  return (
    <Tippy
      content={<span className={innerShape}>{content}</span>}
      placement={placement}
      delay={delay}
      duration={duration}
      maxWidth={maxWidth}
      disabled={disabled}
      animation="scale"
      arrow={false}
      hideOnClick={false}
      touch={["hold", 400]}
    >
      {children}
    </Tippy>
  );
}
