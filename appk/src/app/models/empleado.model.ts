export interface Empleado {
 id: number;
 nombre: string;
 rfc: string;
 curp: string;
 email: string;
 telefono: string;
 fechaInicio: Date;
 puesto: string;
 departamento: string;
 salarioBase: number;
 deducciones?: DeduccionPercepcion[];
 percepciones?: DeduccionPercepcion[];
 isEditing?: boolean;
 estado: string;
}

export interface DeduccionPercepcion {
 id?: number;
 empleado_id?: number;
 tipo: string;
 clave: string;
 concepto: string;
 importeGravado: number;
 importeExento: number;
}