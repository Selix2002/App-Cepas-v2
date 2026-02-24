interface TableStatsProps {
  rowCount?: number;
  colCount?: number;
}

export default function TableStats_col({colCount }: TableStatsProps) {
  return (
    <span className="text-4xl font-bold leading-tight">
        {colCount}
    </span>
  );
}

export function TableStats_row({ rowCount }: TableStatsProps) {
  return (
    <span className="text-4xl font-bold leading-tight">
        {rowCount}
    </span>
  );
}
