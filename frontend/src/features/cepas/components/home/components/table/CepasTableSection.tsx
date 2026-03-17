// src/features/cepas/components/home/CepasTableSection.tsx
import CepasTable, { type CepasTableProps } from "../../../CepasTable/CepasTable";

type CepasTableSectionProps = CepasTableProps;

export default function CepasTableSection(props: CepasTableSectionProps) {
    return (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <CepasTable {...props} />
        </div>
    );
}
