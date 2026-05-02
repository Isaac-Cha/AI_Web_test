import { Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

export default function Starfield() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas camera={{ position: [0, 0, 1] }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={["#050816"]} />
        <ambientLight intensity={0.6} />
        <Stars radius={120} depth={60} count={2600} factor={3} saturation={0} fade speed={0.35} />
      </Canvas>
    </div>
  )
}

