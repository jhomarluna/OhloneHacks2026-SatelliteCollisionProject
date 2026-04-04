import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'
import { computeRealSatPosition } from '../data/celestrakService'
import type { RealSatellite } from '../types/sim'

const MAX_REAL = 500

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

function RealSatPoints({ sats, selectedSatId, timeScale }: {
  sats: RealSatellite[]
  selectedSatId: string | null
  timeScale: number
}) {
  const { points, posAttr } = useMemo(() => {
    const arr  = new Float32Array(MAX_REAL * 3)
    const attr = new THREE.BufferAttribute(arr, 3)
    const geo  = new THREE.BufferGeometry()
    geo.setAttribute('position', attr)
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100)
    geo.setDrawRange(0, 0)
    const mat = new THREE.PointsMaterial({
      size: 0.028,
      color: '#ffffff',
      sizeAttenuation: true,
      toneMapped: false,
      map: circleTexture,
      alphaTest: 0.5,
      transparent: true,
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    return { points: pts, posAttr: attr }
  }, [])

  useFrame((state) => {
    const pos   = posAttr.array as Float32Array
    const now   = Date.now()
    const count = Math.min(sats.length, MAX_REAL)
    let drawn   = 0

    // Keep dots visually the same size regardless of zoom
    const dist = state.camera.position.length()
    const mat = points.material as THREE.PointsMaterial
    mat.size = 0.028 * (dist / 13)

    for (let i = 0; i < count; i++) {
      const sat = sats[i]
      if (sat.id === selectedSatId) continue
      const [x, y, z] = computeRealSatPosition(sat, now, timeScale)
      const j = drawn * 3
      pos[j]     = x
      pos[j + 1] = y
      pos[j + 2] = z
      drawn++
    }

    posAttr.needsUpdate = true
    points.geometry.setDrawRange(0, drawn)
  })

  if (sats.length === 0) return null
  return <primitive object={points} />
}

function SelectedSat({ sat, timeScale }: { sat: RealSatellite; timeScale: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current) return
    const [x, y, z] = computeRealSatPosition(sat, Date.now(), timeScale)
    meshRef.current.position.set(x, y, z)
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  )
}

export function RealSatellites() {
  const realSatellites  = useSimStore((s) => s.realSatellites)
  const selectedSatId   = useSimStore((s) => s.selectedSatId)
  const timeScale       = useSimStore((s) => s.config.timeScale)

  const activeSats = useMemo(
    () => realSatellites.filter((s) => s.active),
    [realSatellites]
  )

  const selectedSat = useMemo(
    () => activeSats.find((s) => s.id === selectedSatId),
    [activeSats, selectedSatId]
  )

  if (activeSats.length === 0) return null

  return (
    <>
      <RealSatPoints
        sats={activeSats}
        selectedSatId={selectedSatId}
        timeScale={timeScale}
      />
      {selectedSat && <SelectedSat sat={selectedSat} timeScale={timeScale} />}
    </>
  )
}
