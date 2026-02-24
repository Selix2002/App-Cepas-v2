// 1. Define el tipo para cada objeto en el array de datos.
export interface PieDataItem {
  id: string | number;
  value: number;
  label?: string;
  color?: string; // <-- Propiedad añadida para que coincida con tus datos
}

// 2. Define el tipo para las props que recibe el componente.
export interface MyPieProps {
  data: PieDataItem[];
}