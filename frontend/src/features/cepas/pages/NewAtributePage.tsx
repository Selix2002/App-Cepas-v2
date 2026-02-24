// src/features/cepas/pages/NewAtributePage.tsx
import ModalConfirmation from "../../../shared/components/ModalConfirmation";

import NewAttributeHeader from "../components/new-attribute/NewAttributeHeader";
import NewAttributeForm from "../components/new-attribute/NewAttributeForm";
import { useNewAttribute } from "../hooks/new-attribute/useNewAttribute";

export default function NewAttributePage() {
  const {
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
  } = useNewAttribute();

  return (
    <div className="min-h-screen bg-[#213547]">
      {/* Header fijo */}
      <NewAttributeHeader
        onDownloadTemplate={downloadTemplate}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />

      {/* Formulario principal */}
      <main className="pt-32 p-8">
        <h1 className="text-2xl text-center font-bold text-white mb-6">
          Añadir Nuevo Atributo
        </h1>

        <NewAttributeForm
          cepas={cepas}
          inputRefs={inputRefs}
          onKeyDown={handleKeyDown}
          onSubmit={confirmFromInputs}
        />

        {/* Modal de confirmación (datos provenientes del archivo txt) */}
        <ModalConfirmation
          visible={showModal}
          data={fileDict}
          onConfirm={confirmFromFile}
          onCancel={closeModal}
        />
      </main>
    </div>
  );
}
