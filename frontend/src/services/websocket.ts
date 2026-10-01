import { NotificationItem } from '../types';

type NotificationCallback = (notification: NotificationItem) => void;

class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private subscribers: Set<NotificationCallback> = new Set();
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private isIntentionallyClosed = false;

  private getWebSocketUrl(): string {
    const token = localStorage.getItem('solar_token') || '';
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

    let wsBase = '';
    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      const url = new URL(apiBase);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      wsBase = `${wsProtocol}//${url.host}${url.pathname.replace(/\/$/, '')}`;
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsBase = `${wsProtocol}//${window.location.host}${apiBase.replace(/\/$/, '')}`;
    }

    return `${wsBase}/notifications/ws?token=${encodeURIComponent(token)}`;
  }

  public connect() {
    const token = localStorage.getItem('solar_token');
    if (!token) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    try {
      const url = this.getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Send ping every 25 seconds to keep connection alive
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const data = JSON.parse(event.data);
          if (data.type === 'new_notification' && data.notification) {
            // Deliver notification exclusively to registered notification UI subscribers (Header bell, count, toast)
            this.subscribers.forEach(cb => cb(data.notification));
          }
        } catch (e) {
          // ignore non-json messages
        }
      };

      this.ws.onclose = () => {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (!this.isIntentionallyClosed) {
          // Attempt reconnection after 3 seconds
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      // WebSocket initial connection failure fallback
    }
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public reconnect() {
    this.disconnect();
    this.isIntentionallyClosed = false;
    this.connect();
  }

  public subscribe(callback: NotificationCallback) {
    this.subscribers.add(callback);
    this.connect();
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }
}

export const notificationWS = new NotificationWebSocket();
