import { useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import "./bottom-sheet.css";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  openHeight?: string;
  handleHeight?: number;
  closeOnOverlay?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export default function BottomSheet({
  open,
  onOpenChange,
  openHeight = "100vh",
  handleHeight = 48,
  closeOnOverlay = true,
  children,
}: BottomSheetProps) {
  const close  = useCallback(() => onOpenChange(false), [onOpenChange]);
  const toggle = useCallback(() => onOpenChange(!open), [onOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    const { style } = document.body;
    const prev = style.overflow;
    if (open) style.overflow = "hidden";
    return () => { style.overflow = prev; };
  }, [open]);

  return (
    <>
      {/* HANDLE (visible solo cuando está cerrado) */}
      {!open && (
        <div className="bs-handle-anchor">
          <button
            onClick={toggle}
            aria-expanded={open}
            aria-label="Mostrar mapa"
            className="bs-handle-btn bs-handle-btn--closed"
            style={{ height: handleHeight, width: handleHeight }}
          >
            <ChevronUp className="bs-chevron" />
          </button>
        </div>
      )}

      {/* OVERLAY */}
      <div
        aria-hidden="true"
        className={`bs-overlay ${open ? "bs-overlay--open" : "bs-overlay--closed"}`}
        onClick={() => closeOnOverlay && open && close()}
      />

      {/* SHEET */}
      <div
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Panel de mapa"
        className="bs-sheet"
        style={{
          height: openHeight,
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div className="bs-inner">
          <button
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? "Ocultar mapa" : "Mostrar mapa"}
            className="bs-handle-btn bs-handle-btn--panel"
            style={{ height: handleHeight, width: handleHeight }}
          >
            <ChevronUp className="bs-chevron" />
          </button>

          <div id="bottom-sheet-content" className="bs-content">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
