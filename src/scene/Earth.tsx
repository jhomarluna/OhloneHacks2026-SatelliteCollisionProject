export function Earth() {
  return (
    <mesh>
      <sphereGeometry args={[1.2, 48, 48]} />
      <meshStandardMaterial color="#3b82f6" roughness={0.9} metalness={0.05} />
    </mesh>
  )
}