import { useMemo } from 'react'
import * as THREE from 'three'
import { PALETTES } from './materials'

/** Thin calibration ring and tick marks under the feet. */
export function HudFloor({ theme }: { theme: 'dark' | 'light' }) {
  const geom = useMemo(() => {
    const pts: number[] = []
    const ring = (r: number, seg = 128) => {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2
        const a1 = ((i + 1) / seg) * Math.PI * 2
        pts.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r)
      }
    }
    ring(0.42)
    ring(0.3)
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2
      const len = i % 6 === 0 ? 0.04 : 0.018
      pts.push(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, Math.cos(a) * (0.42 + len), 0, Math.sin(a) * (0.42 + len))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  const color = PALETTES[theme].hud
  return (
    <lineSegments geometry={geom} position={[0, -0.002, 0]} raycast={() => {}}>
      <lineBasicMaterial color={color} transparent opacity={theme === 'dark' ? 0.28 : 0.35} depthWrite={false} />
    </lineSegments>
  )
}
