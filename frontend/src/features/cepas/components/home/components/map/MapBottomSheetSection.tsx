import BottomSheet from "../../../../../../shared/components/BottomSheet"
import MapData from "../../../../../dashboard/map/components/MapData"
import type { Cepa } from "../../../../../../shared/interfaces"

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
            <div className="h-full w-full flex flex-col">
                <div className="shrink-0 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                        Mapa de Cepas
                        <span className="ml-2 text-sm font-normal text-gray-400">
                            ({markersCount} {markersCount === 1 ? "marcador" : "marcadores"})
                        </span>
                    </h3>
                    <div className="text-xs text-gray-400">
                        {markersCount === 0 ? "Sin ubicaciones válidas" : "Arrastra / zoom • Doble click en punto para filtrar"}
                    </div>
                </div>
                <div className="grow min-h-0">
                    <MapData data={data} onPointDblClick={onPointDblClick} />
                </div>
            </div>
        </BottomSheet>
    )
}