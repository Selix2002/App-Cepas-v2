// src/features/cepas/components/home/ChartDownloadModal.tsx
import type { RefObject } from "react";
import html2canvas from "html2canvas-pro";
import DownloadModal from "../../../../../../shared/components/download-modal/DownloadModal";

type ChartDownloadModalProps = {
    isOpen: boolean;
    onClose: () => void;
    chartRef: RefObject<HTMLDivElement | null>;
    selectedColumnName?: string;
};

export default function ChartDownloadModal({
    isOpen,
    onClose,
    chartRef,
    selectedColumnName,
}: ChartDownloadModalProps) {
    return (
        <DownloadModal
            isOpen={isOpen}
            onClose={onClose}
            defaults={{
                fileName: `grafico-${selectedColumnName || "data"}`,
                width: Math.round(
                    chartRef.current?.getBoundingClientRect().width || 1200
                ),
                height: Math.round(
                    chartRef.current?.getBoundingClientRect().height || 675
                ),
                format: "jpeg",
                quality: 1,
                aspectRatio: "lock",
            }}
            onConfirm={async (opts: any) => {
                onClose();

                const element = chartRef.current;
                if (!element) return;

                const rect = element.getBoundingClientRect();
                const targetW = Math.max(1, Math.round(opts.width));
                const targetH = Math.max(1, Math.round(opts.height));
                const scale = targetW / rect.width;

                const baseCanvas = await html2canvas(element, {
                    scale,
                    useCORS: true,
                    logging: false,
                });

                let outCanvas = baseCanvas;
                if (baseCanvas.width !== targetW || baseCanvas.height !== targetH) {
                    const c = document.createElement("canvas");
                    c.width = targetW;
                    c.height = targetH;
                    const ctx = c.getContext("2d")!;
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(baseCanvas, 0, 0, targetW, targetH);
                    outCanvas = c;
                }

                if (opts.format === "tiff") {
                    const ctx = outCanvas.getContext("2d")!;
                    const { data, width, height } = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
                    const UTIF = await import("utif");
                    const tiffBuf = UTIF.encodeImage(new Uint8Array(data.buffer), width, height);
                    const blob = new Blob([tiffBuf], { type: "image/tiff" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${opts.fileName || "grafico"}.tiff`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                } else {
                    const mime = `image/${opts.format}`;
                    const dataURL =
                        opts.format === "png"
                            ? outCanvas.toDataURL(mime)
                            : outCanvas.toDataURL(mime, opts.quality);

                    const link = document.createElement("a");
                    link.href = dataURL;
                    link.download = `${opts.fileName || "grafico"}.${opts.format}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }}
        />
    );
}
