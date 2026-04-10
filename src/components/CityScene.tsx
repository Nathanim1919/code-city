import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Environment, Grid } from "@react-three/drei";
import { useStore } from "../store/useStore";
import { Building } from "./Building";
import { DistrictGround } from "./DistrictGround";
import { DependencyEdges } from "./DependencyEdges";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrbitControlsType = any;

function Scene() {
  const cityLayout = useStore((s) => s.cityLayout);
  const showEdges = useStore((s) => s.showEdges);
  const cameraTarget = useStore((s) => s.cameraTarget);
  const controlsRef = useRef<OrbitControlsType>(null);

  // Fly to target when it changes
  useEffect(() => {
    if (cameraTarget && controlsRef.current) {
      const [x, y, z] = cameraTarget;
      controlsRef.current.target.set(x, 0, z - 10);
    }
  }, [cameraTarget]);

  if (!cityLayout) return null;

  // Center the city
  const centerX =
    cityLayout.districts.reduce((s, d) => s + d.x + d.width / 2, 0) /
    Math.max(cityLayout.districts.length, 1);
  const centerZ =
    cityLayout.districts.reduce((s, d) => s + d.z + d.depth / 2, 0) /
    Math.max(cityLayout.districts.length, 1);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-20, 20, -10]} intensity={0.5} color="#60a5fa" />

      {/* Environment */}
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />
      <fog attach="fog" args={["#0f172a", 30, 120]} />
      <Grid
        position={[centerX, -0.1, centerZ]}
        args={[200, 200]}
        cellSize={2}
        cellColor="#1e293b"
        sectionSize={10}
        sectionColor="#1e3a5f"
        fadeDistance={80}
        infiniteGrid
      />

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        target={[centerX, 0, centerZ]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={100}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Districts */}
      {cityLayout.districts.map((district) => (
        <DistrictGround key={district.id} district={district} />
      ))}

      {/* Buildings */}
      {cityLayout.buildings.map((building) => (
        <Building key={building.id} node={building} />
      ))}

      {/* Dependency edges */}
      {showEdges && <DependencyEdges edges={cityLayout.edges} />}
    </>
  );
}

export function CityScene() {
  return (
    <Canvas
      camera={{ position: [30, 25, 30], fov: 60, near: 0.1, far: 500 }}
      shadows
      style={{ background: "#0f172a" }}
      gl={{ antialias: true }}
    >
      <Scene />
    </Canvas>
  );
}
