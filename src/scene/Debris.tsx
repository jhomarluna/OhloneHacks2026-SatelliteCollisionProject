import { useMemo } from "react";
import { useSimStore } from "../store/simStore";
export function Debris() {
    const debris = useSimStore((s) => s.debris);
    const bands = useSimStore((s) => s.bands);

    const bandRadius = useMemo(
        () => Object.fromEntries(bands.map((b) => [b.id, b.radius])),
        [bands]
    );
return (
    <group>
        {debris.map((frag) => {
            const r = bandRadius[frag.bandId] ?? 2;
            const x = Math.cos(frag.angle) * r;
            const z = Math.sin(frag.angle) * r;
            return (
                <mesh key={frag.id} position={[x, 0, z]}>
                <sphereGeometry args={[0.015, 6, 6]} />
                <meshBasicMaterial color="#f97316" />
            </mesh>
        );
        })}
    </group>
);
}