import { useRef, useEffect } from 'react';
import type { CepaColumnDef } from '../../features/cepas/types/tableTypes';

export interface DropdownMenuProps {
  isOpen: boolean;
  columns: CepaColumnDef[];
  hiddenFields: Set<string>;
  onToggle: (colId: string, visible: boolean) => void;
  onClose: () => void;
}

export default function DropdownMenu({
  isOpen,
  columns,
  hiddenFields,
  onToggle,
  onClose
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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
        {columns.map(col => {
          const visible = !hiddenFields.has(col.field);
          return (
            <label key={col.field} className="flex items-center justify-between py-1">
              <span className="truncate">{col.headerName}</span>
              <input
                type="checkbox"
                checked={visible}
                onChange={() => onToggle(col.field, !visible)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
