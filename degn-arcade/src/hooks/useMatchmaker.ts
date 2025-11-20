"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { socket, socketEvents, Lobby, LobbyListItem, Player } from '@/lib/socket';
import { 
  checkSufficientBalance, 
  requestEntryTransaction, 
  submitEntryTransaction,
  getUSDEquivalent,
  connection
} from '@/lib/solana/transactions';
import { getEffectiveWalletAddress, isDevMode } from '@/lib/devWallet';

// Game configuration
export const GAME_CONFIG = {
  'coinflip': {
    name: 'Coinflip',
    minPlayers: 2,
    maxPlayers: 2,
    minEntry: 0.01,
    maxEntry: 10,
    defaultEntry: 0.1,
    type: '1v1' as const
  },
  'connect4': {
    name: 'Connect4',
    minPlayers: 2,
    maxPlayers: 2,
    minEntry: 0.01,
    maxEntry: 10,
    defaultEntry: 0.1,
    type: '1v1' as const
  },
  'sol-bird-race': {
    name: 'Sol Bird: Race Royale',
    minPlayers: 2,
    maxPlayers: 8,
    minEntry: 0.01,
    maxEntry: 10,
    defaultEntry: 0.05,
    type: 'battle-royale' as const,
    hasCustomSettings: true as const
  },
  'slither': {
    name: 'Slither (Serpent Royale)',
    minPlayers: 4,
    maxPlayers: 10,
    minEntry: 0.02,
    maxEntry: 0.02,
    defaultEntry: 0.02,
    type: 'battle-royale' as const
  },
  'agar': {
    name: 'Agar Royale',
    minPlayers: 4,
    maxPlayers: 10,
    minEntry: 0.02,
    maxEntry: 0.02,
    defaultEntry: 0.02,
    type: 'battle-royale' as const
  }
} as const;

export type GameType = keyof typeof GAME_CONFIG;

interface UseMatchmakerState {
  playerId: string | null;
  lobbies: LobbyListItem[];
  currentLobby: Lobby | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'in-lobby' | 'in-game';
  error: string | null;
  isLoading: boolean;
  showWaitingModal: boolean;
  waitingModalPlayers: number;
  waitingModalMaxPlayers: number;
  waitingModalEntryAmount: number;
}

export function useMatchmaker() {
  const { connected, publicKey, signTransaction } = useWallet();
  
  const [state, setState] = useState<UseMatchmakerState>({
    playerId: null,
    lobbies: [],
    currentLobby: null,
    status: 'disconnected',
    error: null,
    isLoading: false,
    showWaitingModal: false,
    waitingModalPlayers: 0,
    waitingModalMaxPlayers: 8,
    waitingModalEntryAmount: 0
  });

  // Ref to track latest playerId for use in event handlers
  const playerIdRef = useRef<string | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    playerIdRef.current = state.playerId;
  }, [state.playerId]);

  // Mock wallet helper - memoized to avoid dependency issues
  const getMockWallet = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('degn_wallet');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Connect to matchmaker
  const connect = useCallback((username?: string, walletAddress?: string) => {
    if (!socket) {
      console.warn('[useMatchmaker] Socket not initialized');
      return;
    }
    
    console.log('[useMatchmaker] connect() called, socket.connected:', socket.connected);
    
    // If socket is not connected, wait for connection first
    if (!socket.connected) {
      setState(prev => ({ ...prev, status: 'connecting', error: null }));
      
      // Wait for socket to connect, then join
      const onConnect = () => {
        if (!socket) return;
        
        console.log('[useMatchmaker] Socket connected, joining matchmaker...');
        
        // Use real Phantom wallet if connected, otherwise fall back to mock
        let finalUsername: string;
        let finalWalletAddress: string | undefined;
        
        if (connected && publicKey) {
          const realAddress = publicKey.toBase58();
          finalWalletAddress = getEffectiveWalletAddress(realAddress) || realAddress;
          finalUsername = username || `Player${finalWalletAddress.slice(-4)}`;
          
          if (isDevMode() && finalWalletAddress !== realAddress) {
            console.log(`🔧 Dev wallet override active: ${finalWalletAddress.slice(0, 8)}...${finalWalletAddress.slice(-4)}`);
          }
        } else {
          // Fallback to mock wallet for development
          const mockWallet = getMockWallet();
          finalUsername = username || mockWallet?.username || `Player_${Date.now().toString().slice(-4)}`;
          finalWalletAddress = walletAddress || mockWallet?.address;
        }
        
        socketEvents.playerJoin({ 
          username: finalUsername, 
          walletAddress: finalWalletAddress 
        });
        
        socket.off('connect', onConnect);
      };
      
      if (socket) {
        socket.once('connect', onConnect);
        
        // If connection fails after timeout, show error
        setTimeout(() => {
          if (socket && !socket.connected) {
            setState(prev => ({ 
              ...prev, 
              status: 'disconnected',
              error: 'Failed to connect to matchmaker. Make sure the server is running on port 3001.'
            }));
          }
        }, 10000);
      }
      
      return;
    }
    
    // Socket is already connected, join immediately
    setState(prev => ({ ...prev, status: 'connecting', error: null }));
    
    // Use real Phantom wallet if connected, otherwise fall back to mock
    let finalUsername: string;
    let finalWalletAddress: string | undefined;
    
    if (connected && publicKey) {
      const realAddress = publicKey.toBase58();
      finalWalletAddress = getEffectiveWalletAddress(realAddress) || realAddress;
      finalUsername = username || `Player${finalWalletAddress.slice(-4)}`;
      
      if (isDevMode() && finalWalletAddress !== realAddress) {
        console.log(`🔧 Dev wallet override active: ${finalWalletAddress.slice(0, 8)}...${finalWalletAddress.slice(-4)}`);
      }
    } else {
      // Fallback to mock wallet for development
      const mockWallet = getMockWallet();
      finalUsername = username || mockWallet?.username || `Player_${Date.now().toString().slice(-4)}`;
      finalWalletAddress = walletAddress || mockWallet?.address;
    }
    
    socketEvents.playerJoin({ 
      username: finalUsername, 
      walletAddress: finalWalletAddress 
    });
  }, [connected, publicKey, getMockWallet]);

  // List lobbies
  const listLobbies = useCallback(async (gameType?: GameType) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const matchmakerUrl = process.env.NEXT_PUBLIC_MATCHMAKER_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${matchmakerUrl}/lobbies`);
      if (!response.ok) throw new Error('Failed to fetch lobbies');
      
      const data = await response.json();
      let filteredLobbies = data.lobbies || [];
      
      if (gameType) {
        filteredLobbies = filteredLobbies.filter((lobby: any) => lobby.gameType === gameType);
      }
      
      setState(prev => ({ 
        ...prev, 
        lobbies: filteredLobbies.map((lobby: any) => ({
          id: lobby.id,
          gameType: lobby.gameType,
          currentPlayers: lobby.playerCount || lobby.players?.length || 0,
          maxPlayers: lobby.maxPlayers,
          entryAmount: lobby.entryAmount || 0
        })),
        isLoading: false 
      }));
      
      return filteredLobbies;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch lobbies',
        isLoading: false 
      }));
      throw error;
    }
  }, []);

  // Create lobby
  const createLobby = useCallback(async ({ 
    gameType, 
    maxPlayers, 
    entryAmount 
  }: { 
    gameType: GameType; 
    maxPlayers?: number; 
    entryAmount?: number; 
  }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const config = GAME_CONFIG[gameType];
      const finalMaxPlayers = maxPlayers || config.maxPlayers;
      const finalEntryAmount = entryAmount !== undefined ? entryAmount : config.defaultEntry;
      
      const matchmakerUrl = process.env.NEXT_PUBLIC_MATCHMAKER_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${matchmakerUrl}/create-lobby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          maxPlayers: finalMaxPlayers,
          entryAmount: finalEntryAmount
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create lobby');
      }
      
      const result = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Auto-join the created lobby
      if (result.lobby?.id) {
        socketEvents.joinLobby(result.lobby.id);
      }
      
      return result.lobby;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create lobby';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  }, []);

  // Join lobby with balance verification and payment
  const joinLobbyWithPayment = useCallback(async (lobbyId: string) => {
    if (!connected || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Ensure player has joined matchmaker first
      if (!socket || !socket.connected) {
        console.log('[useMatchmaker] Socket not connected, connecting first...');
        await new Promise<void>((resolve, reject) => {
          if (!socket) {
            reject(new Error('Socket not initialized'));
            return;
          }
          
          socket.connect();
          
          const onConnect = () => {
            socket?.off('connect', onConnect);
            socket?.off('connect_error', onError);
            resolve();
          };
          
          const onError = (error: any) => {
            socket?.off('connect', onConnect);
            socket?.off('connect_error', onError);
            reject(new Error('Failed to connect to matchmaker'));
          };
          
          socket.once('connect', onConnect);
          socket.once('connect_error', onError);
          
          setTimeout(() => {
            socket?.off('connect', onConnect);
            socket?.off('connect_error', onError);
            reject(new Error('Connection timeout'));
          }, 10000);
        });
      }
      
      // Ensure player has joined matchmaker (sent player:join)
      if (state.status === 'disconnected' || state.status === 'connecting') {
        console.log('[useMatchmaker] Player not in matchmaker, joining...');
        connect();
        // Wait a bit for player:join to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get lobby details to check entry amount
      const lobby = state.lobbies.find(l => l.id === lobbyId);
      if (!lobby) {
        throw new Error('Lobby not found');
      }

      // Check balance if entry fee required
      if (lobby.entryAmount > 0) {
        const balanceCheck = await checkSufficientBalance(publicKey, lobby.entryAmount);
        
        if (!balanceCheck.sufficient) {
          throw new Error(
            `Insufficient balance. Required: ${lobby.entryAmount} SOL, Available: ${balanceCheck.balance.toFixed(4)} SOL`
          );
        }

        // Request transaction from frontend API
        const response = await fetch('/api/pay-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lobbyId, 
            playerAddress: publicKey.toBase58(),
            entryAmount: lobby.entryAmount
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create entry transaction');
        }

        const { transaction: serializedTx } = await response.json();

        // Deserialize and sign transaction
        const transaction = Transaction.from(Buffer.from(serializedTx, 'base64'));
        const signedTransaction = await signTransaction(transaction);

        // Send transaction to network
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        // Submit to frontend API for verification
        const verifyResponse = await fetch('/api/pay-entry', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lobbyId, 
            signature, 
            playerAddress: publicKey.toBase58(),
            entryAmount: lobby.entryAmount
          }),
        });

        if (!verifyResponse.ok) {
          const error = await verifyResponse.json();
          throw new Error(error.error || 'Failed to verify entry transaction');
        }
      }

      // Join lobby via socket
      socketEvents.joinLobby(lobbyId);
      
      setState(prev => ({ ...prev, isLoading: false }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join lobby';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  }, [connected, publicKey, signTransaction, state.lobbies, state.status, connect]);

  // Find and join best match
  const findAndJoinBestMatch = useCallback(async ({ 
    gameType, 
    entryAmount 
  }: { 
    gameType: GameType; 
    entryAmount?: number; 
  }) => {
    try {
      const lobbies = await listLobbies(gameType);
      const config = GAME_CONFIG[gameType];
      const targetAmount = entryAmount !== undefined ? entryAmount : config.defaultEntry;
      
      // Find suitable lobby
      const suitableLobby = lobbies.find((lobby: any) => 
        lobby.gameType === gameType &&
        lobby.currentPlayers < lobby.maxPlayers &&
        lobby.status === 'waiting' &&
        (lobby.entryAmount === targetAmount || Math.abs(lobby.entryAmount - targetAmount) < 0.001)
      );
      
      if (suitableLobby) {
        await joinLobbyWithPayment(suitableLobby.id);
        return suitableLobby;
      } else {
        // Create new lobby if none found
        return await createLobby({ gameType, entryAmount: targetAmount });
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to find match' 
      }));
      throw error;
    }
  }, [listLobbies, createLobby, joinLobbyWithPayment]);


  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    const handleConnect = () => {
      setState(prev => ({ ...prev, status: 'connected', error: null }));
    };

    const handleDisconnect = () => {
      setState(prev => ({ ...prev, status: 'disconnected', playerId: null, currentLobby: null }));
    };

    const handleWelcome = (data: { playerId: string; message: string; availableGames: string[] }) => {
      setState(prev => ({ ...prev, playerId: data.playerId, status: 'connected' }));
    };

    const handleLobbyJoined = (data: any) => {
      const playerCount = data.players?.length || 0;
      setState(prev => ({ 
        ...prev, 
        status: 'in-lobby',
        currentLobby: {
          id: data.lobbyId,
          gameType: data.gameType,
          players: data.players || [],
          maxPlayers: data.maxPlayers,
          status: data.status || 'waiting',
          createdAt: new Date(),
          createdBy: 'unknown',
          entryAmount: data.entryAmount
        },
        showWaitingModal: true,
        waitingModalPlayers: playerCount,
        waitingModalMaxPlayers: data.maxPlayers || 8,
        waitingModalEntryAmount: data.entryAmount || 0
      }));
    };

    const handleLobbyReady = (data: { lobbyId: string; gameType: string; players: Player[] }) => {
      setState(prev => ({ ...prev, status: 'in-lobby' }));
      console.log('🚀 Lobby ready, game starting soon...', data);
    };

    // Guard to prevent multiple redirects (use ref to persist across renders)
    const redirectGuardRef = { current: false };
    
    const handleGameStart = (data: { 
      lobbyId: string; 
      gameType: string; 
      players: Player[];
      entryAmount?: number;
      maxPlayers: number;
      startTime: number;
    }) => {
      console.log('[useMatchmaker] 📨 Received game:start event:', data);
      
      // Prevent multiple redirects
      if (redirectGuardRef.current) {
        console.log('⚠️ Already redirecting, ignoring duplicate game-start event');
        return;
      }
      
      // Prevent redirect if already on game page
      if (typeof window !== 'undefined' && window.location.pathname.includes('/play/')) {
        console.log('⚠️ Already on game page, ignoring redirect');
        return;
      }
      
      setState(prev => ({ 
        ...prev, 
        status: 'in-game',
        showWaitingModal: false // Close waiting modal when game starts
      }));
      
      console.log('🎮 Game starting! Redirecting to game...', data);
      
      // Redirect to game page based on game type
      if (typeof window !== 'undefined') {
        redirectGuardRef.current = true;
        
        const gameRoutes: Record<string, string> = {
          'sol-bird': '/play/sol-bird',
          'sol-bird-race': '/play/sol-bird',
          'coinflip': '/play/coinflip', 
          'connect4': '/play/connect4',
          'slither': '/play/slither',
          'agar': '/play/agar'
        };
        
        const route = gameRoutes[data.gameType] || `/game/${data.lobbyId}`;
        
        // Build query params
        // Use matchKey from backend if provided, otherwise fallback to lobbyId
        const matchKey = (data as any).matchKey || data.lobbyId;
        
        // Find current player's ID from socket or ref (to avoid dependency issues)
        const currentPlayerId = playerIdRef.current || data.players.find(p => p.id === socket?.id)?.id || data.players[0]?.id || '';
        const currentPlayer = data.players.find(p => p.id === currentPlayerId || p.socketId === socket?.id) || data.players[0];
        
        // Get Socket.IO URL (HTTP/HTTPS, not WebSocket)
        const getSocketIOUrl = () => {
          const envUrl = process.env.NEXT_PUBLIC_MATCHMAKER_URL;
          if (envUrl) return envUrl;
          
          // Fallback for production
          if (typeof window !== 'undefined' && window.location.hostname === 'degn-gg.vercel.app') {
            return 'https://degn-gg-1.onrender.com';
          }
          
          return 'http://localhost:3001';
        };
        
        const params = new URLSearchParams({
          lobbyId: data.lobbyId,
          playerId: currentPlayerId,
          username: currentPlayer?.username || 'Player',
          entry: String(data.entryAmount || 0),
          players: String(data.players.length),
          matchKey: matchKey, // Use matchKey from backend event
          wsUrl: getSocketIOUrl() // Socket.IO URL (HTTP/HTTPS)
        });
        
        const url = `${route}?${params.toString()}`;
        
        console.log('[useMatchmaker] 🚀 Redirecting to game:', url);
        
        // Always use same-window navigation (no new tabs)
        // Small delay to ensure state is updated
        setTimeout(() => {
          window.location.href = url;
        }, 100);
      }
    };

    const handleLobbyUpdate = (lobby: Lobby) => {
      setState(prev => {
        const isCurrentLobby = prev.currentLobby?.id === lobby.id;
        return {
          ...prev, 
          currentLobby: isCurrentLobby ? lobby : prev.currentLobby,
          // Update waiting modal if it's the current lobby
          waitingModalPlayers: isCurrentLobby ? lobby.players.length : prev.waitingModalPlayers
        };
      });
    };

    const handleLobbyListUpdate = (lobbies: LobbyListItem[]) => {
      setState(prev => ({ ...prev, lobbies }));
    };

    const handleMatchStart = (data: any) => {
      // match-start is an alias for game:start, let handleGameStart handle it
      // This prevents duplicate redirects
      console.log('📡 Received match-start event (delegating to handleGameStart)');
      if (data && typeof data === 'object') {
        handleGameStart(data as any);
      }
      setState(prev => ({ ...prev, status: 'in-game' }));
    };

    const handleMatchEnd = (data: any) => {
      setState(prev => ({ ...prev, status: 'connected', currentLobby: null }));
    };

    const handleError = (data: { message: string }) => {
      setState(prev => ({ ...prev, error: data.message }));
    };

    // Register event listeners
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('matchmaker:welcome', handleWelcome);
      socket.on('lobby-joined', handleLobbyJoined);
      socket.on('lobby-ready', handleLobbyReady);
      socket.on('game:start', handleGameStart);
      socket.on('lobby-update', handleLobbyUpdate);
      socket.on('lobbyListUpdate', handleLobbyListUpdate);
      socket.on('match-start', handleMatchStart);
      socket.on('match-end', handleMatchEnd);
      socket.on('error', handleError);

      // Auto-connect if not connected
      if (socket.connected) {
        handleConnect();
      }
    }

    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('matchmaker:welcome', handleWelcome);
        socket.off('lobby-joined', handleLobbyJoined);
        socket.off('lobby-ready', handleLobbyReady);
        socket.off('game:start', handleGameStart);
        socket.off('lobby-update', handleLobbyUpdate);
        socket.off('lobbyListUpdate', handleLobbyListUpdate);
        socket.off('match-start', handleMatchStart);
        socket.off('match-end', handleMatchEnd);
        socket.off('error', handleError);
      }
    };
  }, []);

  // Auto-connect on mount (only once)
  useEffect(() => {
    if (!socket) return;
    
    // Only auto-connect if we're disconnected AND socket is not connected
    if (state.status === 'disconnected' && !socket.connected) {
      console.log('[useMatchmaker] Auto-connecting to matchmaker...');
      
      // Manually connect the socket first
      socket.connect();
      
      // Then call connect after a short delay to let socket establish connection
      const timer = setTimeout(() => {
        if (socket && socket.connected) {
          connect();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (socket && socket.connected && state.status === 'disconnected') {
      // Socket is already connected, just update status
      setState(prev => ({ ...prev, status: 'connected' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    ...state,
    connected,
    publicKey,
    connect,
    listLobbies,
    createLobby,
    joinLobbyWithPayment,
    findAndJoinBestMatch,
    getMockWallet,
    gameConfig: GAME_CONFIG,
    // Waiting modal state
    showWaitingModal: state.showWaitingModal,
    waitingModalPlayers: state.waitingModalPlayers,
    waitingModalMaxPlayers: state.waitingModalMaxPlayers,
    waitingModalEntryAmount: state.waitingModalEntryAmount,
    // Helper to close modal
    closeWaitingModal: () => setState(prev => ({ ...prev, showWaitingModal: false }))
  };
}