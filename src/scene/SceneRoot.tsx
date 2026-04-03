import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useEffect } from 'react'
import { Earth } from './Earth'
import { OrbitShells } from './OrbitShells'
import { Satellites } from './Satellites'
import { Debris } from './Debris'
import { CollisionEffects } from './CollisionEffects'
import { useSimStore } from '../store/simStore'
import { tickSimulation } from '../sim/engine'

export function SceneRoot() {
  const running = useSimStore((s) => s.running)
  const applyTick = useSimStore((s) => s.applyTick)

  useEffect(() => {
    if (!running) return

    const timer = window.setInterval(() => {
      const state = useSimStore.getState()
      const next = tickSimulation(state)
      applyTick(next)
    }, 200)

    return () => window.clearInterval(timer)
  }, [running, applyTick])

  return (
    <Canvas camera={{ position: [0, 2.5, 7], fov: 55 }}>
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
      <OrbitShells />
      <Satellites />
      <Debris />
      <CollisionEffects />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  )
}
