/**
 * Thin typed wrapper around a Supabase Realtime channel used per match.
 *
 * SECURITY NOTE — v1 is a client-trust model. Every client scores its own
 * events locally and broadcasts the result; nothing on the server verifies
 * physics or star pickups. This is fine for friendly matches with logged-in
 * students. Future hardening: move authoritative scoring into an Edge Function
 * or Postgres RPC and have clients only *report* observed events for the
 * server to validate.
 */

import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { NetMessage } from './types';

export interface NetHandlers {
  onMessage: (msg: NetMessage, fromUid: string | null) => void;
  onPresenceSync?: (uids: string[]) => void;
}

export class MatchNet {
  private channel: RealtimeChannel | null = null;

  constructor(private matchId: string, private uid: string) {}

  connect(handlers: NetHandlers) {
    const ch = supabase.channel(`match:${this.matchId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: this.uid },
      },
    });

    ch.on('broadcast', { event: 'msg' }, (payload) => {
      const data = payload.payload as NetMessage;
      const fromUid = (payload as any).payload?.uid ?? null;
      handlers.onMessage(data, fromUid);
    });

    if (handlers.onPresenceSync) {
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState();
        handlers.onPresenceSync?.(Object.keys(state));
      });
    }

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ uid: this.uid, at: Date.now() });
      }
    });

    this.channel = ch;
  }

  send(msg: NetMessage) {
    if (!this.channel) return;
    void this.channel.send({ type: 'broadcast', event: 'msg', payload: msg });
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
