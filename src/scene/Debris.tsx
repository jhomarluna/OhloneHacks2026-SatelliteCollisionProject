import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const MAX_DEBRIS = 5000
const DEG2RAD = Math.PI / 180

function createCircleTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}
const circleTexture = createCircleTexture()

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
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100)
    geo.setDrawRange(0, 0)
    const mat = new THREE.PointsMaterial({
      size: 0.018,
      color: '#ef4444',
      sizeAttenuation: true,
      toneMapped: false,
      transparent: true,
      opacity: 0.85,
      map: circleTexture,
      alphaTest: 0.5,
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    return { points: pts, posAttr: attr }
  }, [])

  const anglesRef = useRef(new Float64Array(MAX_DEBRIS))

  // Preserve visual angles through list changes; only init new fragments
  const debrisIdMapRef = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    const oldMap = debrisIdMapRef.current
    const newArr = new Float64Array(MAX_DEBRIS)
    const newMap = new Map<string, number>()
    for (let i = 0; i < visibleDebris.length && i < MAX_DEBRIS; i++) {
      const frag = visibleDebris[i]
      const existing = oldMap.get(frag.id)
      newArr[i] = existing !== undefined ? existing : frag.angle
      newMap.set(frag.id, newArr[i])
    }
    anglesRef.current = newArr
    debrisIdMapRef.current = newMap
  }, [visibleDebris])

  // Precompute static orbital trig for debris fragments
  const staticTrig = useMemo(() => {
    const n = visibleDebris.length
    const cR = new Float64Array(n)
    const sR = new Float64Array(n)
    const cI = new Float64Array(n)
    const sI = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const frag = visibleDebris[i]
      cR[i] = Math.cos(frag.raan)
      sR[i] = Math.sin(frag.raan)
      const inc = frag.inclination * DEG2RAD
      cI[i] = Math.cos(inc)
      sI[i] = Math.sin(inc)
    }
    return { cR, sR, cI, sI }
  }, [visibleDebris])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const pos    = posAttr.array as Float32Array
    const angles = anglesRef.current
    const count  = visibleDebris.length
    const { cR, sR, cI, sI } = staticTrig

    // Keep dots visually the same size regardless of zoom
    const dist = state.camera.position.length()
    const mat = points.material as THREE.PointsMaterial
    mat.size = 0.018 * (dist / 13)

    for (let i = 0; i < count; i++) {
      const frag = visibleDebris[i]
      const band = bandMap[frag.bandId]
      if (!band) continue

      if (running) {
        angles[i] += frag.angularVelocity * timeScale * dt
        debrisIdMapRef.current.set(frag.id, angles[i])
      }

      const cosA = Math.cos(angles[i])
      const sinA = Math.sin(angles[i])
      const r    = band.radius + sinA * 0.02

      const x     = r * (cR[i] * cosA - sR[i] * sinA * cI[i])
      const y_eci = r * (sR[i] * cosA + cR[i] * sinA * cI[i])
      const z_eci = r * sinA * sI[i]

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
