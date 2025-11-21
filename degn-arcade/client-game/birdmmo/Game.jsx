import { useFrame, useRef, useState, useEffect } from '@react-three/fiber'
import Player from './Player'
import Pipes from './Pipes'
import Scenery from './Scenery'
import Network from './Network'

export default function Game() {
  const lightRef = useRef()
  const colliders = {}
  const [isAlive, setIsAlive] = useState(true)
  const [matchStarted, setMatchStarted] = useState(false)

  // Listen for match_start
  useEffect(() => {
    const handleMatchStart = (data) => {
      console.log('[Game] Match started:', data);
      setMatchStarted(true);
      setIsAlive(true);
    };

    const handleMatchEnd = (data) => {
      console.log('[Game] Match ended:', data);
      // Match end is handled by Network.js (redirects to lobby)
    };

    Network.on('game:start', handleMatchStart);
    Network.on('game:end', handleMatchEnd);

    return () => {
      Network.off('game:start', handleMatchStart);
      Network.off('game:end', handleMatchEnd);
    };
  }, []);

  // Handle player death
  const handlePlayerDeath = (deathReason) => {
    console.log('[Game] Player died:', deathReason);
    setIsAlive(false);
  };

  useFrame((state) => {
    lightRef.current.position.x = state.camera.position.x
    lightRef.current.target.position.x = state.camera.position.x
    lightRef.current.target.updateMatrixWorld()
  })

  return (
    <>
      <Scenery />
      <Pipes colliders={colliders} />
      <Player 
        colliders={colliders} 
        isAlive={isAlive && matchStarted}
        onDeath={handlePlayerDeath}
      />
      <directionalLight
        ref={lightRef}
        position={[10, 10, 10]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={40}
        shadow-camera-top={30}
      />
    </>
  )
}

