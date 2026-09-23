import { fetchEventSource, EventStreamContentType } from '@microsoft/fetch-event-source';
import { activityLogSchema, type ActivityLog } from '@min-trello/shared';
import { refreshAccessToken } from '../api/refresh';
import { getAccessToken } from '../api/token-store';
import { env } from '../config/env';

export interface ActivityStreamHandlers {
  onActivity: (activity: ActivityLog) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
  onAuthError?: () => void;
}

const RECONNECT_DELAY_MS = 3000;

export function activityStreamUrl(boardId: string): string {
  return `${env.VITE_API_URL}/boards/${boardId}/activity/stream`;
}

/**
 * Opens the board activity SSE stream with a Bearer token (EventSource cannot send
 * custom headers). Any failure — including an expired access token — triggers a
 * single-flight refresh and a reconnect with the new token. Returns a disposer.
 */
export function openActivityStream(boardId: string, handlers: ActivityStreamHandlers): () => void {
  const controller = new AbortController();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function connect(): Promise<void> {
    try {
      await fetchEventSource(activityStreamUrl(boardId), {
        signal: controller.signal,
        credentials: 'include',
        openWhenHidden: true,
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
        onopen: async (response) => {
          const contentType = response.headers.get('content-type');
          if (response.ok && contentType?.includes(EventStreamContentType)) {
            handlers.onOpen?.();
            return;
          }
          throw new Error(`Activity stream failed with status ${response.status}`);
        },
        onmessage: (message) => {
          if (message.event !== 'activity' || !message.data) {
            return;
          }
          try {
            const parsed = activityLogSchema.safeParse(JSON.parse(message.data));
            if (parsed.success) {
              handlers.onActivity(parsed.data);
            }
          } catch {
            // ignore malformed payloads
          }
        },
        onerror: (error) => {
          // Stop the library's internal retry; the outer loop owns reconnection.
          throw error;
        },
      });
    } catch (error) {
      if (stopped || controller.signal.aborted) {
        return;
      }
      handlers.onError?.(error);
      try {
        await refreshAccessToken();
      } catch {
        handlers.onAuthError?.();
      }
      if (!stopped) {
        timer = setTimeout(() => void connect(), RECONNECT_DELAY_MS);
      }
    }
  }

  void connect();

  return () => {
    stopped = true;
    controller.abort();
    if (timer) {
      clearTimeout(timer);
    }
  };
}
