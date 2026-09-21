import { wsUrl } from './client';

export type ServerEvent =
  | { event: 'stock_updated'; district_id: number; resource_id: number; new_quantity: number }
  | { event: 'transfer_conflict'; resource_id: number; district_id: number }
  | { event: 'transfer_created'; transfer_id: number; resource_id: number; from_district_id: number; to_district_id: number; quantity: number }
  | { event: 'transfer_updated'; transfer_id: number; status: string }
  | { event: 'disaster_level_changed'; district_id: number; level: number };

const PING_MS = 25_000;
const MAX_BACKOFF_MS = 10_000;

export function connectSocket(onEvent: (e: ServerEvent) => void, onStatus: (connected: boolean) => void) {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let pingTimer: ReturnType<typeof setInterval> | undefined;

  const open = () => {
    socket = new WebSocket(wsUrl());

    socket.onopen = () => {
      attempt = 0;
      onStatus(true);
      pingTimer = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send('ping'), PING_MS);
    };

    socket.onmessage = msg => {
      try {
        onEvent(JSON.parse(msg.data) as ServerEvent);
      } catch {
        // message non JSON ignoré
      }
    };

    socket.onclose = () => {
      clearInterval(pingTimer);
      onStatus(false);
      if (closed) return;
      attempt += 1;
      retryTimer = setTimeout(open, Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS));
    };
  };

  open();

  return () => {
    closed = true;
    clearTimeout(retryTimer);
    clearInterval(pingTimer);
    socket?.close();
  };
}