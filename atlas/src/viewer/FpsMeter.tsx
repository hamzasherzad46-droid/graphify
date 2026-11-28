import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Frames per second, written straight into the HUD readout (#fps-readout), never through React state. The view draws
 * only when something changes, so the rate is measured over frames actually drawn while the model moves; when it is
 * still, the readout says so.
 */
export function FpsMeter() {
  const frames = useRef(0)
  const lastFrame = useRef(0)
  useFrame(() => {
    frames.current++
    lastFrame.current = performance.now()
  })
  useEffect(() => {
    let start = performance.now()
    const id = window.setInterval(() => {
      const el = document.getElementById('fps-readout')
      const now = performance.now()
      if (el) el.textContent = now - lastFrame.current > 700 ? 'FPS — (still)' : `FPS ${Math.round((frames.current * 1000) / (now - start))}`
      frames.current = 0
      start = now
    }, 500)
    return () => window.clearInterval(id)
  }, [])
  return null
}
