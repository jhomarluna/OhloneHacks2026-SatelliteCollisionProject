import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Earth scene radius — must match EARTH_SCENE_RADIUS in celestrakService.ts
const R = 2.5

export function Earth() {
  const wireRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (wireRef.current) {
      wireRef.current.rotation.y += delta * 0.08
    }
  })

  return (
    <group>
      {/* Core dark sphere */}
      <mesh>
        <sphereGeometry args={[R * 0.984, 48, 48]} />
        <meshBasicMaterial color="#020a18" transparent opacity={0.95} />
      </mesh>

      {/* Wireframe globe - sci-fi holographic look */}
      <group ref={wireRef}>
        {/* Primary wireframe */}
        <mesh>
          <sphereGeometry args={[R, 36, 24]} />
          <meshBasicMaterial
            color="#22d3ee"
            wireframe
            transparent
            opacity={0.25}
          />
        </mesh>

        {/* Denser wireframe for equatorial detail */}
        <mesh>
          <sphereGeometry args={[R * 1.0008, 64, 8]} />
          <meshBasicMaterial
            color="#06b6d4"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>

        {/* Latitude rings */}
        {[-0.6, -0.3, 0, 0.3, 0.6].map((y) => {
          const r = Math.sqrt(1 - y * y) * R * 1.004
          return (
            <mesh key={y} position={[0, y * R * 1.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r - 0.004, r, 128]} />
              <meshBasicMaterial
                color="#22d3ee"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          )
        })}
      </group>

      {/* Atmosphere glow - inner */}
      <mesh>
        <sphereGeometry args={[R * 1.067, 48, 48]} />
        <meshBasicMaterial
          color="#0891b2"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Atmosphere glow - outer */}
      <mesh>
        <sphereGeometry args={[R * 1.21, 48, 48]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}
