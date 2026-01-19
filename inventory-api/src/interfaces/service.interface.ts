export interface IService {
    id?: number;
    name: string;
    description?: string;
    satKey: string;
    unitKey: string;
    categoryId: number;
    price: number;
    cost: number;
    duration?: number;
    active?: boolean;
    userId?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }