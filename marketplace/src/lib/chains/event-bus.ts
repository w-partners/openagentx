import { EventEmitter } from 'events';

declare global {
  // eslint-disable-next-line no-var
  var __chainEventBus: EventEmitter | undefined;
}

export const chainEvents: EventEmitter =
  globalThis.__chainEventBus ?? (globalThis.__chainEventBus = new EventEmitter());

chainEvents.setMaxListeners(0);

export function emitChainUpdate(instanceId: string, payload?: Record<string, unknown>): void {
  chainEvents.emit(`chain:${instanceId}`, { at: Date.now(), ...payload });
  chainEvents.emit('chain:any', { instanceId, at: Date.now(), ...payload });
}
