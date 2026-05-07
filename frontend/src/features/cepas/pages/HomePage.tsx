// src/features/cepas/pages/HomePage.tsx
// Layout:
//   ┌─────────────────────────────────┐
//   │          HomeHeader             │
//   ├────────┬────────────────────────┤
//   │        │  ChartSection          │
//   │Sidebar │  CoordFilterChips      │
//   │        │  CepasTable            │
//   └────────┴────────────────────────┘

import { useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "../../auth/store/AuthContext"
import { useCepasTableCore } from "../hooks/table/useCepasTableCore"
import { useCepasCharts }    from "../hooks/charts/useCepasCharts"
import { useCepasMap }       from "../hooks/map/useCepasMap"
import { useChatIA }         from "../hooks/chat/useChatIA"

import HomeHeader            from "../components/home/components/header/HomeHeader"
import ImportCepasModal      from "../components/home/components/header/ImportCepasModal"
import ChartSection          from "../components/home/components/chart/ChartSection"
import ChartDownloadModal    from "../components/home/components/chart/ChartDownloadModal"
import CoordFilterChips      from "../components/home/components/map/CoordFilterChips"
import MapBottomSheetSection from "../components/home/components/map/MapBottomSheetSection"
import CepasSidebar          from "../components/CepasTable/CepasSideBar"
import CepasTable            from "../components/CepasTable/CepasTable"
import ChatPanel             from "../components/home/components/chat/ChatPanel"
import "./home-page.css"

export function HomePage() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const chartRef = useRef<HTMLDivElement | null>(null)

  const [showImport,   setShowImport]   = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [chatOpen,     setChatOpen]     = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(true)

  const chat = useChatIA()

  const table  = useCepasTableCore({ user: user ?? null })
  const charts = useCepasCharts({ filteredData: table.filteredData })
  const map    = useCepasMap({
    filteredData:   table.filteredData,
    coordFilter:    table.coordFilter,
    setCoordFilter: table.setCoordFilter,
  })

  const handleLogout = () => { logout(); navigate("/login") }

  const handleApplyFilters = useCallback((filtros: Record<string, string>) => {
    table.clearAllFilters()
    Object.entries(filtros).forEach(([field, val]) => table.setColumnFilter(field, val))
  }, [table.clearAllFilters, table.setColumnFilter])

  // ── loading / error ───────────────────────────────────────────────────────
  if (table.loading) return <div className="home-loading">Cargando cepas…</div>
  if (table.error)   return <div className="home-error">Error al cargar datos: {table.error.message}</div>

  return (
    <>
      <div className="home-page">
        {/* ── topbar ────────────────────────────────────────────────────── */}
        <HomeHeader
          isAdmin={!!user?.is_admin}
          columns={table.columnDefs}
          hiddenFields={table.hiddenFields}
          selectedColumnName={charts.selectedColumn?.name}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((v) => !v)}
          onLogout={handleLogout}
          onOpenImport={() => setShowImport(true)}
          onExport={table.handleExport}
          onToggleColumnVisibility={table.toggleColumnVisibility}
        />

        <ImportCepasModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          existingNames={table.rawData.map((r) => String(r?.cepa ?? "").trim())}
          onImported={() => table.setRefreshToken((v) => v + 1)}
        />

        {/* ── content area: [sidebar | main] ────────────────────────────── */}
        <div className="home-content">
          <CepasSidebar
            columnDefs={table.orderedColumnDefs}
            hiddenFields={table.hiddenFields}
            toggleColumnVisibility={table.toggleColumnVisibility}
            selectedColumns={charts.selectedColumns}
            onColumnToggle={charts.handleColumnToggle}
            reorderColumns={table.reorderColumns}
            collapsed={!sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />

          <div className="home-main">
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

            <ChartDownloadModal
              isOpen={showDownload}
              onClose={() => setShowDownload(false)}
              chartRef={chartRef}
              selectedColumnName={charts.selectedColumn?.name}
            />

            <CoordFilterChips
              coordFilter={map.coordFilter}
              onClear={map.clearCoordFilters}
            />

            <div className="home-table-wrap">
              <CepasTable
                columnDefs={table.columnDefs}
                visibleColumnDefs={table.visibleColumnDefs}
                hiddenFields={table.hiddenFields}
                toggleColumnVisibility={table.toggleColumnVisibility}

                displayData={table.displayData}
                filteredData={table.filteredData}
                rawData={table.rawData}

                globalSearch={table.globalSearch}
                setGlobalSearch={table.setGlobalSearch}
                columnFilters={table.columnFilters}
                setColumnFilter={table.setColumnFilter}
                clearColumnFilter={table.clearColumnFilter}
                clearAllFilters={table.clearAllFilters}
                activeFilterCount={table.activeFilterCount}

                sortConfig={table.sortConfig}
                handleSort={table.handleSort}

                page={table.page}
                pageSize={table.pageSize}
                totalPages={table.totalPages}
                setPage={table.setPage}
                setPageSize={table.setPageSize}

                editingCell={table.editingCell}
                startEdit={table.startEdit}
                handleEditChange={table.handleEditChange}
                commitEdit={table.commitEdit}
                cancelEdit={table.cancelEdit}
                isAdmin={!!user?.is_admin}
                notification={table.notification}

                selectedColumns={charts.selectedColumns}
                onColumnToggle={charts.handleColumnToggle}
                reorderColumns={table.reorderColumns}
              />
            </div>
          </div>
        </div>
      </div>

      <MapBottomSheetSection
        open={map.mapOpen}
        onOpenChange={map.setMapOpen}
        markersCount={map.markersCount}
        data={map.validRowsForMap}
        onPointDblClick={map.handleMapPointDblClick}
      />

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chat.messages}
        isLoading={chat.isLoading}
        onSend={chat.sendMessage}
        onClear={chat.clearMessages}
        onApplyFilters={handleApplyFilters}
      />
    </>
  )
}

export default HomePage
