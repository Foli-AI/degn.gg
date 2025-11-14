'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Real-time room subscription hook for DEGN.gg Arcade
 * Handles room events, match ticks, eliminations, and match completion
 */

export interface RoomRealtimeEvents {
  onPlayerJoin?: (data: any) => void;
  onPlayerLeave?: (data: any) => void;
  onMatchStart?: (data: any) => void;
  onMatchTick?: (data: any) => void;
  onElimination?: (data: any) => void;
  onMatchEnd?: (data: any) => void;
  onRoomUpdate?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface UseRoomRealtimeReturn {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useRoomRealtime(
  roomId: string | null,
  events: RoomRealtimeEvents = {}
): UseRoomRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Missing Supabase configuration - realtime disabled');
      setConnectionState('error');
      return;
    }

    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 30
        }
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    if (!roomId || !supabaseRef.current) {
      return;
    }

    try {
      setConnectionState('connecting');
      setLastError(null);

      // Create room-specific channel
      const channel = supabaseRef.current.channel(`room:${roomId}`, {
        config: {
          broadcast: { self: false }
        }
      });

      // Subscribe to broadcast events
      channel
        .on('broadcast', { event: 'player_join' }, (payload) => {
          events.onPlayerJoin?.(payload.payload);
        })
        .on('broadcast', { event: 'player_leave' }, (payload) => {
          events.onPlayerLeave?.(payload.payload);
        })
        .on('broadcast', { event: 'match_start' }, (payload) => {
          events.onMatchStart?.(payload.payload);
        })
        .on('broadcast', { event: 'match_tick' }, (payload) => {
          events.onMatchTick?.(payload.payload);
        })
        .on('broadcast', { event: 'elimination' }, (payload) => {
          events.onElimination?.(payload.payload);
        })
        .on('broadcast', { event: 'match_complete' }, (payload) => {
          events.onMatchEnd?.(payload.payload);
        })
        .on('broadcast', { event: 'room_update' }, (payload) => {
          events.onRoomUpdate?.(payload.payload);
        });

      // Subscribe to database changes for room_players
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            events.onPlayerJoin?.(payload.new);
          } else if (payload.eventType === 'DELETE') {
            events.onPlayerLeave?.(payload.old);
          } else if (payload.eventType === 'UPDATE') {
            events.onRoomUpdate?.(payload.new);
          }
        }
      );

      // Subscribe to room status changes
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          events.onRoomUpdate?.(payload.new);
          
          if (payload.new.status === 'running') {
            events.onMatchStart?.(payload.new);
          }
        }
      );

      // Handle subscription status
      const subscriptionStatus = await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionState('connected');
          reconnectAttemptsRef.current = 0;
          console.log(`Connected to room:${roomId}`);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionState('error');
          setLastError('Channel subscription error');
          events.onError?.({ type: 'subscription_error', status });
          
          // Attempt reconnection
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            scheduleReconnect();
          }
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionState('error');
          setLastError('Connection timed out');
          events.onError?.({ type: 'timeout', status });
          
          // Attempt reconnection
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            scheduleReconnect();
          }
        }
      });

      channelRef.current = channel;

    } catch (error) {
      console.error('Room realtime connection error:', error);
      setConnectionState('error');
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      events.onError?.(error);
      
      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }
  }, [roomId, events, maxReconnectAttempts]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff

    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectDelay]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // Connect when roomId changes
  useEffect(() => {
    if (roomId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [roomId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionState,
    lastError,
    reconnect,
    disconnect
  };
}

/**
 * Hook for subscribing to general room updates (lobby)
 */
export function useRoomsRealtime(
  onRoomCreated?: (room: any) => void,
  onRoomUpdated?: (room: any) => void,
  onRoomCompleted?: (room: any) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return;
    }

    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
    
    const channel = supabaseRef.current.channel('public:rooms');

    // Subscribe to room table changes
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rooms'
        },
        (payload) => {
          onRoomCreated?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms'
        },
        (payload) => {
          onRoomUpdated?.(payload.new);
          
          if (payload.new.status === 'completed') {
            onRoomCompleted?.(payload.new);
          }
        }
      );

    // Subscribe to broadcast events
    channel.on('broadcast', { event: 'room_completed' }, (payload) => {
      onRoomCompleted?.(payload.payload);
    });

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [onRoomCreated, onRoomUpdated, onRoomCompleted]);

  return { isConnected };
}

