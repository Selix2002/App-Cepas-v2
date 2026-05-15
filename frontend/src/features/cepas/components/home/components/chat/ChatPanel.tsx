// src/features/cepas/components/home/components/chat/ChatPanel.tsx
import { useEffect, useRef, useCallback, useState } from "react"
import { Send, X, Trash2 } from "lucide-react"
import type { ChatMessage } from "../../../../hooks/chat/useChatIA"
import FeedbackWidget from "./FeedbackWidget"
import ChatFilterSuggestion from "./ChatFilterSuggestion"
import "./chat-panel.css"

// ── Renderer de markdown mínimo ──────────────────────────────────────────────

function parseInline(str: string, keyPrefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = []
    const re = /\*\*(.+?)\*\*|\*([^*\n]+?)\*|`(.+?)`/g
    let last = 0, idx = 0, m: RegExpExecArray | null
    while ((m = re.exec(str)) !== null) {
        if (m.index > last) nodes.push(str.slice(last, m.index))
        const k = `${keyPrefix}-${idx++}`
        if (m[1] !== undefined) nodes.push(<strong key={k}>{m[1]}</strong>)
        else if (m[2] !== undefined) nodes.push(<em key={k}>{m[2]}</em>)
        else if (m[3] !== undefined) nodes.push(<code key={k} className="cp-md-code">{m[3]}</code>)
        last = m.index + m[0].length
    }
    if (last < str.length) nodes.push(str.slice(last))
    return nodes
}

function MdText({ text }: { text: string }) {
    const blocks = text.split(/\n{2,}/)
    return (
        <>
            {blocks.map((block, bi) => {
                const lines = block.split("\n")
                const listLines = lines.filter(l => /^[-*]\s/.test(l))

                if (listLines.length > 0 && listLines.length === lines.length) {
                    return (
                        <ul key={bi} className="cp-md-list">
                            {lines.map((l, li) => {
                                const content = l.replace(/^[-*]\s+/, "")
                                return <li key={li}>{parseInline(content, `${bi}-${li}`)}</li>
                            })}
                        </ul>
                    )
                }

                return (
                    <p key={bi} className="cp-md-p">
                        {lines.map((line, li) => (
                            <span key={li}>
                                {parseInline(line, `${bi}-${li}`)}
                                {li < lines.length - 1 && <br />}
                            </span>
                        ))}
                    </p>
                )
            })}
        </>
    )
}

type ChatPanelProps = {
    open: boolean
    onClose: () => void
    messages: ChatMessage[]
    isLoading: boolean
    onSend: (text: string) => void
    onClear: () => void
    onApplyFilters?: (filtros: Record<string, string>) => void
}

function formatTime(date: Date) {
    return date.toLocaleTimeString("es-CH", { hour: "2-digit", minute: "2-digit" })
}

const TYPEWRITER_SPEED_MS = 18

function BubbleMessage({
    msg,
    preguntaAnterior,
    onApplyFilters,
}: {
    msg: ChatMessage
    preguntaAnterior: string
    onApplyFilters?: (filtros: Record<string, string>) => void
}) {
    const [displayed, setDisplayed] = useState(msg.isAnimating ? "" : msg.content)
    const [animDone, setAnimDone]   = useState(!msg.isAnimating)
    const isError = msg.role === "ia" && msg.content.startsWith("⚠")

    useEffect(() => {
        if (!msg.isAnimating) return
        let i = 0
        const interval = setInterval(() => {
            i++
            setDisplayed(msg.content.slice(0, i))
            if (i >= msg.content.length) {
                clearInterval(interval)
                setAnimDone(true)
            }
        }, TYPEWRITER_SPEED_MS)
        return () => clearInterval(interval)
    }, [msg.isAnimating, msg.content])

    const showFeedback = msg.role === "ia" && !isError && animDone
    const showFilters  = msg.role === "ia" && !isError && animDone && !!msg.filtrosAplicados

    const renderContent = () => {
        if (msg.role !== "ia" || isError || !animDone) return displayed
        return <MdText text={displayed} />
    }

    return (
        <div className={`cp-bubble-wrap cp-${msg.role}`}>
            <div className={`cp-bubble${isError ? " cp-error" : ""}${msg.role === "ia" && animDone && !isError ? " cp-bubble-md" : ""}`}>
                {renderContent()}
            </div>
            <div className="cp-bubble-meta">
                <span>{formatTime(msg.timestamp)}</span>
                {msg.tiempoMs != null && (
                    <span className="cp-bubble-meta-pill">{msg.tiempoMs} ms</span>
                )}
            </div>
            {showFilters && onApplyFilters && (
                <ChatFilterSuggestion
                    filtros={msg.filtrosAplicados!}
                    onApply={onApplyFilters}
                />
            )}
            {showFeedback && (
                <FeedbackWidget
                    pregunta={preguntaAnterior}
                    respuesta={msg.content}
                    mqlQuery={msg.mqlQuery}
                />
            )}
        </div>
    )
}

export default function ChatPanel({
    open,
    onClose,
    messages,
    isLoading,
    onSend,
    onClear,
    onApplyFilters,
}: ChatPanelProps) {
    const [input, setInput] = useState("")
    const anchorRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // scroll al último mensaje
    useEffect(() => {
        anchorRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    // enfocar textarea al abrir
    useEffect(() => {
        if (open) setTimeout(() => textareaRef.current?.focus(), 350)
    }, [open])

    // cerrar con Escape
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [open, onClose])

    const handleSend = useCallback(() => {
        const text = input.trim()
        if (!text || isLoading) return
        onSend(text)
        setInput("")
        textareaRef.current?.focus()
    }, [input, isLoading, onSend])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
            }
        },
        [handleSend]
    )

    // auto-resize textarea
    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
        const ta = e.target
        ta.style.height = "auto"
        ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
    }, [])

    return (
        <div id="cp-drawer" className={`cp-drawer${open ? " cp-open" : ""}`} role="dialog" aria-modal="false" aria-label="Chat IA">

            {/* ── header ──────────────────────────────────────────────── */}
            <div className="cp-header">
                <div className="cp-header-left">
                    <span className="cp-header-icon">⚡</span>
                    <span className="cp-header-title">IA · Asistente</span>
                </div>
                <div className="cp-header-right">
                    {messages.length > 0 && (
                        <button
                            className="cp-icon-btn cp-danger"
                            onClick={onClear}
                            title="Limpiar conversación"
                            aria-label="Limpiar conversación"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <button
                        className="cp-icon-btn"
                        onClick={onClose}
                        title="Cerrar panel"
                        aria-label="Cerrar panel de chat"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* ── mensajes ────────────────────────────────────────────── */}
            <div className="cp-messages">
                {messages.length === 0 && !isLoading ? (
                    <div className="cp-empty">
                        <span className="cp-empty-icon">🧫</span>
                        <span>Hazme una pregunta</span>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <BubbleMessage
                            key={msg.id}
                            msg={msg}
                            preguntaAnterior={
                                msg.role === "ia"
                                    ? (messages[idx - 1]?.content ?? "")
                                    : ""
                            }
                            onApplyFilters={onApplyFilters}
                        />
                    ))
                )}

                {isLoading && (
                    <div className="cp-typing">
                        <div className="cp-typing-bubble">
                            <span className="cp-dot" />
                            <span className="cp-dot" />
                            <span className="cp-dot" />
                        </div>
                    </div>
                )}

                <div ref={anchorRef} className="cp-anchor" />
            </div>

            {/* ── input ───────────────────────────────────────────────── */}
            <div className="cp-input-area">
                <div className="cp-input-row">
                    <textarea
                        ref={textareaRef}
                        className="cp-textarea"
                        rows={1}
                        placeholder="Escribe tu mensaje..."
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        aria-label="Mensaje"
                    />
                    <button
                        className="cp-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        title="Enviar (Enter)"
                        aria-label="Enviar mensaje"
                    >
                        <Send size={15} />
                    </button>
                </div>
            </div>
        </div>
    )
}
