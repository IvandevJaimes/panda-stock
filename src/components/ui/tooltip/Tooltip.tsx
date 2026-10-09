import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/animations/shift-away.css";
import "./Tooltip.css";
import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  disabled?: boolean;
  wrapperClassName?: string;
  block?: boolean;
  zIndex?: number;
  placement?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({
  content,
  children,
  delay = 500,
  disabled = false,
  wrapperClassName,
  block = false,
  zIndex,
  placement,
}: TooltipProps) {
  return (
    <Tippy
      content={content}
      delay={delay}
      disabled={disabled}
      animation="shift-away"
      trigger="mouseenter focus"
      hideOnClick={true}
      zIndex={zIndex}
      placement={placement}
    >
      <span
        style={{ display: block ? "flex" : "inline-flex" }}
        className={wrapperClassName}
      >
        {children}
      </span>
    </Tippy>
  );
}