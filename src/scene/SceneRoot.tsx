import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Earth } from "./Earth";
import { OrbitShells } from "./OrbitShells";
import { Satellites } from "./Satellites";
import { Debris } from "./Debris";
import { useEffect, useMemo, useRef } from "react";
import { useSimStore } from "../store/simStore";
export function SceneRoot() {
    const running = useSimStore((s) => s.running);
    const snapshot = useSimStore((s) => ({
    bands: s.bands,
    satellites: s.satellites,
    debris: s.debris,
    config: s.config,
    metrics: s.metrics,
    history: s.history,
    events: s.events,
    status: s.status,
    running: s.running,
}));

const applyTick = useSimStore((s) => s.applyTick);

const workerRef = useRef<Worker | null>(null);
    useEffect(() => {
        const worker = new Worker(new URL("../workers/simWorker.ts",
import.meta.url), {
        type: "module",
    });
worker.onmessage = (event) => {
if (event.data.type === "TICK_RESULT") {
applyTick(event.data.payload);
}
};
    workerRef.current = worker;
    return () => worker.terminate();
}, [applyTick]);

    useEffect(() => {
        if (!running || !workerRef.current) return;
        const timer = window.setInterval(() => {
            workerRef.current?.postMessage({ type: "TICK", state: snapshot });
        }, 200);
        return () => window.clearInterval(timer);
    }, [running, snapshot]);


    return (
        <Canvas camera={{ position: [0, 2, 7], fov: 55 }}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 5, 5]} intensity={1.6} />
            <Stars radius={80} depth={30} count={4000} factor={4} saturation={0}
fade />
        <Earth />
        <OrbitShells />
        <Satellites />
        <Debris />
        <OrbitControls enablePan={false} />
        </Canvas>
    );
}