// src/components/DownloadModal.tsx
import React, { useEffect, useState } from "react";

type ImgFormat = "png" | "jpeg" | "webp";

export interface DownloadOptions {
  width: number;
  height: number;
  format: ImgFormat;
  quality: number;            // 0..1 (solo jpeg/webp)
  fileName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (opts: DownloadOptions) => void;
  defaults?: Partial<DownloadOptions> & {
    aspectRatio?: number | "lock";
  };
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const DownloadModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, defaults }) => {
  const initWidth = Math.round(defaults?.width ?? 1200);
  const initHeight = Math.round(defaults?.height ?? 675);

  const initialAR =
    defaults?.aspectRatio === "lock"
      ? initWidth / initHeight
      : typeof defaults?.aspectRatio === "number"
      ? defaults.aspectRatio
      : undefined;

  const [fileName, setFileName] = useState(defaults?.fileName ?? "grafico");
  const [format, setFormat] = useState<ImgFormat>(defaults?.format ?? "jpeg");
  const [quality, setQuality] = useState<number>(defaults?.quality ?? 1);

  const [widthInput, setWidthInput] = useState<string>(String(initWidth));
  const [heightInput, setHeightInput] = useState<string>(String(initHeight));

  const [lockAspect, setLockAspect] = useState<boolean>(!!initialAR);
  const [lockedAR, setLockedAR] = useState<number>(
    initialAR ?? initWidth / initHeight
  );

  useEffect(() => {
    if (!isOpen) return;
    setFileName(defaults?.fileName ?? "grafico");
    setFormat(defaults?.format ?? "jpeg");
    setQuality(defaults?.quality ?? 1);
    setWidthInput(String(initWidth));
    setHeightInput(String(initHeight));
    const ar = initialAR ?? initWidth / initHeight;
    setLockedAR(ar);
    setLockAspect(!!initialAR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleWidthChange = (v: string) => {
    setWidthInput(v);
    if (!lockAspect) return;
    if (v !== "" && !isNaN(Number(v))) {
      const w = clamp(Number(v), 1, 10000);
      const h = Math.max(1, Math.round(w / lockedAR));
      setHeightInput(String(h));
    }
  };

  const handleHeightChange = (v: string) => {
    setHeightInput(v);
    if (!lockAspect) return;
    if (v !== "" && !isNaN(Number(v))) {
      const h = clamp(Number(v), 1, 10000);
      const w = Math.max(1, Math.round(h * lockedAR));
      setWidthInput(String(w));
    }
  };

  const toggleLock = (checked: boolean) => {
    setLockAspect(checked);
    if (checked) {
      const w = Number(widthInput);
      const h = Number(heightInput);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        setLockedAR(w / h);
      } else {
        setLockedAR(initialAR ?? initWidth / initHeight);
      }
    }
  };

  const isLossless = format === "png";

  const widthNum = Number(widthInput);
  const heightNum = Number(heightInput);
  const widthValid = widthInput !== "" && Number.isFinite(widthNum) && widthNum > 0;
  const heightValid = heightInput !== "" && Number.isFinite(heightNum) && heightNum > 0;
  const canConfirm = widthValid && heightValid;

  const submit = () => {
    const w = clamp(parseInt(widthInput || "0", 10), 100, 10000);
    const h = clamp(parseInt(heightInput || "0", 10), 100, 10000);

    onConfirm({
      width: w,
      height: h,
      format,
      quality: isLossless ? 1 : clamp(quality, 0.05, 1),
      fileName: fileName.trim() || "grafico",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Configuración de descarga de gráfico"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Descargar gráfico</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 hover:bg-gray-700 text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Nombre + Formato */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm text-gray-300 mb-1">Nombre de archivo</label>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              placeholder="grafico"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ImgFormat)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
            >
              <option value="png">PNG (sin pérdida)</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WEBP</option>
            </select>
          </div>
        </div>

        {/* Resolución */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 font-medium">Resolución (px)</span>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => toggleLock(e.target.checked)}
              />
              Bloquear proporción
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ancho</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="p. ej. 1200"
                value={widthInput}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Alto</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="p. ej. 675"
                value={heightInput}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Deja el campo vacío para reescribir sin que se reemplace automáticamente.
          </p>
        </div>

        {/* Calidad */}
        <div className="mt-4">
          <label className="block text-sm text-gray-300 mb-1">
            Calidad {format === "png" ? "(no aplica a PNG)" : `${Math.round(quality * 100)}%`}
          </label>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            disabled={isLossless}
            value={Math.round(quality * 100)}
            onChange={(e) => setQuality(Number(e.target.value) / 100)}
            className="w-full"
          />
        </div>

        {/* Pie */}
        <div className="mt-5 flex items-center justify-between text-sm text-gray-400">
          <span>
            Salida:{" "}
            {widthValid ? widthNum : "—"}×{heightValid ? heightNum : "—"} px · {format.toUpperCase()}
            {isLossless ? "" : ` · Calidad ${Math.round(quality * 100)}%`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded text-white border border-gray-700 hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!canConfirm}
              className={`px-3 py-2 rounded text-white font-semibold ${
                canConfirm ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              Descargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
