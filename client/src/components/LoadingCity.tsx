import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Grid, RoundedBox } from "@react-three/drei";
import type { Mesh, Group } from "three";
import { useStore } from "../store/useStore";

// Language-inspired colors for the placeholder buildings
const BUILDING_COLORS = [
  "#3178c6", // TypeScript blue
  "#f7df1e", // JavaScript yellow
  "#3776ab", // Python blue
  "#00add8", // Go cyan
  "#dea584", // Rust orange
  "#b07219", // Java brown
  "#f34b7d", // C++ pink
  "#60a5fa", // light blue
  "#a78bfa", // purple
  "#34d399", // emerald
  "#f472b6", // pink
  "#fb923c", // orange
];

interface PlaceholderBuilding {
  x: number;
  z: number;
  targetHeight: number;
  width: number;
  depth: number;
  color: string;
  delay: number; // seconds before this building starts rising
  speed: number; // rise speed multiplier
}

function generateBuildings(): PlaceholderBuilding[] {
  const buildings: PlaceholderBuilding[] = [];
  const count = 45;

  // Create a city-like grid layout with some randomness
  const gridSize = 7;
  const spacing = 3.5;
  const offsetX = -(gridSize * spacing) / 2;
  const offsetZ = -(gridSize * spacing) / 2;

  for (let i = 0; i < count; i++) {
    const gridX = i % gridSize;
    const gridZ = Math.floor(i / gridSize);

    // Add jitter to grid positions
    const jitterX = (Math.random() - 0.5) * 1.2;
    const jitterZ = (Math.random() - 0.5) * 1.2;

    const x = offsetX + gridX * spacing + jitterX;
    const z = offsetZ + gridZ * spacing + jitterZ;

    // Vary building dimensions — some tall towers, some wide low blocks
    const isTower = Math.random() > 0.6;
    const targetHeight = isTower
      ? 3 + Math.random() * 9 // tall: 3-12
      : 1 + Math.random() * 3; // short: 1-4

    const baseSize = isTower ? 0.5 + Math.random() * 0.8 : 0.8 + Math.random() * 1.5;

    buildings.push({
      x,
      z,
      targetHeight,
      width: baseSize,
      depth: baseSize,
      color: BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)],
      delay: Math.random() * 2.5, // staggered start: 0-2.5s
      speed: 0.4 + Math.random() * 0.8, // different rise speeds
    });
  }

  return buildings;
}

function RisingBuilding({ building }: { building: PlaceholderBuilding }) {
  const meshRef = useRef<Mesh>(null);
  const currentHeight = useRef(0.05);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    elapsed.current += delta;

    // Wait for delay before starting
    if (elapsed.current < building.delay) return;

    const activeTime = elapsed.current - building.delay;

    // Ease-out rise: fast at start, slows down as it reaches target
    const progress = 1 - Math.exp(-activeTime * building.speed * 1.2);
    const target = building.targetHeight * progress;

    // Smooth lerp toward target
    currentHeight.current += (target - currentHeight.current) * 0.06;

    const h = currentHeight.current;
    meshRef.current.scale.set(1, Math.max(h / building.targetHeight, 0.01), 1);
    meshRef.current.position.y = h / 2;
  });

  return (
    <group position={[building.x, 0, building.z]}>
      <RoundedBox
        ref={meshRef}
        args={[building.width, building.targetHeight, building.depth]}
        radius={0.04}
        smoothness={3}
      >
        <meshStandardMaterial
          color={building.color}
          emissive={building.color}
          emissiveIntensity={0.15}
          transparent
          opacity={0.85}
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>
    </group>
  );
}

// Pulsing glow particles that rise from the ground like construction sparks
function ConstructionParticles() {
  const groupRef = useRef<Group>(null);
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, () => ({
      x: (Math.random() - 0.5) * 24,
      z: (Math.random() - 0.5) * 24,
      speed: 0.5 + Math.random() * 1.5,
      offset: Math.random() * Math.PI * 2,
      color: BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)],
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child: any, i: number) => {
      const p = particles[i];
      const y = ((t * p.speed + p.offset) % 6);
      child.position.y = y;
      const fade = y < 1 ? y : y > 4.5 ? (6 - y) / 1.5 : 1;
      (child as any).material.opacity = fade * 0.6;
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, 0, p.z]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial
            color={p.color}
            emissive={p.color}
            emissiveIntensity={2}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

export function LoadingScene() {
  const buildings = useMemo(() => generateBuildings(), []);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[15, 25, 10]} intensity={0.8} />
      <pointLight position={[-10, 15, -10]} intensity={0.4} color="#60a5fa" />
      <pointLight position={[10, 10, 10]} intensity={0.3} color="#a78bfa" />

      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />
      <fog attach="fog" args={["#000000", 20, 80]} />

      <Grid
        position={[0, -0.1, 0]}
        args={[100, 100]}
        cellSize={2}
        cellColor="#111111"
        sectionSize={10}
        sectionColor="#1a1a1a"
        fadeDistance={50}
        infiniteGrid
      />

      {buildings.map((b, i) => (
        <RisingBuilding key={i} building={b} />
      ))}

      <ConstructionParticles />
    </>
  );
}

export function LoadingCity() {
  const progress = useStore((s) => s.repoLoading.progress);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [18, 14, 18], fov: 55, near: 0.1, far: 300 }}
        style={{ background: "#000000" }}
        gl={{ antialias: true }}
      >
        <LoadingScene />
      </Canvas>

      {/* Progress overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#60a5fa] animate-pulse" />
            <span className="text-[0.85rem] text-[#e2e8f0] font-medium tracking-wide">
              Building your city
            </span>
            <div className="w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse [animation-delay:0.3s]" />
          </div>
          {progress && (
            <span className="text-[0.75rem] text-[#94a3b8] font-mono">
              {progress}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
