export type ClientStatus = "active" | "inactive";

export interface TenantClient {
  id: string;
  name: string;
  status: ClientStatus;
  createdAt?: Date;
  createdBy: string;
}
