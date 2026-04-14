import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Environment, Grid } from "@react-three/drei";
import { useStore } from "../store/useStore";
import { Building } from "./Building";
import { DistrictGround } from "./DistrictGround";
import { DependencyEdges } from "./DependencyEdges";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrbitControlsType = any;

// --- Camera animation math ---

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

interface AnimState {
  startPosition: [number, number, number];
  startTarget: [number, number, number];
  endPosition: [number, number, number];
  endTarget: [number, number, number];
  progress: number;
  duration: number;
  arcHeight: number;
}

function CameraAnimator({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsType | null> }) {
  const animRef = useRef<AnimState | null>(null);
  const lastAnimId = useRef<object | null>(null);

  useFrame((state, delta) => {
    const storeAnim = useStore.getState().cameraAnimation;
    const controls = controlsRef.current;
    if (!controls) return;

    // Detect new animation trigger
    if (storeAnim && storeAnim !== lastAnimId.current) {
      lastAnimId.current = storeAnim;
      const camera = state.camera;
      const startPos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
      const startTgt: [number, number, number] = [controls.target.x, controls.target.y, controls.target.z];

      const dx = storeAnim.endPosition[0] - startPos[0];
      const dy = storeAnim.endPosition[1] - startPos[1];
      const dz = storeAnim.endPosition[2] - startPos[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const hdx = storeAnim.endPosition[0] - startPos[0];
      const hdz = storeAnim.endPosition[2] - startPos[2];
      const horizontalDist = Math.sqrt(hdx * hdx + hdz * hdz);

      animRef.current = {
        startPosition: startPos,
        startTarget: startTgt,
        endPosition: storeAnim.endPosition,
        endTarget: storeAnim.endTarget,
        progress: 0,
        duration: Math.min(2.2, Math.max(0.6, distance * 0.035)),
        arcHeight: Math.min(25, Math.max(3, horizontalDist * 0.3)),
      };
      return;
    }

    // No animation running
    if (!animRef.current || !storeAnim) {
      animRef.current = null;
      return;
    }

    const anim = animRef.current;
    anim.progress = Math.min(1, anim.progress + delta / anim.duration);
    const t = easeInOutCubic(anim.progress);

    // Camera position with arc
    const pos = lerpVec3(anim.startPosition, anim.endPosition, t);
    const arcOffset = anim.arcHeight * 4 * t * (1 - t);
    pos[1] += arcOffset;

    // Target — simple lerp
    const tgt = lerpVec3(anim.startTarget, anim.endTarget, t);

    state.camera.position.set(pos[0], pos[1], pos[2]);
    controls.target.set(tgt[0], tgt[1], tgt[2]);
    controls.update();

    // Done
    if (anim.progress >= 1) {
      animRef.current = null;
      lastAnimId.current = null;
      useStore.setState({ cameraAnimation: null });
    }
  });

  // Cancel animation on user interaction
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      if (animRef.current) {
        animRef.current = null;
        lastAnimId.current = null;
        useStore.setState({ cameraAnimation: null });
      }
    };

    controls.addEventListener("start", handleStart);
    return () => controls.removeEventListener("start", handleStart);
  }, [controlsRef]);

  return null;
}

function Scene() {
  const cityLayout = useStore((s) => s.cityLayout);
  const showEdges = useStore((s) => s.showEdges);
  const controlsRef = useRef<OrbitControlsType>(null);

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
      <fog attach="fog" args={["#000000", 30, 120]} />
      <Grid
        position={[centerX, -0.1, centerZ]}
        args={[200, 200]}
        cellSize={2}
        cellColor="#111111"
        sectionSize={10}
        sectionColor="#1a1a1a"
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

      {/* Camera animator */}
      <CameraAnimator controlsRef={controlsRef} />

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
      style={{ background: "#000000" }}
      gl={{ antialias: true }}
    >
      <Scene />
    </Canvas>
  );
}
