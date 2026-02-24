import { useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import clsx from "clsx";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Altura del panel cuando está abierto (ej: "90vh" | "100vh") */
  openHeight?: string;
  /** Alto del handle visible cuando está cerrado (px) — es un botón aparte, no tapa la tabla */
  handleHeight?: number;
  /** Cerrar tocando fuera */
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
  className,
  children,
}: BottomSheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const toggle = useCallback(() => onOpenChange(!open), [onOpenChange, open]);

  // ESC bloquea solo abierto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Evita scroll del body solo cuando abierto
  useEffect(() => {
    const { style } = document.body;
    const prev = style.overflow;
    if (open) style.overflow = "hidden";
    return () => {
      style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* HANDLE (visible solo cuando está cerrado). No tapa contenido */}
      {!open && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[40]">
          <button
            onClick={toggle}
            aria-expanded={open}
            aria-label="Ocultar mapa"
            className={clsx(
              "absolute top-2 left-1/2 -translate-x-1/2",
              "flex items-center justify-center",
              "rounded-full bg-gray-800 border border-gray-700 text-gray-100 shadow-lg",
              "hover:bg-gray-700 active:scale-95 transition"
            )}
            style={{ height: handleHeight, width: handleHeight }}
          >
            <ChevronUp className="transition-transform" />
          </button>
        </div>
      )}

      {/* OVERLAY siempre montado para animar opacity */}
      <div
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 z-[60] bg-black transition-opacity duration-300 ease-out",
          open ? "opacity-50" : "opacity-0 pointer-events-none"
        )}
        onClick={() => closeOnOverlay && open && close()}
      />

      {/* SHEET siempre montado para animar transform */}
      <div
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Panel de mapa"
        className={clsx(
          "fixed inset-x-0 bottom-0 z-[70] will-change-transform",
          // Animación: timing curve tipo easeOutBack leve
          "transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
          className
        )}
        style={{
          height: openHeight,
          // Abierto: 0; Cerrado: totalmente fuera de la pantalla (no tapa la tabla)
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div className="relative h-full bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl">
          {/* Handle superior para cerrar cuando está abierto */}
          <button
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? "Ocultar mapa" : "Mostrar mapa"}
            className={clsx(
              "absolute -top-10 left-1/2 -translate-x-1/2",
              "flex items-center justify-center",
              "rounded-full bg-gray-800 border border-gray-700 text-gray-100 shadow-lg",
              "hover:bg-gray-700 active:scale-95 transition"
            )}
            style={{ height: handleHeight, width: handleHeight }}
          >
            <ChevronUp className="transition-transform" />
          </button>

          {/* Contenido del panel */}
          <div
            id="bottom-sheet-content"
            className="h-full w-full overflow-hidden rounded-t-2xl"
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
