import { useMemo } from 'react'
import { useSimStore } from '../store/simStore'

const DEG2RAD = Math.PI / 180

function OrbitRing({ satId }: { satId: string }) {
  const satellites = useSimStore((s) => s.satellites)
  const bands = useSimStore((s) => s.bands)

  const sat = useMemo(
    () => satellites.find((s) => s.id === satId && s.active),
    [satellites, satId]
  )
  const band = useMemo(
    () => sat ? bands.find((b) => b.id === sat.bandId) : null,
    [bands, sat]
  )

  if (!sat || !band) return null

  const radius = band.radius
  const incRad = sat.inclination * DEG2RAD
  const raan = sat.raan // already radians

  // Torus starts in XY plane.
  // Inner rotation: tilt to orbital plane (inc - π/2 around X)
  // Outer rotation: RAAN around Y (polar axis)
  return (
    <group rotation={[0, raan, 0]}>
      <group rotation={[incRad - Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[radius, 0.003, 8, 160]} />
          <meshBasicMaterial color="#ff8c00" transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  )
}

export function SimSelectedOrbit() {
  const selectedSimSatIds = useSimStore((s) => s.selectedSimSatIds)

  if (selectedSimSatIds.length === 0) return null

  return (
    <>
      {selectedSimSatIds.map((id) => (
        <OrbitRing key={id} satId={id} />
      ))}
    </>
  )
}
