import { useState, useEffect } from 'react'
import { Html, Hud, OrthographicCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import Network from './Network'
import events from './events'

export default function Overlay({ model, crashed, started, keyMap, isAlive = true }) {
  const [score, setScore] = useState(0)
  const [entryFee, setEntryFee] = useState(0)
  const [potSize, setPotSize] = useState(0)
  const [houseRake, setHouseRake] = useState(0)
  const [lossAmount, setLossAmount] = useState(0)
  const [winAmount, setWinAmount] = useState(0)
  const [matchEnded, setMatchEnded] = useState(false)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isPortraight = window.matchMedia('(orientation: portrait)').matches

  // Listen for match_start to get pot info
  useEffect(() => {
    Network.on('game:start', (data) => {
      if (data.players && data.players.length > 0) {
        const entry = Network.entryFee || 0.1;
        const totalPlayers = data.players.length + (data.bots?.length || 0);
        setPotSize(entry * totalPlayers);
        setHouseRake(entry * totalPlayers * 0.10);
        setEntryFee(entry);
      }
    });

    Network.on('game:end', (data) => {
      setMatchEnded(true);
    });

    // Listen for casino events
    events.on('casino:loss', (amount) => {
      setLossAmount(amount);
    });

    events.on('casino:win', (amount) => {
      setWinAmount(amount);
    });

    return () => {
      Network.off('game:start');
      Network.off('game:end');
      events.off('casino:loss');
      events.off('casino:win');
    };
  }, []);

  useFrame(() => {
    if (model.current && isAlive) {
      let s = Math.floor((model.current.position.x - 2) / 10) + 26
      s < 0 && (s = 0)
      setScore(s)
    }
  })

  return (
    <Hud>
      <OrthographicCamera makeDefault position={[0, 0, 0]} />
      
      {/* Casino Info Box */}
      {(entryFee > 0 || potSize > 0) && (
        <Html position={[window.innerWidth / 2 - 150, window.innerHeight / 2 - 50, 0]}>
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '10px',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            <div>Entry: {entryFee.toFixed(3)} SOL</div>
            {potSize > 0 && <div>Pot: {potSize.toFixed(3)} SOL</div>}
            {houseRake > 0 && <div>Rake: {houseRake.toFixed(3)} SOL</div>}
          </div>
        </Html>
      )}

      {/* Score (only when alive) */}
      {isAlive && (
        <Html>
          <div id="score">{score}</div>
        </Html>
      )}

      {/* Death Message - Casino Mode */}
      {crashed && !matchEnded && (
        <Html>
          <div className="prompt" style={{ 
            display: 'block',
            color: '#ff4444',
            fontSize: '24px',
            textAlign: 'center'
          }}>
            <div>You Lost {lossAmount > 0 ? lossAmount.toFixed(3) : entryFee.toFixed(3)} SOL</div>
            <div style={{ fontSize: '16px', marginTop: '10px' }}>Waiting for match to finish...</div>
          </div>
        </Html>
      )}

      {/* Match End Message */}
      {matchEnded && (
        <Html>
          <div className="prompt" style={{ 
            display: 'block',
            color: winAmount > 0 ? '#44ff44' : '#ff4444',
            fontSize: '24px',
            textAlign: 'center'
          }}>
            {winAmount > 0 ? (
              <div>You Won {winAmount.toFixed(3)} SOL!</div>
            ) : (
              <div>You Lost {lossAmount > 0 ? lossAmount.toFixed(3) : entryFee.toFixed(3)} SOL</div>
            )}
            <div style={{ fontSize: '16px', marginTop: '10px' }}>Redirecting to lobby...</div>
          </div>
        </Html>
      )}

      {/* Start Prompt */}
      {!isMobile && !started && isAlive && !crashed && (
        <Html>
          <div className="prompt" style={{ display: 'block' }}>
            Press <kbd>Space</kbd> to Start
          </div>
        </Html>
      )}

      {/* Mobile Controls */}
      {isMobile && (
        isPortraight ? (
          <Html>
            <div className="prompt">Please use landscape mode</div>
          </Html>
        ) : (
          <Html>
            <button 
              className="button" 
              id="flapButton" 
              onPointerDown={() => (keyMap['Space'] = true)} 
              onPointerUp={() => (keyMap['Space'] = false)}
              disabled={!isAlive || crashed}
            >
              Flap
            </button>
            {/* NO RESTART BUTTON - CASINO MODE */}
          </Html>
        )
      )}
    </Hud>
  )
}

