import { request } from './client';
import type { Role, RouteType } from '../types';

export interface DistrictDTO {
  id: number;
  code: string;
  name: string;
  has_maritime_access: boolean;
  disaster_level: number;
}

export interface ResourceDTO {
  id: number;
  name: string;
}

export interface StockDTO {
  resource_id: number;
  resource_name: string;
  current_quantity: number;
  initial_quantity: number;
  retention_min: number;
}

export interface TransferDTO {
  id: number;
  resource_id: number;
  from_district_id: number;
  to_district_id: number;
  transit_district_id: number | null;
  quantity: number;
  route_type: RouteType;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_by_id: number;
  disaster_level_at_request: number;
  created_at: string;
}

export interface UserDTO {
  id: number;
  username: string;
  role: Role;
  district_id: number | null;
}

export interface DistrictDisasterDTO {
  district_id: number;
  level: number;
  updated_at: string | null;
}

export interface CreateTransferBody {
  resource_id: number;
  from_district_id: number;
  to_district_id: number;
  transit_district_id: number | null;
  quantity: number;
  route_type: RouteType;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string }>('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  register: (body: { username: string; password: string; role: Role; district_id: number | null }) =>
    request<UserDTO>('/auth/register', { method: 'POST', body, auth: false }),
  me: () => request<UserDTO>('/auth/me'),

  districts: () => request<DistrictDTO[]>('/districts', { auth: false }),
  adjacency: (districtId: number) =>
    request<{ district_id: number; adjacent_to: string[] }>(`/districts/${districtId}/adjacency`),
  resources: () => request<ResourceDTO[]>('/resources'),
  stock: (districtId: number) => request<StockDTO[]>(`/districts/${districtId}/stock`),

  transfers: () => request<TransferDTO[]>('/transfers'),
  createTransfer: (body: CreateTransferBody) =>
    request<{ id: number; status: string; created_at: string }>('/transfers', { method: 'POST', body }),
  approveTransfer: (id: number) => request<{ id: number; status: string }>(`/transfers/${id}/approve`, { method: 'PATCH' }),
  rejectTransfer: (id: number) => request<{ id: number; status: string }>(`/transfers/${id}/reject`, { method: 'PATCH' }),

  setDistrictLevel: (districtId: number, level: number, retentionThresholdPct?: number) =>
    request<DistrictDisasterDTO>(`/districts/${districtId}/disaster`, {
      method: 'PATCH',
      body: retentionThresholdPct === undefined ? { level } : { level, retention_threshold_pct: retentionThresholdPct },
    }),
};