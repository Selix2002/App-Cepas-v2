// src/features/cepas/pages/HomePage.tsx
import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "../../auth/store/AuthContext"
import { useCepasTableCore } from "../hooks/table/useCepasTableCore"
import { useCepasCharts }     from "../hooks/charts/useCepasCharts"
import { useCepasMap }        from "../hooks/map/useCepasMap"

import HomeHeader             from "../components/home/components/header/HomeHeader"
import ImportCepasModal       from "../components/home/components/header/ImportCepasModal"
import ChartSection           from "../components/home/components/chart/ChartSection"
import ChartDownloadModal     from "../components/home/components/chart/ChartDownloadModal"
import CoordFilterChips       from "../components/home/components/map/CoordFilterChips"
import MapBottomSheetSection  from "../components/home/components/map/MapBottomSheetSection"
import CepasTableSection      from "../components/home/components/table/CepasTableSection"

export function HomePage() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const chartRef = useRef<HTMLDivElement | null>(null)

  const [showImport,   setShowImport]   = useState(false)
  const [showDownload, setShowDownload] = useState(false)

  // ── tabla central (reemplaza useCepasGrid + useCepasTableData + useCepasCellEditing) ──
  const table = useCepasTableCore({ user: user ?? null })

  // ── gráficos — recibe filteredData ya filtrado ────────────────────────────
  const charts = useCepasCharts({ filteredData: table.filteredData })

  // ── mapa — recibe filteredData + control del coordFilter ──────────────────
  const map = useCepasMap({
    filteredData: table.filteredData,
    coordFilter:  table.coordFilter,
    setCoordFilter: table.setCoordFilter,
  })

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  if (table.loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#070c16",
          color: "#00e5b4",
          fontFamily: "monospace",
          letterSpacing: 2,
          fontSize: 13,
        }}
      >
        Cargando cepas…
      </div>
    )

  if (table.error)
    return (
      <div style={{ padding: 32, color: "#ff4d6d", fontFamily: "monospace" }}>
        Error al cargar datos: {table.error.message}
      </div>
    )

  return (
    <>
      {/* ── layout principal ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "#070c16",
          overflow: "hidden",
        }}
      >
        {/* topbar */}
        <HomeHeader
          isAdmin={!!user?.is_admin}
          columns={table.columnDefs}          // ahora CepaColumnDef[]
          hiddenFields={table.hiddenFields}
          onLogout={handleLogout}
          onOpenImport={() => setShowImport(true)}
          onExport={table.handleExport}
          onToggleColumnVisibility={table.toggleColumnVisibility}
        />

        {/* import modal */}
        <ImportCepasModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          existingNames={table.rawData.map((r) => String(r?.cepa ?? "").trim())}
          onImported={() => table.setRefreshToken((v) => v + 1)}
        />

        {/* chart panel */}
        <ChartSection
          chartRef={chartRef}
          chartType={charts.chartType}
          setChartType={charts.setChartType}
          selectedColumn={charts.selectedColumn}
          selectedColumns={charts.selectedColumns}
          pieChartData={charts.pieChartData}
          barDataset={charts.barDataset}
          canDownload={!!user?.is_admin}
          onOpenDownload={() => setShowDownload(true)}
        />

        {/* chart download modal */}
        <ChartDownloadModal
          isOpen={showDownload}
          onClose={() => setShowDownload(false)}
          chartRef={chartRef}
          selectedColumnName={charts.selectedColumn?.name}
        />

        {/* coord filter chips (aparece cuando el mapa filtra por lat/lng) */}
        <CoordFilterChips
          coordFilter={map.coordFilter}
          onClear={map.clearCoordFilters}
        />

        {/* tabla principal con sidebar bioluminiscente */}
        <CepasTableSection
          // columns
          columnDefs={table.columnDefs}
          visibleColumnDefs={table.visibleColumnDefs}
          hiddenFields={table.hiddenFields}
          toggleColumnVisibility={table.toggleColumnVisibility}

          // data
          displayData={table.displayData}
          filteredData={table.filteredData}
          rawData={table.rawData}

          // search & filter
          globalSearch={table.globalSearch}
          setGlobalSearch={table.setGlobalSearch}
          columnFilters={table.columnFilters}
          setColumnFilter={table.setColumnFilter}
          clearColumnFilter={table.clearColumnFilter}
          clearAllFilters={table.clearAllFilters}
          activeFilterCount={table.activeFilterCount}

          // sort
          sortConfig={table.sortConfig}
          handleSort={table.handleSort}

          // pagination
          page={table.page}
          pageSize={table.pageSize}
          totalPages={table.totalPages}
          setPage={table.setPage}
          setPageSize={table.setPageSize}

          // editing
          editingCell={table.editingCell}
          startEdit={table.startEdit}
          handleEditChange={table.handleEditChange}
          commitEdit={table.commitEdit}
          cancelEdit={table.cancelEdit}
          isAdmin={!!user?.is_admin}
          notification={table.notification}

          // charts (sidebar)
          selectedColumns={charts.selectedColumns}
          onColumnToggle={charts.handleColumnToggle}
          chartType={charts.chartType}
        />
      </div>

      {/* mapa bottom sheet */}
      <MapBottomSheetSection
        open={map.mapOpen}
        onOpenChange={map.setMapOpen}
        markersCount={map.markersCount}
        data={map.validRowsForMap}
        onPointDblClick={map.handleMapPointDblClick}
      />
    </>
  )
}

export default HomePage
