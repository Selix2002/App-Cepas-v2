// src/features/cepas/pages/NewAtributePage.tsx
import ModalConfirmation from "../../../shared/components/addnew-modal/ModalConfirmation";
import NewAttributeHeader from "../components/new-attribute/NewAttributeHeader";
import NewAttributeForm from "../components/new-attribute/NewAttributeForm";
import { useNewAttribute } from "../hooks/new-attribute/useNewAttribute";

export default function NewAttributePage() {
  const {
    cepas,
    inputRefs,
    showModal,
    modalData,
    handleKeyDown,
    confirmFromInputs,
    confirmSubmit,
    closeModal,
  } = useNewAttribute();

  return (
    <div className="min-h-screen bg-[#213547]">
      <NewAttributeHeader />

      <main className="pt-32 p-8">
        <NewAttributeForm
          cepas={cepas}
          inputRefs={inputRefs}
          onKeyDown={handleKeyDown}
          onSubmit={confirmFromInputs}
        />

        <ModalConfirmation
          visible={showModal}
          data={modalData}
          onConfirm={confirmSubmit}
          onCancel={closeModal}
        />
      </main>
    </div>
  );
}
