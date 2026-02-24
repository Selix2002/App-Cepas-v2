// src/features/cepas/hooks/useNewAttribute.ts
import { useEffect, useRef, useState } from "react";
import type React from "react";

import { fetchCepasFull, updateCepasJSONB } from "../../services/CepasQuery";
import { loader } from "../../../../shared/utils/loader";
import {
    buildTemplateText,
    downloadTextFile,
    parseAttributeFile,
    validateAttributeDict,
} from "../../utils/attributeFile";

type CepaLite = { id: number; nombre: string };

export function useNewAttribute() {
    const [cepas, setCepas] = useState<CepaLite[]>([]);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [fileDict, setFileDict] = useState<Record<string, string>>({});
    const [showModal, setShowModal] = useState(false);

    // Cargar cepas al montar
    useEffect(() => {
        let mounted = true;
        loader(true);
        fetchCepasFull()
            .then((data) => {
                if (mounted) setCepas(data);
            })
            .catch((error) => console.error("Error cargando cepas:", error))
            .finally(() => {
                loader(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    // Descargar plantilla
    const downloadTemplate = () => {
        const text = buildTemplateText(cepas);
        downloadTextFile("template_addAttribute.txt", text);
    };

    // Procesar archivo .txt
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const text = evt.target?.result;
                if (typeof text !== "string") {
                    throw new Error("Archivo vacío o formato inválido");
                }

                const dict = parseAttributeFile(text);
                validateAttributeDict(
                    dict,
                    cepas.map((c) => c.nombre)
                );

                setFileDict(dict);
                setShowModal(true);
            } catch (err: any) {
                const msg =
                    err instanceof Error
                        ? err.message
                        : "Error al procesar el archivo";
                alert(`Error al procesar el archivo: ${msg}`);
                console.error(msg);
            } finally {
                // resetear input para permitir volver a subir el mismo archivo
                e.target.value = "";
            }
        };

        reader.readAsText(file);
    };

    // Navegar con Enter entre inputs
    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const nextInput = inputRefs.current[index + 1];
            if (nextInput) nextInput.focus();
        }
    };

    // Llamada genérica al backend para guardar
    const confirmUpdate = async (dict: Record<string, string>) => {
        try {
            loader(true);
            await updateCepasJSONB(dict);
            alert("¡Atributos añadidos con éxito!");

            setFileDict({});
            setShowModal(false);

            // Limpiar inputs del formulario
            inputRefs.current.forEach((el) => {
                if (el) el.value = "";
            });
        } catch (err: any) {
            console.error(err);
            alert(
                `Error al actualizar la base de datos: ${err.response?.data?.detail ?? err.message
                }`
            );
        } finally {
            loader(false);
        }
    };

    // Confirmar usando los datos del archivo
    const confirmFromFile = () => {
        if (!fileDict || Object.keys(fileDict).length === 0) {
            alert("No hay datos cargados desde archivo.");
            return;
        }
        void confirmUpdate(fileDict);
    };

    // Construye dict desde los inputs y confirma
    const confirmFromInputs = () => {
        const dict: Record<string, string> = {};

        const attributeName = inputRefs.current[0]?.value?.trim();
        if (!attributeName) {
            alert('Debe ingresar un valor para "Nombre del atributo".');
            return;
        }

        dict["attribute_name"] = attributeName;

        cepas.forEach((cepa, idx) => {
            const val = inputRefs.current[idx + 1]?.value?.trim();
            dict[cepa.nombre] = val && val !== "" ? val : "N/I";
        });

        void confirmUpdate(dict);
    };

    const closeModal = () => setShowModal(false);

    return {
        cepas,
        inputRefs,
        fileInputRef,
        fileDict,
        showModal,
        downloadTemplate,
        handleFileChange,
        handleKeyDown,
        confirmFromFile,
        confirmFromInputs,
        closeModal,
    };
}
