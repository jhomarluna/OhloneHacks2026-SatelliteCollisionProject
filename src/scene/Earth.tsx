import { useEffect, useState } from 'react'
import * as THREE from 'three'

const R = 2.5

// World-atlas TopoJSON — 50m resolution for crisp detail when zoomed in (~100 KB)
const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

/* ── Minimal TopoJSON → coordinate rings decoder ─────────────────────────── */

function decodeTopoJSON(topo: any): [number, number][][] {
  const { scale, translate } = topo.transform

  // 1. Decode arcs: un-delta, then un-quantize
  const arcs: [number, number][][] = topo.arcs.map((arc: number[][]) => {
    let x = 0, y = 0
    return arc.map(([dx, dy]: number[]) => {
      x += dx; y += dy
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number]
    })
  })

  const resolveArc = (idx: number): [number, number][] =>
    idx >= 0 ? arcs[idx] : [...arcs[~idx]].reverse()

  // 2. Walk every object → geometry → polygon ring → resolved arcs
  const rings: [number, number][][] = []
  for (const key of Object.keys(topo.objects)) {
    const obj = topo.objects[key]
    const geoms = obj.type === 'GeometryCollection' ? obj.geometries : [obj]

    for (const geom of geoms) {
      let arcSets: number[][][]
      if (geom.type === 'Polygon') arcSets = [geom.arcs]
      else if (geom.type === 'MultiPolygon') arcSets = geom.arcs
      else continue

      for (const polygon of arcSets) {
        for (const ring of polygon) {
          const coords: [number, number][] = []
          for (const arcIdx of ring) coords.push(...resolveArc(arcIdx))
          rings.push(coords)
        }
      }
    }
  }
  return rings
}

/* ── Canvas renderer — dark navy globe with borders + grid ───────────────── */

function buildEarthCanvas(rings: [number, number][][]): HTMLCanvasElement {
  const W = 8192, H = 4096
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  const toX = (lon: number) => ((lon + 180) / 360) * W
  const toY = (lat: number) => ((90 - lat) / 180) * H

  // Ocean background
  ctx.fillStyle = '#080e1e'
  ctx.fillRect(0, 0, W, H)

  // Helper: draw a ring, skipping segments that jump across the antimeridian
  const drawRing = (ring: [number, number][], mode: 'fill' | 'stroke') => {
    ctx.beginPath()
    let moved = false
    for (let i = 0; i < ring.length; i++) {
      const px = toX(ring[i][0]), py = toY(ring[i][1])
      // Skip segments that jump more than half the map width (antimeridian wrap)
      if (i > 0 && Math.abs(ring[i][0] - ring[i - 1][0]) > 170) {
        if (mode === 'stroke') { ctx.stroke(); ctx.beginPath() }
        ctx.moveTo(px, py)
      } else {
        moved ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
      }
      moved = true
    }
    ctx.closePath()
    mode === 'fill' ? ctx.fill() : ctx.stroke()
  }

  // Fill land polygons (slightly lighter than ocean for subtle contrast)
  ctx.fillStyle = '#0e1a30'
  for (const ring of rings) drawRing(ring, 'fill')

  // Draw coastlines + country borders
  ctx.strokeStyle = 'rgba(150, 180, 220, 0.6)'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  for (const ring of rings) drawRing(ring, 'stroke')

  // Latitude / longitude grid (pinkish tint like the reference)
  ctx.strokeStyle = 'rgba(160, 130, 180, 0.18)'
  ctx.lineWidth = 1.5
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = toY(lat)
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  // Longitude lines: clip to ±80° to avoid converging at poles
  const yTop = toY(80), yBot = toY(-80)
  for (let lon = -165; lon <= 180; lon += 15) {
    const x = toX(lon)
    ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); ctx.stroke()
  }

  return canvas
}

/* ── Component ───────────────────────────────────────────────────────────── */

export function Earth() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    fetch(TOPO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const rings = decodeTopoJSON(topo)
        const canvas = buildEarthCanvas(rings)
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 16
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.needsUpdate = true
        setTexture(tex)
      })
      .catch(() => console.warn('[Earth] Map data load failed — using fallback'))
  }, [])

  return (
    <group>
      {/* Earth sphere */}
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#080e1e" />
        )}
      </mesh>

      {/* Atmosphere glow — inner */}
      <mesh>
        <sphereGeometry args={[R * 1.05, 48, 48]} />
        <meshBasicMaterial
          color="#2060b0"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Atmosphere glow — outer */}
      <mesh>
        <sphereGeometry args={[R * 1.16, 48, 48]} />
        <meshBasicMaterial
          color="#1050a0"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}
