// src/types/ag-grid-react.d.ts
import * as React from 'react';

declare module 'ag-grid-react' {
  // Le decimos a TS que AgGridReact es un componente React que acepta cualquier prop
  export class AgGridReact extends React.Component<any, any> {}
}
