import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const dummy = new THREE.Object3D()
const MAX_VISIBLE = 2000

export function Debris() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const debris = useSimStore((s) => s.debris)
  const bands = useSimStore((s) => s.bands)
  const running = useSimStore((s) => s.running)
  const timeScale = useSimStore((s) => s.config.timeScale)

  const bandMap = useMemo(() => {
    return Object.fromEntries(bands.map((b) => [b.id, b]))
  }, [bands])

  const visibleDebris = useMemo(() => {
    return debris.slice(0, MAX_VISIBLE)
  }, [debris])

  // Local angle refs for smooth interpolation
  const anglesRef = useRef<Float32Array>(new Float32Array(0))

  useEffect(() => {
    const arr = new Float32Array(visibleDebris.length)
    for (let i = 0; i < visibleDebris.length; i++) {
      arr[i] = visibleDebris[i].angle
    }
    anglesRef.current = arr
  }, [visibleDebris.length])

  useEffect(() => {
    const angles = anglesRef.current
    for (let i = 0; i < visibleDebris.length && i < angles.length; i++) {
      angles[i] = visibleDebris[i].angle
    }
  }, [visibleDebris])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const angles = anglesRef.current
    const colorAttr = new THREE.Color()

    for (let i = 0; i < visibleDebris.length; i++) {
      const frag = visibleDebris[i]
      const band = bandMap[frag.bandId]
      if (!band) continue

      if (running) {
        angles[i] += frag.angularVelocity * timeScale * delta * 5
      }

      const r = band.radius + (Math.sin(angles[i] * 3) * 0.02) // slight radial wobble
      const inc = band.inclination
      const angle = angles[i]

      const x = Math.cos(angle) * r
      const y = Math.sin(inc) * Math.sin(angle) * r
      const z = Math.sin(angle) * Math.cos(inc) * r

      dummy.position.set(x, y, z)
      // Scale varies slightly per fragment for visual diversity
      const s = 0.6 + Math.sin(i * 7.3) * 0.4
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // Color: orange fading to red based on remaining lifetime
      const lifeFrac = frag.lifetime / 500
      colorAttr.setRGB(1.0, 0.3 + lifeFrac * 0.4, lifeFrac * 0.15)
      mesh.setColorAt(i, colorAttr)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = visibleDebris.length
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_VISIBLE]}>
      <octahedronGeometry args={[0.015, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
