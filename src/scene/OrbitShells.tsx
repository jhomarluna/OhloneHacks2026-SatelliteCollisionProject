import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const lowRiskColor = new THREE.Color('#334155')
const midRiskColor = new THREE.Color('#f59e0b')
const highRiskColor = new THREE.Color('#ef4444')

function lerpColor(risk: number): THREE.Color {
  if (risk < 0.3) return lowRiskColor.clone().lerp(midRiskColor, risk / 0.3)
  return midRiskColor.clone().lerp(highRiskColor, (risk - 0.3) / 0.7)
}

export function OrbitShells() {
  const bands = useSimStore((s) => s.bands)
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const band = bands[i]
      if (!band) return
      // Gentle pulsing opacity for high-risk bands
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      const color = lerpColor(band.risk)
      mat.color.copy(color)
      const baseOpacity = 0.15 + band.risk * 0.5
      mat.opacity = band.risk > 0.5
        ? baseOpacity + Math.sin(t * 3 + i) * 0.15
        : baseOpacity
    })
  })

  return (
    <group ref={groupRef}>
      {bands.map((band) => (
        <mesh
          key={band.id}
          rotation={[Math.PI / 2 + band.inclination, 0, 0]}
        >
          <torusGeometry args={[band.radius, 0.008, 8, 180]} />
          <meshBasicMaterial
            color="#334155"
            transparent
            opacity={0.15}
          />
        </mesh>
      ))}
    </group>
  )
}
