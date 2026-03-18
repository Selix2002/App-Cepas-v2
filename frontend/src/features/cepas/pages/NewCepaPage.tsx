// src/features/cepas/pages/NewCepaPage.tsx
import ModalConfirmation from "../../../shared/components/ModalConfirmation"
import NewCepaHeader     from "../components/new-cepa/NewCepaHeader"
import NewCepaForm       from "../components/new-cepa/NewCepaForm"
import { useNewCepa }    from "../hooks/new-cepa/useNewCepa"
import "../components/new-cepa/new-cepa.css"

export default function NewCepaPage() {
  const {
    columns,
    formData,
    inputRefs,
    showModal,
    handleInputChange,
    handleKeyDown,
    addCepaFromForm,
    confirmFromInputs,
    closeModal,
  } = useNewCepa()

  return (
    <div className="nc-page">
      <NewCepaHeader />

      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <NewCepaForm
          columns={columns}
          formData={formData}
          inputRefs={inputRefs}
          onFieldChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onAddCepa={addCepaFromForm}
        />
      </main>

      {/* Modal de confirmación antes de crear */}
      <ModalConfirmation
        visible={showModal}
        data={formData}
        onConfirm={confirmFromInputs}
        onCancel={closeModal}
      />
    </div>
  )
}
