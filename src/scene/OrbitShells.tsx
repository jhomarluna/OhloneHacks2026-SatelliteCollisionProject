import { useSimStore } from "../store/simStore";
export function OrbitShells() {
    const bands = useSimStore((s) => s.bands);
    return (
    <group>
        {bands.map((band) => (
            <mesh key={band.id} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[band.radius, 0.01, 8, 128]} />
                <meshBasicMaterial color={band.risk > 0.5 ? "#ef4444" : "#64748b"} />
        </mesh>
        ))}
    </group>
    );
}
