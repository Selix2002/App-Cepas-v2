import { useRef, useEffect, useReducer } from 'react';
import type { Column } from 'ag-grid-community';

export interface DropdownMenuProps {
  isOpen: boolean;
  columns: Column[];
  onToggle: (colId: string, visible: boolean) => void;
  onClose: () => void;
}

export default function DropdownMenu({
  isOpen,
  columns,
  onToggle,
  onClose
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  // Reducer para forzar re-render tras toggle
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-4 top-full mt-2 w-64 bg-gray-800 text-white rounded shadow-lg z-50"
    >
      <div className="flex flex-col max-h-128 overflow-y-auto p-6">
        {columns.map(column => {
          const colId = column.getColId();
          const visible = column.isVisible();
          return (
            <label key={colId} className="flex items-center justify-between py-1">
              <span className="truncate">{column.getColDef().headerName}</span>
              <input
                type="checkbox"
                checked={visible}
                onChange={() => {
                  onToggle(colId, !visible);
                  forceUpdate();
                }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
