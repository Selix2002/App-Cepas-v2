import BottomSheet from "../../../../../../shared/components/BottomSheet"
import MapData from "../../../../../dashboard/map/components/MapData"
import type { Cepa } from "../../../../../../shared/interfaces"
import "./map-bottom-sheet-section.css"

type MapBottomSheetSectionProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    markersCount: number
    data: Cepa[]
    onPointDblClick: (lat: number, lng: number) => void
}

export default function MapBottomSheetSection({
    open,
    onOpenChange,
    markersCount,
    data,
    onPointDblClick,
}: MapBottomSheetSectionProps) {
    return (
        <BottomSheet open={open} onOpenChange={onOpenChange} openHeight="90vh" handleHeight={48} closeOnOverlay>
            <div className="mbs-inner">
                <div className="mbs-header">
                    <h3 className="mbs-title">
                        Mapa de Cepas
                        <span className="mbs-count">
                            ({markersCount} {markersCount === 1 ? "marcador" : "marcadores"})
                        </span>
                    </h3>
                    <div className="mbs-hint">
                        {markersCount === 0 ? "Sin ubicaciones válidas" : "Arrastra / zoom • Doble click en punto para filtrar"}
                    </div>
                </div>
                <div className="mbs-body">
                    <MapData data={data} onPointDblClick={onPointDblClick} />
                </div>
            </div>
        </BottomSheet>
    )
}
