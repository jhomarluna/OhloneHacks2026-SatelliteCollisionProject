import { useMemo } from 'react'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'
import { altKmToSceneRadius } from '../data/celestrakService'

const DEG = Math.PI / 180

/**
 * Draws the orbital ring + an orbital-plane highlight disc for the
 * currently-selected real satellite.
 *
 * Rotation math:
 *   1. Torus starts in XY plane.
 *   2. Rotate around X by π/2  → torus lies in XZ (equatorial plane, Y-up).
 *   3. Rotate around Y by -RAAN → align ascending node.
 *   4. Rotate around Z by inclination → tilt the plane.
 */
export function SelectedOrbit() {
  const realSatellites = useSimStore((s) => s.realSatellites)
  const selectedSatId = useSimStore((s) => s.selectedSatId)

  const sat = useMemo(
    () => realSatellites.find((s) => s.id === selectedSatId && s.active),
    [realSatellites, selectedSatId]
  )

  if (!sat) return null

  const radius = altKmToSceneRadius(sat.altitudeKm)
  const rotX = Math.PI / 2
  const rotY = -sat.raan * DEG
  const rotZ = sat.inclination * DEG

  return (
    <group rotation={new THREE.Euler(rotX, rotY, rotZ, 'XYZ')}>
      {/* Orbital track ring */}
      <mesh>
        <torusGeometry args={[radius, 0.004, 8, 160]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.7} />
      </mesh>

      {/* Subtle orbital-plane disc */}
      <mesh>
        <ringGeometry args={[radius - 0.01, radius + 0.01, 160]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
