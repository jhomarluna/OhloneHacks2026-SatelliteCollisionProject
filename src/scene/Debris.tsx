import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const MAX_DEBRIS = 5000
const DEG2RAD = Math.PI / 180

export function Debris() {
  const debris    = useSimStore((s) => s.debris)
  const bands     = useSimStore((s) => s.bands)
  const running   = useSimStore((s) => s.running)
  const timeScale = useSimStore((s) => s.config.timeScale)

  const bandMap = useMemo(
    () => Object.fromEntries(bands.map((b) => [b.id, b])),
    [bands]
  )

  const visibleDebris = useMemo(() => debris.slice(0, MAX_DEBRIS), [debris])

  const { points, posAttr } = useMemo(() => {
    const arr  = new Float32Array(MAX_DEBRIS * 3)
    const attr = new THREE.BufferAttribute(arr, 3)
    const geo  = new THREE.BufferGeometry()
    geo.setAttribute('position', attr)
    geo.setDrawRange(0, 0)
    const mat = new THREE.PointsMaterial({
      size: 0.018,
      color: '#ef4444',
      sizeAttenuation: true,
      toneMapped: false,
      transparent: true,
      opacity: 0.85,
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    return { points: pts, posAttr: attr }
  }, [])

  const anglesRef = useRef(new Float32Array(MAX_DEBRIS))

  useEffect(() => {
    const arr = anglesRef.current
    for (let i = 0; i < visibleDebris.length && i < MAX_DEBRIS; i++) {
      arr[i] = visibleDebris[i].angle
    }
  }, [visibleDebris])

  useFrame((_, delta) => {
    const pos    = posAttr.array as Float32Array
    const angles = anglesRef.current
    const count  = visibleDebris.length

    for (let i = 0; i < count; i++) {
      const frag = visibleDebris[i]
      const band = bandMap[frag.bandId]
      if (!band) continue

      if (running) angles[i] += frag.angularVelocity * timeScale * delta * 5

      const angle = angles[i]
      const raan  = frag.raan
      const inc   = frag.inclination * DEG2RAD
      const r     = band.radius + Math.sin(angle * 3) * 0.02

      const x     = r * (Math.cos(raan) * Math.cos(angle) - Math.sin(raan) * Math.sin(angle) * Math.cos(inc))
      const y_eci = r * (Math.sin(raan) * Math.cos(angle) + Math.cos(raan) * Math.sin(angle) * Math.cos(inc))
      const z_eci = r * Math.sin(angle) * Math.sin(inc)

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
