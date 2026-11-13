import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { PlaceholderPart, Vec3 } from '../content/types'

/**
 * Builds simple primitive stand-ins from /content/<module>.placeholder.json so the
 * whole quiz flow works before real GLB models are added. Every mesh is named
 * after its part so highlighting by mesh name works exactly as with a GLB.
 */

const DEG = Math.PI / 180
const UP = new THREE.Vector3(0, 1, 0)

function setRotation(obj: THREE.Object3D, r?: Vec3) {
  if (r) obj.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG)
}

function mesh(name: string, geometry: THREE.BufferGeometry): THREE.Mesh {
  const m = new THREE.Mesh(geometry)
  m.name = name
  return m
}

function between(name: string, geometry: THREE.BufferGeometry, from: Vec3, to: Vec3): THREE.Mesh {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const m = mesh(name, geometry)
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize())
  return m
}

function buildPart(p: PlaceholderPart): THREE.Object3D {
  switch (p.shape) {
    case 'sphere': {
      const m = mesh(p.name, new THREE.SphereGeometry(p.radius, 28, 18))
      m.position.set(...p.position)
      if (p.scale) m.scale.set(...p.scale)
      setRotation(m, p.rotation)
      return m
    }
    case 'box': {
      const r = Math.min(...p.size) * 0.35
      const m = mesh(p.name, new RoundedBoxGeometry(p.size[0], p.size[1], p.size[2], 2, r))
      m.position.set(...p.position)
      setRotation(m, p.rotation)
      return m
    }
    case 'capsule': {
      const len = new THREE.Vector3(...p.from).distanceTo(new THREE.Vector3(...p.to))
      return between(p.name, new THREE.CapsuleGeometry(p.radius, Math.max(len - 2 * p.radius, 0.001), 6, 14), p.from, p.to)
    }
    case 'cone': {
      const m = mesh(p.name, new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 24))
      m.position.set(...p.position)
      setRotation(m, p.rotation)
      return m
    }
    case 'stack': {
      const g = new THREE.Group()
      g.name = p.name
      const step = p.height / p.count
      const geo = new THREE.CylinderGeometry(p.radius, p.radius, step * 0.72, 20)
      for (let i = 0; i < p.count; i++) {
        const m = mesh(p.name, geo)
        m.position.set(p.position[0], p.position[1] + p.height / 2 - step * (i + 0.5), p.position[2])
        g.add(m)
      }
      return g
    }
    case 'rods': {
      const g = new THREE.Group()
      g.name = p.name
      const geo = new THREE.CapsuleGeometry(p.radius, p.length - 2 * p.radius, 4, 8)
      for (let i = 0; i < p.count; i++) {
        const m = mesh(p.name, geo)
        const x = (i - (p.count - 1) / 2) * p.spacing
        m.position.set(p.position[0] + x, p.position[1] - p.length / 2, p.position[2])
        g.add(m)
      }
      setRotation(g, p.rotation)
      return g
    }
    case 'arch': {
      const m = mesh(p.name, new THREE.TorusGeometry(p.radius, p.tube, 10, 36, Math.PI))
      m.position.set(...p.position)
      m.rotation.x = Math.PI / 2 // half-ring lies flat, curving round the front (+Z)
      return m
    }
    case 'ribcage': {
      const g = new THREE.Group()
      g.name = p.name
      for (let i = 0; i < p.count; i++) {
        const t = i / Math.max(p.count - 1, 1)
        const y = p.top + (p.bottom - p.top) * t
        const swell = Math.sin(Math.min(1, t * 1.6) * (Math.PI / 2))
        const rx = p.radiusX[0] + (p.radiusX[1] - p.radiusX[0]) * swell
        const rz = p.radiusZ[0] + (p.radiusZ[1] - p.radiusZ[0]) * swell
        // True ribs reach the sternum, false ribs less far, floating ribs stop at the side.
        const gap = i < 7 ? 34 : i < 10 ? 70 : 200
        const start = (90 + gap / 2) * DEG
        const end = (450 - gap / 2) * DEG
        const pts: THREE.Vector3[] = []
        for (let k = 0; k <= 24; k++) {
          const a = start + ((end - start) * k) / 24
          const front = (Math.sin(a) + 1) / 2 // 1 at the front
          pts.push(new THREE.Vector3(rx * Math.cos(a), y - 0.035 * front, p.centerZ + rz * Math.sin(a)))
        }
        g.add(mesh(p.name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, p.tube, 6)))
      }
      return g
    }
  }
}

export function buildPlaceholder(parts: PlaceholderPart[]): THREE.Group {
  const root = new THREE.Group()
  root.name = 'placeholder'
  for (const p of parts) root.add(buildPart(p))
  return root
}
