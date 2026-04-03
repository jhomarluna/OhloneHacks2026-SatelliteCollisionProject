import { useMemo } from "react";
import { useSimStore } from "../store/simStore";

export function Satellites() {
    const satellites = useSimStore((s) => s.satellites.filter((sat) =>
sat.active));
    const bands = useSimStore((s) => s.bands);

    const bandRadius = useMemo(
        () => Object.fromEntries(bands.map((b) => [b.id, b.radius])),
        [bands]
    );
    return (
    <group>
        {satellites.map((sat) => {
            const r = bandRadius[sat.bandId] ?? 2;
            const x = Math.cos(sat.angle) * r;
            const z = Math.sin(sat.angle) * r;
            return (
            <mesh key={sat.id} position={[x, 0, z]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#f8fafc" />
            </mesh>
            );
        })}
    </group>
    );
}
