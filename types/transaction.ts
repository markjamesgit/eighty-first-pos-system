export interface Transaction {
  id: string;
  clientId: string;
  total: number;
  createdAt?: Date;
}
