import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const PARTICLE_COUNT = 12
const EFFECT_DURATION = 1.0 // seconds

interface Burst {
  id: string
  origin: THREE.Vector3
  directions: THREE.Vector3[]
  startTime: number
}

export function CollisionEffects() {
  const collisionEffects = useSimStore((s) => s.collisionEffects)
  const burstsRef = useRef<Burst[]>([])
  const seenIdsRef = useRef<Set<string>>(new Set())

  // Create new bursts when new collision effects appear
  const currentIds = useMemo(() => new Set(collisionEffects.map((e) => e.id)), [collisionEffects])

  // Check for new effects each frame
  useFrame(() => {
    for (const effect of collisionEffects) {
      if (!seenIdsRef.current.has(effect.id)) {
        seenIdsRef.current.add(effect.id)
        const directions = Array.from({ length: PARTICLE_COUNT }, () => {
          return new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
          ).normalize().multiplyScalar(0.15 + Math.random() * 0.25)
        })
        burstsRef.current.push({
          id: effect.id,
          origin: new THREE.Vector3(...effect.position),
          directions,
          startTime: performance.now() / 1000,
        })
      }
    }

    // Clean up old seen IDs
    for (const id of seenIdsRef.current) {
      if (!currentIds.has(id)) {
        seenIdsRef.current.delete(id)
      }
    }
  })

  return (
    <group>
      {burstsRef.current.length > 0 && <BurstRenderer burstsRef={burstsRef} />}
      {/* Always mount renderer so it can animate */}
      <BurstRenderer burstsRef={burstsRef} />
    </group>
  )
}

function BurstRenderer({ burstsRef }: { burstsRef: React.MutableRefObject<Burst[]> }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map())

  useFrame((state) => {
    const now = state.clock.elapsedTime
    const group = groupRef.current
    if (!group) return

    const bursts = burstsRef.current
    // Remove expired bursts
    burstsRef.current = bursts.filter(
      (b) => now - b.startTime < EFFECT_DURATION
    )

    // Clean up meshes for expired bursts
    for (const [id, mesh] of meshRefs.current) {
      if (!burstsRef.current.find((b) => b.id === id)) {
        group.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        meshRefs.current.delete(id)
      }
    }

    // Create/update meshes for active bursts
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    for (const burst of burstsRef.current) {
      let mesh = meshRefs.current.get(burst.id)

      if (!mesh) {
        const geo = new THREE.SphereGeometry(0.008, 4, 4)
        const mat = new THREE.MeshBasicMaterial({ toneMapped: false })
        mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT + 1)
        meshRefs.current.set(burst.id, mesh)
        group.add(mesh)
      }

      const t = now - burst.startTime
      const progress = t / EFFECT_DURATION

      // Central flash (first instance)
      const flashScale = Math.max(0, 1 - progress * 3) * 2.5
      dummy.position.copy(burst.origin)
      dummy.scale.setScalar(flashScale)
      dummy.updateMatrix()
      mesh.setMatrixAt(0, dummy.matrix)
      color.setRGB(1, 0.9, 0.5)
      mesh.setColorAt(0, color)

      // Expanding particles
      for (let i = 0; i < burst.directions.length; i++) {
        const dir = burst.directions[i]
        const pos = burst.origin
          .clone()
          .add(dir.clone().multiplyScalar(t * 0.5))

        const fadeOut = Math.max(0, 1 - progress)
        const particleScale = fadeOut * 0.4

        dummy.position.copy(pos)
        dummy.scale.setScalar(particleScale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i + 1, dummy.matrix)

        // Orange to red fade
        color.setRGB(1.0, 0.5 * fadeOut, 0.1 * fadeOut)
        mesh.setColorAt(i + 1, color)
      }

      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.count = PARTICLE_COUNT + 1
    }
  })

  return <group ref={groupRef} />
}
