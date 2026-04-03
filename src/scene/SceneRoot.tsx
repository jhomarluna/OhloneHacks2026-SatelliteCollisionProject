import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useEffect } from 'react'
import { Earth } from './Earth'
import { OrbitShells } from './OrbitShells'
import { Satellites } from './Satellites'
import { Debris } from './Debris'
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
    <Canvas camera={{ position: [0, 2, 7], fov: 55 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.6} />
      <Stars radius={80} depth={30} count={4000} factor={4} saturation={0} fade />
      <Earth />
      <OrbitShells />
      <Satellites />
      <Debris />
      <OrbitControls enablePan={false} />
    </Canvas>
  )
}