import { Info } from "lucide-react";

export function TooltipIcon({ text }) {
  return (
    <span className="tooltip-wrap">
      <Info size={12} className="tooltip-trigger" aria-label={text} />
      <span className="tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
