import { useRef, useEffect } from 'react';
import type { CepaColumnDef } from '../../features/cepas/types/tableTypes';
import './dropdown-menu.css';

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
    <div ref={menuRef} className="dd-menu">
      <div className="dd-list">
        {columns.map(col => {
          const visible = !hiddenFields.has(col.field);
          return (
            <label key={col.field} className="dd-item">
              <span className="dd-item-label">{col.headerName}</span>
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
