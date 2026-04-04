import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const DEG2RAD = Math.PI / 180
const MAX_SATS = 5000

export function Satellites() {
  const satellites = useSimStore((s) => s.satellites)
  const bands      = useSimStore((s) => s.bands)
  const running    = useSimStore((s) => s.running)
  const timeScale  = useSimStore((s) => s.config.timeScale)

  const bandMap = useMemo(
    () => new Map(bands.map((b) => [b.id, b])),
    [bands]
  )

  const activeSats = useMemo(
    () => satellites.filter((s) => s.active),
    [satellites]
  )

  const { points, posAttr } = useMemo(() => {
    const arr  = new Float32Array(MAX_SATS * 3)
    const attr = new THREE.BufferAttribute(arr, 3)
    const geo  = new THREE.BufferGeometry()
    geo.setAttribute('position', attr)
    geo.setDrawRange(0, 0)
    const mat = new THREE.PointsMaterial({
      size: 0.025,
      color: '#ffffff',
      sizeAttenuation: true,
      toneMapped: false,
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    return { points: pts, posAttr: attr }
  }, [])

  const anglesRef = useRef(new Float32Array(MAX_SATS))

  useEffect(() => {
    const arr = anglesRef.current
    for (let i = 0; i < activeSats.length && i < MAX_SATS; i++) {
      arr[i] = activeSats[i].angle
    }
  }, [activeSats])

  useFrame((_, delta) => {
    const pos    = posAttr.array as Float32Array
    const angles = anglesRef.current
    const count  = Math.min(activeSats.length, MAX_SATS)

    for (let i = 0; i < count; i++) {
      const sat  = activeSats[i]
      const band = bandMap.get(sat.bandId)
      if (!band) continue

      if (running) angles[i] += sat.angularVelocity * timeScale * delta * 5

      const angle = angles[i]
      const raan  = sat.raan
      const inc   = sat.inclination * DEG2RAD
      const r     = band.radius

      const cosR = Math.cos(raan), sinR = Math.sin(raan)
      const cosA = Math.cos(angle), sinA = Math.sin(angle)
      const cosI = Math.cos(inc),   sinI = Math.sin(inc)

      const x     = r * (cosR * cosA - sinR * sinA * cosI)
      const y_eci = r * (sinR * cosA + cosR * sinA * cosI)
      const z_eci = r * sinA * sinI

      const j = i * 3
      pos[j]     = x
      pos[j + 1] = z_eci
      pos[j + 2] = -y_eci
    }

    posAttr.needsUpdate = true
    points.geometry.setDrawRange(0, count)
  })

  return <primitive object={points} />
}
