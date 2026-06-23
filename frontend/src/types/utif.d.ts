// utif@3.x no incluye tipos propios ni hay @types/utif instalado.
// Se declara el módulo para satisfacer noImplicitAny; el uso real (encodeImage)
// queda como `any`, igual que antes (ver ChartDownloadModal.tsx).
declare module "utif";
