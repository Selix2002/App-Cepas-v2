// src/features/cepas/hooks/useNewCepa.ts
import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { ColDef } from "ag-grid-community";

import { fetchCepasFull, createCepa } from "../../services/CepasQuery";
import { getCepasColumnDefs } from "../../components/CepasColumns";
import { loader } from "../../../../shared/utils/loader";
import {
    downloadCepaTemplate,
    parseCepaFile,
    normalizeCepaParsedData,
} from "../../utils/cepaFile";
import {
    buildCepaPayloadFromFieldMap,
    buildCepaPayloadFromHeaderMap,
} from "../../utils/cepaPayload";

export function useNewCepa() {
    const [columns, setColumns] = useState<ColDef[]>([]);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [fileData, setFileData] = useState<Record<string, string>>({});
    const [showModal, setShowModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Cargar columnas y preparar formData inicial
    useEffect(() => {
        let mounted = true;
        loader(true);

        fetchCepasFull()
            .then((data) => {
                if (!mounted) return;
                const defs = getCepasColumnDefs(data);
                setColumns(defs);

                const initial: Record<string, string> = {};
                defs
                    .filter(
                        (col): col is ColDef & { field: string } =>
                            typeof col.field === "string" && col.field !== "id"
                    )
                    .forEach((col) => {
                        initial[col.field] = "";
                    });
                setFormData(initial);
            })
            .catch((error) => console.error("Error cargando cepas:", error))
            .finally(() => {
                if (mounted) loader(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    // Cambios en inputs del formulario
    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Navegar con Enter entre inputs
    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const next = inputRefs.current[index + 1];
            next?.focus();
        }
    };

    // Descargar plantilla
    const downloadTemplate = () => {
        if (!columns.length) {
            alert("No hay columnas disponibles para generar la plantilla.");
            return;
        }
        downloadCepaTemplate(columns);
    };

    // Subir y procesar archivo .txt
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (ev) => {
            try {
                const text = ev.target?.result;
                if (typeof text !== "string") {
                    throw new Error("Archivo vacío o formato inválido");
                }

                const expectedKeys = columns
                    .filter(
                        (col): col is ColDef & { field: string } =>
                            typeof col.field === "string" && col.field !== "id"
                    )
                    .map((col) => col.headerName!)
                    .filter(Boolean);

                const parsed = parseCepaFile(text, expectedKeys);
                const normalized = normalizeCepaParsedData(parsed);

                // Igual que antes: mezclamos parsed sobre formData
                setFormData((prev) => ({ ...prev, ...normalized }));
                setFileData(normalized);
                setShowModal(true);
            } catch (err: any) {
                const msg =
                    err instanceof Error
                        ? err.message
                        : "Error al procesar el archivo";
                alert(`Error al procesar el archivo: ${msg}`);
                console.error(msg);
            } finally {
                // permitir volver a subir el mismo archivo
                e.target.value = "";
            }
        };

        reader.readAsText(file);
    };

    // Crear cepa desde el formulario (botón "Añadir Cepa")
    const addCepaFromForm = async (): Promise<void> => {
        const payload = buildCepaPayloadFromFieldMap(formData);

        loader(true);
        try {
            await createCepa(payload);
            alert("Cepa creada con éxito");
            setFormData({});
            setFileData({});
        } catch (error) {
            console.error("Error al crear la cepa:", error);
            alert(
                "Error al crear la cepa. Por favor, revisa la consola para más detalles."
            );
        } finally {
            loader(false);
        }
    };

    // Confirmar creación desde el modal (flujo archivo .txt)
    const confirmFromModal = async (): Promise<void> => {
        const payload = buildCepaPayloadFromHeaderMap(formData, columns);

        loader(true);
        try {
            await createCepa(payload);
            alert("Cepa creada con éxito");
        } catch (error) {
            console.error("Error al crear la cepa:", error);
            alert(
                "Error al crear la cepa. Por favor, revisa la consola para más detalles."
            );
        } finally {
            loader(false);
        }

        setFormData({});
        setFileData({});
        inputRefs.current = [];
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setShowModal(false);
    };

    const closeModal = () => setShowModal(false);

    return {
        columns,
        formData,
        fileData,
        showModal,
        fileInputRef,
        inputRefs,
        handleInputChange,
        handleKeyDown,
        downloadTemplate,
        handleFileUpload,
        addCepaFromForm,
        confirmFromModal,
        closeModal,
    };
}
