import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User, QuarterState, Transfer, Notification, SeverityLevel, Quarter, Role, RouteType } from './types';
import { api, type DistrictDTO } from './api/endpoints';
import { ApiError, tokenStore, setUnauthorizedHandler } from './api/client';
import { connectSocket, type ServerEvent } from './api/socket';
import { toQuarterState, toTransfer } from './api/mapping';
import { SEVERITY_INFO } from './data';

export interface NewTransfer {
  resourceId: number;
  from: Quarter;
  to: Quarter;
  transit?: Quarter;
  quantity: number;
  routeType: RouteType;
}

export interface RegisterInput {
  username: string;
  password: string;
  role: Role;
  districtId: number | null;
}

interface AppContextType {
  user: User | null;
  booting: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  quarters: QuarterState[];
  resources: { id: number; name: string }[];
  disasterLevel: SeverityLevel;
  setQuarterSeverity: (quarter: Quarter, level: SeverityLevel) => Promise<void>;
  lowerRetentionThresholds: (quarter: Quarter) => Promise<void>;
  transfers: Transfer[];
  addTransfer: (transfer: NewTransfer) => Promise<void>;
  approveTransfer: (t: Transfer) => Promise<void>;
  rejectTransfer: (t: Transfer) => Promise<void>;
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  isConnected: boolean;
  currentView: string;
  setCurrentView: (view: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const errorMessage = (e: unknown) =>
  e instanceof ApiError ? `${e.errorCode}: ${e.message}` : 'Unexpected error';

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(() => tokenStore.get() !== null);
  const [districts, setDistricts] = useState<DistrictDTO[]>([]);
  const [quarters, setQuarters] = useState<QuarterState[]>([]);
  const [resources, setResources] = useState<{ id: number; name: string }[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentView, setCurrentView] = useState('map');

  // niveau le plus élevé parmi les quartiers, affiché comme niveau de menace de la ville
  const disasterLevel = Math.max(1, ...quarters.map(q => q.severity)) as SeverityLevel;

  const quartersRef = useRef(quarters);
  quartersRef.current = quarters;
  const districtsRef = useRef(districts);
  districtsRef.current = districts;
  const resourcesRef = useRef(resources);
  resourcesRef.current = resources;

  const pushNotification = useCallback((type: Notification['type'], message: string) => {
    const id = `n-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [
      { id, type, message, timestamp: new Date(), read: false },
      ...prev,
    ].slice(0, 20));
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, 6000);
  }, []);

  const refreshTransfers = useCallback(async () => {
    const names = new Map(resourcesRef.current.map(r => [r.id, r.name]));
    const rows = await api.transfers();
    setTransfers(rows.map(dto => toTransfer(dto, districtsRef.current, names)));
  }, []);

  const refreshStocks = useCallback(async () => {
    const list = districtsRef.current;
    const stocks = await Promise.all(list.map(d => api.stock(d.id)));
    setQuarters(prev => prev.map(q => {
      const i = list.findIndex(d => d.id === q.id);
      const resources = stocks[i].map(s => ({
        resourceId: s.resource_id, type: s.resource_name,
        current: s.current_quantity, initial: s.initial_quantity, retention: s.retention_min,
      }));
      return { ...q, resources };
    }));
  }, []);

  const loadAll = useCallback(async () => {
    const [districtList, resourceList] = await Promise.all([api.districts(), api.resources()]);
    const [adjacencies, stocks] = await Promise.all([
      Promise.all(districtList.map(d => api.adjacency(d.id))),
      Promise.all(districtList.map(d => api.stock(d.id))),
    ]);
    districtsRef.current = districtList;
    resourcesRef.current = resourceList;
    setDistricts(districtList);
    setResources(resourceList);
    setQuarters(districtList.map((d, i) => toQuarterState(d, adjacencies[i].adjacent_to, districtList, stocks[i])));
    await refreshTransfers();
  }, [refreshTransfers]);

  const startSession = useCallback(async () => {
    const [me, districtList] = await Promise.all([api.me(), api.districts()]);
    await loadAll();
    setUser({
      id: me.id,
      username: me.username,
      role: me.role,
      districtId: me.district_id,
      quarter: districtList.find(d => d.id === me.district_id)?.name as Quarter | undefined,
    });
  }, [loadAll]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setQuarters([]);
    setTransfers([]);
    setNotifications([]);
    setCurrentView('map');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (tokenStore.get() === null) return;
    startSession()
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false));
  }, [startSession]);

  const handleServerEvent = useCallback((e: ServerEvent) => {
    const quarterName = (districtId: number) => quartersRef.current.find(q => q.id === districtId)?.name ?? `District ${districtId}`;
    const resourceName = (resourceId: number) => resourcesRef.current.find(r => r.id === resourceId)?.name ?? `Resource ${resourceId}`;

    if (e.event === 'stock_updated') {
      setQuarters(prev => prev.map(q => {
        if (q.id !== e.district_id) return q;
        const resources = q.resources.map(r => r.resourceId === e.resource_id ? { ...r, current: e.new_quantity } : r);
        return { ...q, resources };
      }));
      pushNotification('stock-update', `${quarterName(e.district_id)} — ${resourceName(e.resource_id)}: ${e.new_quantity} units`);
      refreshTransfers().catch(() => {});
    } else if (e.event === 'transfer_conflict') {
      pushNotification('transfer-conflict', `CONFLICT: concurrent requests on ${resourceName(e.resource_id)} in ${quarterName(e.district_id)}`);
      refreshTransfers().catch(() => {});
    } else if (e.event === 'transfer_created') {
      pushNotification('transfer-update', `New request TR-${String(e.transfer_id).padStart(3, '0')}: ${e.quantity}× ${resourceName(e.resource_id)} ${quarterName(e.from_district_id)} → ${quarterName(e.to_district_id)}`);
      refreshTransfers().catch(() => {});
    } else if (e.event === 'transfer_updated') {
      pushNotification('transfer-update', `Transfer TR-${String(e.transfer_id).padStart(3, '0')} ${e.status}`);
      refreshTransfers().catch(() => {});
    } else if (e.event === 'disaster_level_changed') {
      const level = e.level as SeverityLevel;
      setQuarters(prev => prev.map(q => q.id === e.district_id ? { ...q, severity: level } : q));
      pushNotification('severity-change', `${quarterName(e.district_id)} → Level ${level} ${SEVERITY_INFO[level].name}`);
      refreshStocks().catch(() => {});
    }
  }, [pushNotification, refreshTransfers, refreshStocks]);

  useEffect(() => {
    if (!user) return;
    return connectSocket(handleServerEvent, setIsConnected);
  }, [user, handleServerEvent]);

  const login = async (username: string, password: string) => {
    const { access_token } = await api.login(username, password);
    tokenStore.set(access_token);
    try {
      await startSession();
    } catch (e) {
      tokenStore.clear();
      throw e;
    }
    setCurrentView('map');
  };

  const register = async ({ username, password, role, districtId }: RegisterInput) => {
    await api.register({ username, password, role, district_id: role === 'QC' ? districtId : null });
    await login(username, password);
  };

  const districtIdOf = (name: Quarter) => quartersRef.current.find(q => q.name === name)!.id;

  const setQuarterSeverity = async (quarter: Quarter, level: SeverityLevel) => {
    try {
      await api.setDistrictLevel(districtIdOf(quarter), level);
    } catch (e) {
      pushNotification('error', errorMessage(e));
    }
  };

  const lowerRetentionThresholds = async (quarter: Quarter) => {
    try {
      await api.setDistrictLevel(districtIdOf(quarter), 5, 15);
      await refreshStocks();
      pushNotification('stock-update', `CD ORDER: ${quarter} retention threshold lowered to 15%`);
    } catch (e) {
      pushNotification('error', errorMessage(e));
    }
  };

  const addTransfer = async (t: NewTransfer) => {
    const idOf = (name: Quarter) => quarters.find(q => q.name === name)!.id;
    await api.createTransfer({
      resource_id: t.resourceId,
      from_district_id: idOf(t.from),
      to_district_id: idOf(t.to),
      transit_district_id: t.routeType === 'transit' && t.transit ? idOf(t.transit) : null,
      quantity: t.quantity,
      route_type: t.routeType,
    });
    await refreshTransfers();
  };

  const decide = (action: 'approve' | 'reject') => async (t: Transfer) => {
    try {
      if (action === 'approve') await api.approveTransfer(t.apiId);
      else await api.rejectTransfer(t.apiId);
      await Promise.all([refreshTransfers(), refreshStocks()]);
    } catch (e) {
      pushNotification('error', errorMessage(e));
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      user, booting, login, register, logout,
      quarters, resources, disasterLevel, setQuarterSeverity, lowerRetentionThresholds,
      transfers, addTransfer, approveTransfer: decide('approve'), rejectTransfer: decide('reject'),
      notifications, dismissNotification,
      isConnected,
      currentView, setCurrentView,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}