export interface UserBase {
    username: string
    isAdmin: boolean
    hiddenColumns?: string[];
  }
  
  export interface User extends UserBase {
    id: number
  }
  export interface UserCreate extends UserBase {
    password: string
  }
  
  export interface Token {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token: string | null
  }
  export interface AuthContextType {
    user: User | null
    token: string | null
    login: (username: string, password: string) => Promise<void>
    logout: () => void
  }
  
  
  export interface CepaUpdatePayload {
    // Campos directos de Cepa
    nombre?: string;
    cod_lab?: string;
    origen?: string;
    pigmentacion?: string;
    latitud?: number;
    longitud?: number;
    datos_extra?: Record<string, any>; // Para campos JSONB adicionales
    // … agrega aquí el resto de columnas escalares de tu tabla CEPAS
  
    // Relaciones uno-a-uno como objetos anidados
    almacenamiento?: {
      envio_puq?: string;
      temperatura_menos80?: string;
      
      // … demás campos de Almacenamiento
    };
    medio_cultivo?: {
      medio?: string;
      // … demás campos de MedioCultivo
    };
    morfologia?: {
      gram?: string;
      morfologia_1?: string;
      morfologia_2?: string;
    };
    actividad_enzimatica?: {
      aia?: string;
      amilasa?: string;
      catalasa?: string;
      celulasa?: string;
      fosfatasa?: string;
      lecitinasa?: string;
      ureasa?: string;
      lipasa?: string;
      proteasa?: string;
      // … demás campos de ActividadEnzimatica
    };
    crecimiento_temperatura?: {
      temp_5?: number;
      temp_25?: number;
      temp_37?: number;
      // … demás campos de CrecimientoTemperatura
    };
    resistencia_antibiotica?: {
      amp?: string;
      ctx?: string;
      cxm?: string;
      caz?: string;
      ak?: string;
      c?: string;
      te?: string;
      am_ecoli?: string;
      am_saureus?: string;
      // … demás campos de ResistenciaAntibiotica
    };
    caracterizacion_genetica?: {
      gen_16s?: string;
      metabolomica?: string;
  
    };
    proyecto?: {
      nombre_proyecto?: string;
      responsable?: string;
      // … demás campos de Proyecto
    };
  }
  