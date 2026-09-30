/**
 * AISStream Live Vessel Tracking & Telemetry Client (SIH 26057).
 *
 * Provides REST query methods and persistent WebSocket streaming for real-time
 * vessel positions, trajectory tracks, and debris geofence proximity alerts.
 */

const RAW_API_BASE = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_BASE ? `${RAW_API_BASE.replace(/\/+$/, '')}/api` : '/api';

/**
 * Fetch current AIS connection status & telemetry metadata.
 */
export async function getAisStatus() {
  const res = await fetch(`${API_BASE}/ais/status`);
  if (!res.ok) throw new Error(`Failed to fetch AIS status: ${res.statusText}`);
  return res.json();
}

/**
 * Fetch list of currently tracked live vessels.
 */
export async function getAisVessels() {
  const res = await fetch(`${API_BASE}/ais/vessels`);
  if (!res.ok) throw new Error(`Failed to fetch AIS vessels: ${res.statusText}`);
  return res.json();
}

/**
 * Fetch recent navigation track history for tracked vessels.
 */
export async function getAisTracks() {
  const res = await fetch(`${API_BASE}/ais/tracks`);
  if (!res.ok) throw new Error(`Failed to fetch AIS tracks: ${res.statusText}`);
  return res.json();
}

/**
 * Fetch active vessel-geofence proximity alerts.
 */
export async function getAisAlerts() {
  const res = await fetch(`${API_BASE}/ais/alerts`);
  if (!res.ok) throw new Error(`Failed to fetch AIS alerts: ${res.statusText}`);
  return res.json();
}

/**
 * Synchronize current sonar debris geofences with the AIS backend
 * for real-time collision/proximity evaluation.
 */
export async function syncDebrisGeofences(geofences) {
  try {
    const res = await fetch(`${API_BASE}/ais/sync-geofences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geofences || []),
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn('Failed to sync geofences with AIS service:', err);
    return null;
  }
}

/**
 * Trigger a simulated vessel geofence collision breach to verify live SOS alerts.
 */
export async function triggerTestAlert() {
  const res = await fetch(`${API_BASE}/ais/test-breach`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to trigger test alert: ${res.statusText}`);
  return res.json();
}

/**
 * Clear all active proximity alerts.
 */
export async function clearTestAlerts() {
  const res = await fetch(`${API_BASE}/ais/clear-alerts`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to clear test alerts: ${res.statusText}`);
  return res.json();
}

/**
 * Configure or update AISStream API key and bounding box dynamically.
 */
export async function configureAis(apiKey, boundingBox = null) {
  const payload = { api_key: apiKey };
  if (boundingBox) payload.bounding_box = boundingBox;
  const res = await fetch(`${API_BASE}/ais/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to configure AIS: ${res.statusText}`);
  return res.json();
}


/**
 * WebSocket Connection Manager for live AIS updates.
 *
 * @param {Object} handlers - Callbacks for events
 * @param {Function} handlers.onInitialState - (data) => void
 * @param {Function} handlers.onVesselUpdate - (vessel) => void
 * @param {Function} handlers.onStatusChange - (status) => void
 * @param {Function} handlers.onProximityAlert - (alert) => void
 * @param {Function} handlers.onProximityClear - (alertId) => void
 * @returns {Object} Controller with disconnect() method
 */
export function connectAisWebSocket(handlers = {}) {
  let ws = null;
  let isClosedManually = false;
  let retryTimeout = null;
  let retryDelay = 1000;
  const maxRetryDelay = 30000;

  const getWsUrl = () => {
    if (RAW_API_BASE) {
      const wsProto = RAW_API_BASE.startsWith('https') ? 'wss:' : 'ws:';
      const cleanHost = RAW_API_BASE.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      return `${wsProto}//${cleanHost}/api/ais/ws`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ais/ws`;
  };

  const connect = () => {
    if (isClosedManually) return;

    try {
      const url = getWsUrl();
      ws = new WebSocket(url);

      ws.onopen = () => {
        retryDelay = 1000; // Reset retry delay
        if (handlers.onConnected) handlers.onConnected();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type;
          const data = payload.data;

          switch (type) {
            case 'initial_state':
              if (handlers.onInitialState) handlers.onInitialState(payload);
              break;
            case 'vessel_update':
              if (handlers.onVesselUpdate) handlers.onVesselUpdate(data);
              break;
            case 'status_change':
              if (handlers.onStatusChange) handlers.onStatusChange(data?.status);
              break;
            case 'proximity_alert':
              if (handlers.onProximityAlert) handlers.onProximityAlert(data);
              break;
            case 'proximity_clear':
              if (handlers.onProximityClear) handlers.onProximityClear(data?.alert_id);
              break;
            default:
              break;
          }
        } catch (parseErr) {
          console.debug('Error parsing AIS WebSocket frame:', parseErr);
        }
      };

      ws.onclose = () => {
        if (!isClosedManually) {
          if (handlers.onDisconnected) handlers.onDisconnected();
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, maxRetryDelay);
            connect();
          }, retryDelay);
        }
      };

      ws.onerror = (err) => {
        console.debug('AIS WebSocket error (will retry):', err);
        try {
          ws.close();
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      console.warn('Could not initialize AIS WebSocket:', e);
      retryTimeout = setTimeout(connect, retryDelay);
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
        } catch (e) {
          // ignore
        }
      }
    },
  };
}
