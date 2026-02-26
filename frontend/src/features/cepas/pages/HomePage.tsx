// src/features/cepas/pages/HomePage.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/store/AuthContext";

import HomeHeader from "../components/home/components/header/HomeHeader";
import ImportCepasModal from "../components/home/components/header/ImportCepasModal";
import ChartSection from "../components/home/components/chart/ChartSection";
import ChartDownloadModal from "../components/home/components/chart/ChartDownloadModal";
import CoordFilterChips from "../components/home/components/map/CoordFilterChips";
import MapBottomSheetSection from "../components/home/components/map/MapBottomSheetSection";
import CepasTableSection from "../components/home/components/table/CepasTableSection";

import { useCepasGrid } from "../hooks/home-grid/useCepasGrid";
import { useCepasCharts } from "../hooks/charts/useCepasCharts";
import { useCepasMap } from "../hooks/map/useCepasMap";

export function HomePage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  // --- GRID / DATOS CRUDOS ---
  const {
    gridApi,
    columns,
    rawTableData,
    filterVersion,
    refreshToken,
    setRefreshToken,
    handleGridReady,
    handleDataLoaded,
    handleToggleColumnVisibility,
    handleExport,
  } = useCepasGrid({ user: user ?? null });

  // --- GRÁFICOS (usa gridApi + rawTableData) ---
  const {
    chartType,
    setChartType,
    selectedColumns,
    selectedColumn,
    handleColumnToggle,
    barDataset,
    pieChartData,
  } = useCepasCharts({
    gridApi,
    rawTableData,
    filterVersion,
  });

  // --- MAPA (usa gridApi + rawTableData) ---
  const {
    mapOpen,
    setMapOpen,
    coordFilter,
    validRowsForMap,
    markersCount,
    handleMapPointDblClick,
    clearCoordFilters,
  } = useCepasMap({
    gridApi,
    rawTableData,
    filterVersion,
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-col h-full min-h-screen bg-gray-900 text-white">
        {/* Cabecera */}
        <HomeHeader
          isAdmin={!!user?.is_admin}
          columns={columns}
          onLogout={handleLogout}
          onOpenImport={() => setShowImport(true)}
          onExport={handleExport}
          onToggleColumnVisibility={handleToggleColumnVisibility}
        />

        {/* Modal de importación */}
        <ImportCepasModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          existingNames={rawTableData.map((r) =>
            String(r?.cepa ?? "").trim()
          )}
          onImported={() => setRefreshToken((v) => v + 1)}
        />

        {/* --- SECCIÓN DEL GRÁFICO --- */}
        <ChartSection
          chartRef={chartRef}
          chartType={chartType}
          setChartType={setChartType}
          selectedColumn={selectedColumn}
          selectedColumns={selectedColumns}
          pieChartData={pieChartData}
          barDataset={barDataset}
          canDownload={!!user?.is_admin}
          onOpenDownload={() => setShowDownload(true)}
        />

        {/* Modal de descarga del gráfico */}
        <ChartDownloadModal
          isOpen={showDownload}
          onClose={() => setShowDownload(false)}
          chartRef={chartRef}
          selectedColumnName={selectedColumn?.name}
        />

        {/* Chips de filtro por coordenadas */}
        <CoordFilterChips coordFilter={coordFilter} onClear={clearCoordFilters} />

        {/* --- SECCIÓN DE LA TABLA --- */}
        <CepasTableSection
          onGridReady={handleGridReady}
          onDataLoaded={handleDataLoaded}
          chartType={chartType}
          onColumnToggle={handleColumnToggle}
          selectedColumns={selectedColumns}
          refreshToken={refreshToken}
        />
      </div>

      {/* PANEL DESLIZABLE DEL MAPA */}
      <MapBottomSheetSection
        open={mapOpen}
        onOpenChange={setMapOpen}
        markersCount={markersCount}
        data={validRowsForMap}
        onPointDblClick={handleMapPointDblClick}
      />
    </>
  );
}

export default HomePage;
