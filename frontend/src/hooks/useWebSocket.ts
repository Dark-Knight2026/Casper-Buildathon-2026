import { useEffect, useCallback, useState } from 'react';
import { wsManager, MessageHandler } from '@/lib/websocket';

/**
 * Hook for WebSocket connection
 */
export function useWebSocket() {
  const [status, setStatus] = useState(wsManager.getStatus());

  useEffect(() => {
    // TODO: re-wire auth when the backend WS endpoint lands. Tokens now live
    // in HttpOnly cookies and aren't accessible to JS, so the browser will
    // attach them automatically on the WSS handshake — no token arg needed
    // unless the backend opts for a ticket-based scheme.
    wsManager.connect();

    // Listen for connection status changes
    const unsubscribe = wsManager.on('connection', () => {
      setStatus(wsManager.getStatus());
    });

    // Update status periodically
    const interval = setInterval(() => {
      setStatus(wsManager.getStatus());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const send = useCallback(<T,>(type: string, data: T) => {
    return wsManager.send(type, data);
  }, []);

  return {
    ...status,
    send
  };
}

/**
 * Hook for subscribing to WebSocket messages
 */
export function useWebSocketSubscription<T>(
  messageType: string,
  handler: MessageHandler<T>,
  deps: unknown[] = []
) {
  useEffect(() => {
    const unsubscribe = wsManager.on(messageType, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageType, ...deps]);
}

/**
 * Hook for real-time property updates
 */
export function usePropertyUpdates(propertyId: string, onUpdate: (property: unknown) => void) {
  useWebSocketSubscription(
    'property:update',
    (data: { propertyId: string; property: unknown }) => {
      if (data.propertyId === propertyId) {
        onUpdate(data.property);
      }
    },
    [propertyId, onUpdate]
  );
}

/**
 * Hook for real-time maintenance updates
 */
export function useMaintenanceUpdates(onUpdate: (request: unknown) => void) {
  useWebSocketSubscription('maintenance:update', onUpdate, [onUpdate]);
}

/**
 * Hook for real-time notifications
 */
export function useNotifications(onNotification: (notification: unknown) => void) {
  useWebSocketSubscription('notification', onNotification, [onNotification]);
}