/**
 * AIS Demo / Offline Fallback Mode API Client (SIH 26057).
 *
 * Communicates with independent /api/ais/demo endpoints to control offline replay
 * of recorded real AIS telemetry.
 */

const RAW_API_BASE = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_BASE ? `${RAW_API_BASE.replace(/\/+$/, '')}/api/ais/demo` : '/api/ais/demo';

export async function getDemoStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error(`Failed to fetch demo status: ${res.statusText}`);
  return res.json();
}

export async function getDemoVessels() {
  const res = await fetch(`${API_BASE}/vessels`);
  if (!res.ok) throw new Error(`Failed to fetch demo vessels: ${res.statusText}`);
  return res.json();
}

export async function getDemoTracks() {
  const res = await fetch(`${API_BASE}/tracks`);
  if (!res.ok) throw new Error(`Failed to fetch demo tracks: ${res.statusText}`);
  return res.json();
}

export async function getDemoAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error(`Failed to fetch demo alerts: ${res.statusText}`);
  return res.json();
}

export async function playDemo() {
  const res = await fetch(`${API_BASE}/play`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to play demo: ${res.statusText}`);
  return res.json();
}

export async function pauseDemo() {
  const res = await fetch(`${API_BASE}/pause`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to pause demo: ${res.statusText}`);
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to reset demo: ${res.statusText}`);
  return res.json();
}

export async function setDemoSpeed(speed) {
  const res = await fetch(`${API_BASE}/speed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed }),
  });
  if (!res.ok) throw new Error(`Failed to set speed: ${res.statusText}`);
  return res.json();
}

export async function syncDemoGeofences(geofences) {
  try {
    const res = await fetch(`${API_BASE}/sync-geofences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geofences || []),
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.debug('Failed to sync geofences with demo service:', err);
    return null;
  }
}

/**
 * WebSocket Connection for Demo Replay Stream
 */
export function connectAisDemoWebSocket(handlers = {}) {
  let ws = null;
  let isClosedManually = false;
  let retryTimeout = null;

  const getWsUrl = () => {
    if (RAW_API_BASE) {
      const wsProto = RAW_API_BASE.startsWith('https') ? 'wss:' : 'ws:';
      const cleanHost = RAW_API_BASE.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      return `${wsProto}//${cleanHost}/api/ais/demo/ws`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ais/demo/ws`;
  };

  const connect = () => {
    if (isClosedManually) return;
    try {
      const url = getWsUrl();
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (handlers.onConnected) handlers.onConnected();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'demo_snapshot') {
            if (handlers.onSnapshot) handlers.onSnapshot(payload);
          }
        } catch (e) {
          console.debug('Error parsing demo frame:', e);
        }
      };

      ws.onclose = () => {
        if (!isClosedManually) {
          if (handlers.onDisconnected) handlers.onDisconnected();
          retryTimeout = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch (e) {}
      };
    } catch (e) {
      retryTimeout = setTimeout(connect, 2000);
    }
  };

  connect();

  return {
    disconnect: () => {
      isClosedManually = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
    },
  };
}
