import { Canvas } from '@react-three/fiber'
import { Environment, Stats, PerformanceMonitor } from '@react-three/drei'
import Game from './Game'
import { Suspense, useState, useEffect } from 'react'
import Network, { SERVER_URL } from './Network'

export default function App() {
  const [dpr, setDpr] = useState(0.5)
  const [connected, setConnected] = useState(false)

  // Initialize network connection on mount
  useEffect(() => {
    // Get connection parameters from URL or parent window
    const params = new URLSearchParams(window.location.search);
    const matchKey = params.get('matchKey') || params.get('lobbyId') || 'default-match';
    const playerId = params.get('playerId') || `player_${Date.now()}`;
    const username = params.get('username') || 'Player';
    const walletAddress = params.get('walletAddress') || params.get('wallet') || null;
    const entryFee = parseFloat(params.get('entryFee') || params.get('entry') || '0.1');

    // Also listen for postMessage from parent window
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'GAME_INIT') {
        const { matchKey, playerId, username, walletAddress, entryFee } = event.data;
        if (matchKey && playerId) {
          Network.connect(matchKey, playerId, username, walletAddress, entryFee)
            .then(() => {
              console.log('[App] ✅ Connected to server');
              setConnected(true);
            })
            .catch((error) => {
              console.error('[App] ❌ Connection failed:', error);
            });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Try to connect with URL parameters
    if (matchKey && playerId) {
      Network.connect(matchKey, playerId, username, walletAddress, entryFee)
        .then(() => {
          console.log('[App] ✅ Connected to server');
          setConnected(true);
        })
        .catch((error) => {
          console.error('[App] ❌ Connection failed:', error);
        });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [])

  return (
    <>
      <Suspense fallback={<Loading />}>
        <Canvas shadows dpr={dpr}>
          <PerformanceMonitor onIncline={() => setDpr(1)} onDecline={() => setDpr(0.25)}>
            <Stats />
            <Environment files="./img/rustig_koppie_puresky_1k.hdr" background />
            <Game />
          </PerformanceMonitor>
        </Canvas>
      </Suspense>
    </>
  )
}

function Loading() {
  return <img id="loader" src="./img/BirdMMO_400.png" />
}

