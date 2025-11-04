export const revalidate = 0;

export type LogEvent = {
  ts: string;
  route: string;
  model: string;
  dur_ms: number;
  ok: boolean;
  status: number;
  err_type?: string;
  err_code?: string;
  mock_used: boolean;
};

export type TelemetryEvent = {
  name: string;
  properties: Record<string, any>;
};

export function emitTelemetry(event: TelemetryEvent): void {
  // No-op for now; will be implemented later with Vercel Analytics/Sentry
  console.info('TELEMETRY:', event);
}

export function logApiEvent(event: LogEvent): void {
  // Log the standardized event shape
  console.info(JSON.stringify(event));
  
  // Also emit as telemetry for future analytics
  emitTelemetry({
    name: 'api.request',
    properties: event
  });
}

