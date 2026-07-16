import { EventEmitter } from 'events';

declare global {
  // eslint-disable-next-line no-var
  var __matchingEventBus: EventEmitter | undefined;
}

export const matchingEvents: EventEmitter =
  globalThis.__matchingEventBus ?? (globalThis.__matchingEventBus = new EventEmitter());

matchingEvents.setMaxListeners(0);

export function emitMatchingUpdate(payload?: Record<string, unknown>): void {
  const base = { at: Date.now(), ...payload };
  matchingEvents.emit('matching:any', base);
  if (payload && typeof payload.category === 'string') {
    matchingEvents.emit(`matching:${payload.category}`, base);
  }
}
