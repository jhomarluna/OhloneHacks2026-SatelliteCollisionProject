import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const dummy = new THREE.Object3D()
const SAT_COLOR = new THREE.Color('#a5f3fc')

export function Satellites() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const satellites = useSimStore((s) => s.satellites)
  const bands = useSimStore((s) => s.bands)
  const running = useSimStore((s) => s.running)
  const timeScale = useSimStore((s) => s.config.timeScale)

  const bandMap = useMemo(() => {
    return Object.fromEntries(bands.map((b) => [b.id, b]))
  }, [bands])

  const activeSatellites = useMemo(() => {
    return satellites.filter((sat) => sat.active)
  }, [satellites])

  // Local angle refs for smooth interpolation
  const anglesRef = useRef<Float32Array>(new Float32Array(0))

  useEffect(() => {
    const arr = new Float32Array(activeSatellites.length)
    for (let i = 0; i < activeSatellites.length; i++) {
      arr[i] = activeSatellites[i].angle
    }
    anglesRef.current = arr
  }, [activeSatellites.length])

  // Sync angles from sim state when tick updates
  useEffect(() => {
    const angles = anglesRef.current
    for (let i = 0; i < activeSatellites.length && i < angles.length; i++) {
      angles[i] = activeSatellites[i].angle
    }
  }, [activeSatellites])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const angles = anglesRef.current

    for (let i = 0; i < activeSatellites.length; i++) {
      const sat = activeSatellites[i]
      const band = bandMap[sat.bandId]
      if (!band) continue

      // Smooth angle advancement
      if (running) {
        angles[i] += sat.angularVelocity * timeScale * delta * 5
      }

      const r = band.radius
      const inc = band.inclination
      const angle = angles[i]

      const x = Math.cos(angle) * r
      const y = Math.sin(inc) * Math.sin(angle) * r
      const z = Math.sin(angle) * Math.cos(inc) * r

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.count = activeSatellites.length
  })

  const maxCount = Math.max(activeSatellites.length, 1)

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxCount]}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshBasicMaterial color={SAT_COLOR} />
    </instancedMesh>
  )
}
