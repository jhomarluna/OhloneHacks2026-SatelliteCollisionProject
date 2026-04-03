import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function SceneRoot() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight />
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="blue" />
      </mesh>
      <OrbitControls />
    </Canvas>
  )
}
