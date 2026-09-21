export type Role = 'QC' | 'LC' | 'CD';
export type Quarter = 'Apex' | 'Echo' | 'Warden' | 'Xeno' | 'Zion';
export type SeverityLevel = 1 | 2 | 3 | 4 | 5;
export type ResourceType = string;

export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type RouteType = 'direct' | 'transit' | 'maritime';

export interface User {
  id: number;
  username: string;
  role: Role;
  districtId: number | null;
  quarter?: Quarter;
}

export interface ResourceStock {
  resourceId: number;
  type: ResourceType;
  current: number;
  initial: number;
  retention: number;
}

export interface QuarterState {
  id: number;
  code: string;
  name: Quarter;
  severity: SeverityLevel;
  hasMaritimeAccess: boolean;
  adjacentTo: Quarter[];
  resources: ResourceStock[];
}

export interface Transfer {
  id: string;
  apiId: number;
  resourceId: number;
  resource: ResourceType;
  from: Quarter;
  to: Quarter;
  transit?: Quarter;
  quantity: number;
  routeType: RouteType;
  status: TransferStatus;
  requestedAt: Date;
  scheduledAt: Date;
  requestedById: number;
}

export interface Notification {
  id: string;
  type: 'severity-change' | 'transfer-conflict' | 'stock-update' | 'transfer-update' | 'error';
  message: string;
  timestamp: Date;
  read: boolean;
}