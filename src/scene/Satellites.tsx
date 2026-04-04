import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useSimStore } from '../store/simStore'

const DEG2RAD = Math.PI / 180
const MAX_SATS = 30000

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
const HOVER_DELAY_MS = 1000
const CLOSE_ZOOM_THRESHOLD = 5
const MAX_CLOSE_LABELS = 30

export function Satellites() {
  const satellites = useSimStore((s) => s.satellites)
  const bands      = useSimStore((s) => s.bands)
  const running    = useSimStore((s) => s.running)
  const timeScale  = useSimStore((s) => s.config.timeScale)
  const selectedSimSatIds = useSimStore((s) => s.selectedSimSatIds)
  const selectSimSatellite = useSimStore((s) => s.selectSimSatellite)
  const toggleSimSatellite = useSimStore((s) => s.toggleSimSatellite)

  const selectedSet = useMemo(() => new Set(selectedSimSatIds), [selectedSimSatIds])

  const bandMap = useMemo(
    () => new Map(bands.map((b) => [b.id, b])),
    [bands]
  )

  const activeSats = useMemo(
    () => satellites.filter((s) => s.active),
    [satellites]
  )

  const indexToIdRef = useRef<string[]>([])

  const { points, posAttr } = useMemo(() => {
    const arr  = new Float32Array(MAX_SATS * 3)
    const attr = new THREE.BufferAttribute(arr, 3)
    const geo  = new THREE.BufferGeometry()
    geo.setAttribute('position', attr)
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100)
    geo.setDrawRange(0, 0)
    const mat = new THREE.PointsMaterial({
      size: 0.025,
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

  // Use Float64Array for angle accumulation to avoid precision loss at low timescales
  const anglesRef = useRef(new Float64Array(MAX_SATS))

  // Preserve visual angles through list changes (e.g. collision removes satellites).
  // Only initialize angles for satellites we haven't seen yet.
  useEffect(() => {
    const oldIdToAngle = new Map<string, number>()
    const prevIds = indexToIdRef.current
    const oldArr = anglesRef.current
    for (let i = 0; i < prevIds.length; i++) {
      oldIdToAngle.set(prevIds[i], oldArr[i])
    }
    const newArr = new Float64Array(MAX_SATS)
    for (let i = 0; i < activeSats.length && i < MAX_SATS; i++) {
      const existing = oldIdToAngle.get(activeSats[i].id)
      newArr[i] = existing !== undefined ? existing : activeSats[i].angle
    }
    anglesRef.current = newArr
  }, [activeSats])

  // Precompute static orbital trig (raan, inclination don't change per frame)
  const staticTrig = useMemo(() => {
    const n = Math.min(activeSats.length, MAX_SATS)
    const cR = new Float64Array(n)
    const sR = new Float64Array(n)
    const cI = new Float64Array(n)
    const sI = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const sat = activeSats[i]
      cR[i] = Math.cos(sat.raan)
      sR[i] = Math.sin(sat.raan)
      const inc = sat.inclination * DEG2RAD
      cI[i] = Math.cos(inc)
      sI[i] = Math.sin(inc)
    }
    return { cR, sR, cI, sI }
  }, [activeSats])

  // Track positions of selected satellites (by id)
  const selectedPosMap = useRef(new Map<string, THREE.Vector3>())
  const hoveredPosRef = useRef(new THREE.Vector3())

  // Hover state (use ref to avoid recreating onPointerMove callback on every hover change)
  const [hoveredSatId, setHoveredSatId] = useState<string | null>(null)
  const hoveredSatIdRef = useRef<string | null>(null)
  const [showHoverLabel, setShowHoverLabel] = useState(false)
  const hoverTimerRef = useRef<number | null>(null)

  // Close-zoom labels: interval picks WHICH satellites to label, useFrame updates positions at 60fps
  const [closeLabels, setCloseLabels] = useState<{ id: string; name: string }[]>([])
  const closeLabelRefs = useRef<Map<string, THREE.Group>>(new Map())
  // Reverse lookup: satellite id → buffer index, rebuilt every frame
  const idToBufferIdx = useRef(new Map<string, number>())

  useFrame((state, delta) => {
    // Clamp delta to prevent large jumps from tab switches, GC pauses, etc.
    const dt = Math.min(delta, 0.05)
    const pos    = posAttr.array as Float32Array
    const angles = anglesRef.current
    const count  = Math.min(activeSats.length, MAX_SATS)
    const idMap  = indexToIdRef.current
    const { cR, sR, cI, sI } = staticTrig

    const dist = state.camera.position.length()
    const mat = points.material as THREE.PointsMaterial
    mat.size = 0.025 * (dist / 13)

    let written = 0
    for (let i = 0; i < count; i++) {
      const sat  = activeSats[i]
      const band = bandMap.get(sat.bandId)
      if (!band) continue

      if (running) angles[i] += sat.angularVelocity * timeScale * dt

      const cosA = Math.cos(angles[i])
      const sinA = Math.sin(angles[i])
      const r    = band.radius

      const x     = r * (cR[i] * cosA - sR[i] * sinA * cI[i])
      const y_eci = r * (sR[i] * cosA + cR[i] * sinA * cI[i])
      const z_eci = r * sinA * sI[i]

      if (selectedSet.has(sat.id)) {
        let v = selectedPosMap.current.get(sat.id)
        if (!v) { v = new THREE.Vector3(); selectedPosMap.current.set(sat.id, v) }
        v.set(x, z_eci, -y_eci)
      }
      if (sat.id === hoveredSatId) {
        hoveredPosRef.current.set(x, z_eci, -y_eci)
      }

      const j = written * 3
      pos[j]     = x
      pos[j + 1] = z_eci
      pos[j + 2] = -y_eci
      idMap[written] = sat.id
      written++
    }
    idMap.length = written

    // Rebuild id → buffer index map for close-zoom label positioning
    const revMap = idToBufferIdx.current
    revMap.clear()
    for (let w = 0; w < written; w++) revMap.set(idMap[w], w)

    posAttr.needsUpdate = true
    points.geometry.setDrawRange(0, written)
  })

  // Close-zoom labels: interval picks which satellites to label
  const { camera } = useThree()

  useEffect(() => {
    const interval = setInterval(() => {
      const dist = camera.position.length()
      if (dist > CLOSE_ZOOM_THRESHOLD) { setCloseLabels(prev => prev.length === 0 ? prev : []); return }
      const camPos = camera.position
      const pos = posAttr.array as Float32Array
      const idMap = indexToIdRef.current
      const camDir = camPos.clone().normalize()
      const scored: { id: string; dist: number }[] = []
      for (let i = 0; i < idMap.length; i++) {
        const j = i * 3
        const sx = pos[j], sy = pos[j + 1], sz = pos[j + 2]
        if (sx * camDir.x + sy * camDir.y + sz * camDir.z <= 0) continue
        const dx = sx - camPos.x, dy = sy - camPos.y, dz = sz - camPos.z
        scored.push({ id: idMap[i], dist: dx*dx+dy*dy+dz*dz })
      }
      scored.sort((a, b) => a.dist - b.dist)
      setCloseLabels(scored.slice(0, MAX_CLOSE_LABELS).map((s) => ({
        id: s.id, name: s.id.replace(/^band-(\d+)-sat-/, 'SAT-$1-'),
      })))
    }, 500)
    return () => clearInterval(interval)
  }, [camera, posAttr])

  // ── Raycast ────────────────────────────────────────────────────────────
  const { gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const pointerDown = useRef<{ x: number; y: number } | null>(null)
  const mouseRef = useRef(new THREE.Vector2())

  const earthOccluder = useMemo(() => {
    const geo = new THREE.SphereGeometry(2.5, 32, 32)
    const mat = new THREE.MeshBasicMaterial({ visible: false })
    return new THREE.Mesh(geo, mat)
  }, [])

  const raycastAtMouse = useCallback((e: PointerEvent | MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    mouseRef.current.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
    const dist = camera.position.length()
    raycaster.setFromCamera(mouseRef.current, camera)
    raycaster.params.Points!.threshold = 0.02 * (dist / 13)
    const earthHits = raycaster.intersectObject(earthOccluder)
    const earthDist = earthHits.length > 0 ? earthHits[0].distance : Infinity
    const hits = raycaster.intersectObject(points)
    for (const hit of hits) {
      if (hit.index != null && hit.distance < earthDist) {
        return indexToIdRef.current[hit.index] ?? null
      }
    }
    return null
  }, [gl, camera, raycaster, points, earthOccluder])

  const onPointerDown = useCallback((e: PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY }
  }, [])

  // Click: normal = single select, Ctrl/Cmd = toggle (multi-select)
  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!pointerDown.current) return
    const dx = e.clientX - pointerDown.current.x
    const dy = e.clientY - pointerDown.current.y
    if (dx * dx + dy * dy > 25) return

    const id = raycastAtMouse(e)
    const multiKey = e.ctrlKey || e.metaKey
    if (id) {
      if (multiKey) {
        toggleSimSatellite(id)
      } else {
        selectSimSatellite(id)
      }
    } else if (!multiKey) {
      selectSimSatellite(null)
    }
  }, [raycastAtMouse, selectSimSatellite, toggleSimSatellite])

  const onPointerMove = useCallback((e: PointerEvent) => {
    const id = raycastAtMouse(e)
    if (id) {
      gl.domElement.style.cursor = 'pointer'
      if (id !== hoveredSatIdRef.current) {
        hoveredSatIdRef.current = id
        setHoveredSatId(id)
        setShowHoverLabel(false)
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = window.setTimeout(() => setShowHoverLabel(true), HOVER_DELAY_MS)
      }
    } else {
      gl.domElement.style.cursor = ''
      if (hoveredSatIdRef.current) {
        hoveredSatIdRef.current = null
        setHoveredSatId(null)
        setShowHoverLabel(false)
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      }
    }
  }, [gl, raycastAtMouse])

  useEffect(() => {
    const el = gl.domElement
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointermove', onPointerMove)
      el.style.cursor = ''
    }
  }, [gl, onPointerDown, onPointerUp, onPointerMove])

  // ── Highlights for all selected satellites ─────────────────────────────
  const pulseRef = useRef(0)
  const highlightRefs = useRef<Map<string, THREE.Mesh>>(new Map())
  const hoverHighlightRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    pulseRef.current += delta * 4
    const pulse = Math.sin(pulseRef.current) * 0.3 + 0.7

    for (const [id, mesh] of highlightRefs.current) {
      const pos = selectedPosMap.current.get(id)
      if (pos) {
        mesh.position.copy(pos)
        mesh.scale.setScalar(1 + pulse * 0.15)
      }
    }
    if (hoverHighlightRef.current && hoveredSatId && !selectedSet.has(hoveredSatId)) {
      hoverHighlightRef.current.position.copy(hoveredPosRef.current)
      const mat = hoverHighlightRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 + pulse * 0.15
    }

    // Update close-zoom label positions from live position buffer
    const posArr = posAttr.array as Float32Array
    for (const [id, group] of closeLabelRefs.current) {
      const idx = idToBufferIdx.current.get(id)
      if (idx === undefined) continue
      const j = idx * 3
      group.position.set(posArr[j], posArr[j + 1], posArr[j + 2])
    }
  })

  const hoveredName = hoveredSatId ? `SAT #${hoveredSatId.split('-').pop()}` : null

  return (
    <>
      <primitive object={points} />

      {/* Highlights + labels for all selected satellites */}
      {selectedSimSatIds.map((id) => {
        const sat = activeSats.find((s) => s.id === id)
        if (!sat) return null
        const band = bandMap.get(sat.bandId)
        const label = `SAT ${band?.altitudeKm ?? '?'}km #${id.split('-').pop()}`
        return (
          <mesh key={id} ref={(el) => { if (el) highlightRefs.current.set(id, el); else highlightRefs.current.delete(id) }}>
            <sphereGeometry args={[0.004, 8, 8]} />
            <meshBasicMaterial color="#ff8c00" toneMapped={false} transparent opacity={0.85} />
            <Html center style={{
              color: '#ff8c00', fontSize: '11px', fontWeight: 600,
              whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(0,0,0,0.8)',
              pointerEvents: 'none', transform: 'translateY(-18px)',
            }}>
              {label}
            </Html>
          </mesh>
        )
      })}

      {/* Hover highlight + label */}
      {hoveredSatId && !selectedSet.has(hoveredSatId) && (
        <mesh ref={hoverHighlightRef}>
          <sphereGeometry args={[0.003, 8, 8]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} transparent opacity={0.4} />
          {showHoverLabel && (
            <Html center style={{
              color: '#67e8f9', fontSize: '10px', fontWeight: 500,
              whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(0,0,0,0.8)',
              pointerEvents: 'none', transform: 'translateY(-14px)',
            }}>
              {hoveredName}
            </Html>
          )}
        </mesh>
      )}

      {/* Close-zoom labels — positioned at 60fps via useFrame */}
      {closeLabels.map((label) => (
        !selectedSet.has(label.id) && label.id !== hoveredSatId && (
          <group key={label.id} ref={(el) => { if (el) closeLabelRefs.current.set(label.id, el); else closeLabelRefs.current.delete(label.id) }}>
            <Html center style={{
              color: 'rgba(148,163,184,0.7)', fontSize: '9px',
              whiteSpace: 'nowrap', pointerEvents: 'none', transform: 'translateY(-10px)',
            }}>
              {label.name}
            </Html>
          </group>
        )
      ))}
    </>
  )
}
