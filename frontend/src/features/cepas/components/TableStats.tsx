import './table-stats.css';

interface TableStatsProps {
  rowCount?: number;
  colCount?: number;
}

export default function TableStats_col({ colCount }: TableStatsProps) {
  return <span className="stats-value">{colCount}</span>;
}

export function TableStats_row({ rowCount }: TableStatsProps) {
  return <span className="stats-value">{rowCount}</span>;
}
