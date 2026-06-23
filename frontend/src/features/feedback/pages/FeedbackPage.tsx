// src/features/feedback/pages/FeedbackPage.tsx
import { useState, useCallback, useEffect } from "react"
import FeedbackHeader from "../components/FeedbackHeader"
import FeedbackStatsPanel from "../components/FeedbackStatsPanel"
import FeedbackRatingChart from "../components/FeedbackRatingChart"
import FeedbackTable from "../components/FeedbackTable"
import FeedbackDetailModal from "../components/FeedbackDetailModal"
import {
    getFeedbackStats,
    getFeedbackList,
    type FeedbackStats,
    type FeedbackListItem,
    type FeedbackListResponse,
} from "../services/feedbackQuery"
import "./feedback-page.css"

export default function FeedbackPage() {

    const [stats,        setStats]        = useState<FeedbackStats | null>(null)
    const [listData,     setListData]     = useState<FeedbackListResponse | null>(null)
    const [selectedItem, setSelectedItem] = useState<FeedbackListItem | null>(null)
    const [isLoading,    setIsLoading]    = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error,        setError]        = useState<string | null>(null)

    const [page,         setPage]         = useState(1)
    const [sortBy,       setSortBy]       = useState<"fecha" | "calificacion">("fecha")
    const [order,        setOrder]        = useState<"asc" | "desc">("desc")
    const [filterRating, setFilterRating] = useState<number | null>(null)

    const loadAll = useCallback(async () => {
        try {
            setError(null)
            const [statsRes, listRes] = await Promise.all([
                getFeedbackStats(),
                getFeedbackList({ page, sort_by: sortBy, order, calificacion: filterRating }),
            ])
            setStats(statsRes)
            setListData(listRes)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error al cargar los datos"
            setError(msg)
        }
    }, [page, sortBy, order, filterRating])

    useEffect(() => {
        setIsLoading(true)
        loadAll().finally(() => setIsLoading(false))
    }, [loadAll])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await loadAll()
        setIsRefreshing(false)
    }

    const handleSort = (field: "fecha" | "calificacion") => {
        if (sortBy === field) {
            setOrder((o) => (o === "asc" ? "desc" : "asc"))
        } else {
            setSortBy(field)
            setOrder("desc")
        }
        setPage(1)
    }

    const handleFilterRating = (r: number | null) => {
        setFilterRating(r)
        setPage(1)
    }

    return (
        <div className="fbp-page">
            <FeedbackHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />

            {error ? (
                <div className="fbp-error">
                    <span className="fbp-error-icon">⚠</span>
                    <span>{error}</span>
                    <button className="fbp-error-retry" onClick={handleRefresh}>Reintentar</button>
                </div>
            ) : (
                <>
                    <FeedbackStatsPanel stats={stats} isLoading={isLoading} />

                    {stats && (
                        <FeedbackRatingChart
                            distribucion={stats.distribucion}
                            total={stats.total}
                        />
                    )}

                    <FeedbackTable
                        items={listData?.items ?? []}
                        total={listData?.total ?? 0}
                        page={page}
                        pageSize={20}
                        totalPages={listData?.total_pages ?? 1}
                        onPageChange={setPage}
                        onRowClick={setSelectedItem}
                        isLoading={isLoading}
                        filterRating={filterRating}
                        onFilterRating={handleFilterRating}
                        sortBy={sortBy}
                        order={order}
                        onSort={handleSort}
                    />
                </>
            )}

            <FeedbackDetailModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
            />
        </div>
    )
}
