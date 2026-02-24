// src/features/cepas/pages/NewCepaPage.tsx
import ModalConfirmation from "../../../shared/components/ModalConfirmation";

import NewCepaHeader from "../components/new-cepa/NewCepaHeader";
import NewCepaForm from "../components/new-cepa/NewCepaForm";
import { useNewCepa } from "../hooks/new-cepa/useNewCepa";

export default function NewCepaPage() {
  const {
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
  } = useNewCepa();

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <NewCepaHeader
        onDownloadTemplate={downloadTemplate}
        fileInputRef={fileInputRef}
        onFileChange={handleFileUpload}
      />

      <main className="flex-grow p-6 overflow-y-auto">
        <NewCepaForm
          columns={columns}
          formData={formData}
          inputRefs={inputRefs}
          onFieldChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onAddCepa={addCepaFromForm}
        />
      </main>

      <ModalConfirmation
        visible={showModal}
        data={Object.keys(fileData).length ? fileData : formData}
        onConfirm={confirmFromModal}
        onCancel={closeModal}
      />
    </div>
  );
}
