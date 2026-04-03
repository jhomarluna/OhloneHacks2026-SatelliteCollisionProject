import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Earth } from './Earth'

export function SceneRoot() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 2, 7], fov: 55 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 5, 5]} intensity={1.6} />
        <Stars radius={80} depth={30} count={4000} factor={4} saturation={0} fade />
        <Earth />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  )
}