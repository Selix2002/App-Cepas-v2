// src/features/cepas/components/home/ChartDownloadModal.tsx
import type { RefObject } from "react";
import html2canvas from "html2canvas-pro";
import DownloadModal from "../../../../../../shared/components/DownloadModal";

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
            }}
        />
    );
}
