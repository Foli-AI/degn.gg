import { useEffect, useRef } from 'react'

export default function useKeyboard(isAlive = true) {
  const keyMap = useRef({})

  useEffect(() => {
    const onDocumentKey = (e) => {
      // BLOCK 'R' KEY COMPLETELY (restart/respawn) - CASINO MODE
      if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[Keyboard] Restart blocked - casino mode');
        return;
      }

      // Disable all input if dead
      if (!isAlive) {
        return;
      }

      keyMap.current[e.code] = e.type === 'keydown'
    }
    document.addEventListener('keydown', onDocumentKey)
    document.addEventListener('keyup', onDocumentKey)
    return () => {
      document.removeEventListener('keydown', onDocumentKey)
      document.removeEventListener('keyup', onDocumentKey)
    }
  }, [isAlive])

  // Clear keyMap when dead
  useEffect(() => {
    if (!isAlive) {
      keyMap.current = {};
    }
  }, [isAlive])

  return keyMap.current
}

