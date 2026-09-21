import type { DistrictDTO, StockDTO, TransferDTO } from './endpoints';
import type { Quarter, QuarterState, ResourceStock, SeverityLevel, Transfer } from '../types';

const DAY_MS = 86_400_000;

export function toResourceStock(dto: StockDTO): ResourceStock {
  return {
    resourceId: dto.resource_id,
    type: dto.resource_name,
    current: dto.current_quantity,
    initial: dto.initial_quantity,
    retention: dto.retention_min,
  };
}

export function toQuarterState(
  district: DistrictDTO,
  adjacentCodes: string[],
  districts: DistrictDTO[],
  stocks: StockDTO[],
): QuarterState {
  const resources = stocks.map(toResourceStock);
  return {
    id: district.id,
    code: district.code,
    name: district.name as Quarter,
    severity: district.disaster_level as SeverityLevel,
    hasMaritimeAccess: district.has_maritime_access,
    adjacentTo: adjacentCodes
      .map(code => districts.find(d => d.code === code)?.name as Quarter | undefined)
      .filter((n): n is Quarter => n !== undefined),
    resources,
  };
}

// Pas de date de livraison côté API : estimation à partir du type de route (transit et maritime : délai plus long qu'une route directe).
export function estimateDelivery(createdAt: Date, routeType: Transfer['routeType']): Date {
  const days = routeType === 'direct' ? 1 : 2;
  return new Date(createdAt.getTime() + days * DAY_MS);
}

export function toTransfer(dto: TransferDTO, districts: DistrictDTO[], resourceNames: Map<number, string>): Transfer {
  const nameOf = (id: number) => districts.find(d => d.id === id)?.name as Quarter;
  // le serveur renvoie un datetime naïf en UTC, sans suffixe de fuseau
  const requestedAt = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(dto.created_at) ? dto.created_at : `${dto.created_at}Z`);
  return {
    id: `tr-${String(dto.id).padStart(3, '0')}`,
    apiId: dto.id,
    resourceId: dto.resource_id,
    resource: resourceNames.get(dto.resource_id) ?? `Resource #${dto.resource_id}`,
    from: nameOf(dto.from_district_id),
    to: nameOf(dto.to_district_id),
    transit: dto.transit_district_id === null ? undefined : nameOf(dto.transit_district_id),
    quantity: dto.quantity,
    routeType: dto.route_type,
    status: dto.status,
    requestedAt,
    scheduledAt: estimateDelivery(requestedAt, dto.route_type),
    requestedById: dto.requested_by_id,
  };
}