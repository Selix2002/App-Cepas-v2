interface ModalConfirmationProps {
  visible: boolean;
  data: Record<string, string>;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ModalConfirmation({
  visible,
  data,
  onConfirm,
  onCancel,
}: ModalConfirmationProps) {
  if (!visible) return null;

  // dentro de tu componente NewCepaPage
  const name = data["Cepa"] || data["attribute_name"];
  const isCepa = Boolean(data["Cepa"]);
  const accion = isCepa ? "la nueva cepa" : "el atributo";

  return (
    <div className="fixed inset-0 text-black bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
        <h2 className="text-lg font-semibold mb-4 text-center">
          Vista previa del archivo
        </h2>
        <div className="max-h-60 overflow-y-auto mb-4">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Clave</th>
                <th className="border px-2 py-1 text-left">Valor</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([key, val]) => (
                <tr key={key}>
                  <td className="border px-2 py-1">{key}</td>
                  <td className="border px-2 py-1">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mb-4 text-center">
        ¿Está seguro que desea añadir {accion}{" "}
          <span className="font-semibold">
            "{name}"
          </span>{" "}
          a la base de datos?
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
          >
            SI
          </button>
          <button
            onClick={onCancel}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}
