import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useEffect } from 'react'
import { Earth } from './Earth'
import { Satellites } from './Satellites'
import { Debris } from './Debris'
import { CollisionEffects } from './CollisionEffects'
import { SimSelectedOrbit } from './SimSelectedOrbit'
import { useSimStore } from '../store/simStore'
import { tickSimulation } from '../sim/engine'
import { fetchLEOSatellites, fetchLEOCount } from '../data/celestrakService'

export function SceneRoot() {
  const running = useSimStore((s) => s.running)
  const applyTick = useSimStore((s) => s.applyTick)
  const setRealSatellites = useSimStore((s) => s.setRealSatellites)
  const setCelestrakStatus = useSimStore((s) => s.setCelestrakStatus)
  const reinitWithCount = useSimStore((s) => s.reinitWithCount)

  // Simulation tick loop
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      const state = useSimStore.getState()
      const next = tickSimulation(state)
      applyTick(next)
    }, 200)
    return () => window.clearInterval(timer)
  }, [running, applyTick])

  // Load real satellite data and count from CelesTrak on mount
  useEffect(() => {
    setCelestrakStatus('loading')
    fetchLEOCount().then((count) => {
      reinitWithCount(count)
    })
    fetchLEOSatellites().then((sats) => {
      setRealSatellites(sats)
    }).catch(() => {
      setCelestrakStatus('error')
    })
  }, [setRealSatellites, setCelestrakStatus, reinitWithCount])

  return (
    <Canvas camera={{ position: [0, 0, 13], fov: 50 }}>
      {/* Dark ambient + cyan-tinted directional for sci-fi feel */}
      <ambientLight intensity={0.3} color="#1e3a5f" />
      <directionalLight position={[5, 3, 5]} intensity={0.8} color="#a5f3fc" />
      <pointLight position={[-4, -2, -5]} intensity={0.3} color="#06b6d4" />

      <Stars
        radius={100}
        depth={60}
        count={6000}
        factor={3}
        saturation={0.1}
        fade
        speed={0.5}
      />

      <Earth />
      <Satellites />
      <Debris />
      <CollisionEffects />
      <SimSelectedOrbit />

      <OrbitControls
        enablePan={false}
        minDistance={2.7}
        maxDistance={30}
        autoRotate={false}
        enableDamping
        dampingFactor={0.05}
        zoomSpeed={0.15}
      />
    </Canvas>
  )
}
