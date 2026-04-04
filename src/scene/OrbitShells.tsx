import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const DEG2RAD = Math.PI / 180

// Risk-based color: grey → orange → red  (same as before, very faint)
function riskColor(risk: number, out: THREE.Color): void {
  if (risk < 0.3) {
    out.setRGB(0.2, 0.25, 0.32) // dark blue-grey
  } else if (risk < 0.7) {
    const t = (risk - 0.3) / 0.4
    out.setRGB(0.2 + t * 0.79, 0.25 + t * 0.37, 0.32 - t * 0.32)
  } else {
    const t = (risk - 0.7) / 0.3
    out.setRGB(0.99, 0.62 - t * 0.37, 0.0)
  }
}

const tempColor = new THREE.Color()

export function OrbitShells() {
  const bands = useSimStore((s) => s.bands)
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const band = bands[i]
      if (!band) return
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      riskColor(band.risk, tempColor)
      mat.color.copy(tempColor)
      // Very subtle pulsing only at high risk
      const baseOpacity = 0.06 + band.risk * 0.14
      mat.opacity = band.risk > 0.5
        ? baseOpacity + Math.sin(t * 3 + i) * 0.04
        : baseOpacity
    })
  })

  return (
    <group ref={groupRef}>
      {bands.map((band) => (
        <mesh
          key={band.id}
          // Tilt torus to the band's characteristic inclination
          rotation={[Math.PI / 2 + band.inclination * DEG2RAD, 0, 0]}
        >
          <torusGeometry args={[band.radius, 0.005, 6, 160]} />
          <meshBasicMaterial
            color="#334155"
            transparent
            opacity={0.06}
          />
        </mesh>
      ))}
    </group>
  )
}
