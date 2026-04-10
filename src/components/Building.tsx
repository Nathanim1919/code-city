import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, RoundedBox } from "@react-three/drei";
import type { Mesh } from "three";
import type { LayoutNode } from "../types";
import { useStore } from "../store/useStore";

interface BuildingProps {
  node: LayoutNode;
}

const STATE_COLORS: Record<string, string> = {
  added: "#22c55e",    // green glow for new files
  modified: "#f59e0b", // amber glow for modified
  deleted: "#ef4444",  // red for deleted (fading out)
};

export function Building({ node }: BuildingProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectBuilding = useStore((s) => s.selectBuilding);
  const hoverBuilding = useStore((s) => s.hoverBuilding);
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const showLabels = useStore((s) => s.showLabels);
  const searchResults = useStore((s) => s.searchResults);
  const buildingState = useStore((s) => s.buildingStates.get(node.id));
  const timelineLoaded = useStore((s) => s.timeline.isLoaded);

  const isSelected = selectedBuilding?.id === node.id;
  const isSearchResult =
    searchResults.length > 0 && searchResults.some((r) => r.id === node.id);
  const isDimmed = searchResults.length > 0 && !isSearchResult;

  // Timeline-driven visibility
  const isHiddenByTimeline = timelineLoaded && buildingState === "deleted";
  const timelineColor = buildingState ? STATE_COLORS[buildingState] : undefined;

  // Animate scale and visibility
  useFrame(() => {
    if (!meshRef.current) return;

    // Scale animation
    let targetScaleXZ = hovered || isSelected ? 1.05 : 1;
    let targetScaleY = 1;

    if (isHiddenByTimeline) {
      targetScaleXZ = 0;
      targetScaleY = 0;
    } else if (timelineLoaded && buildingState === "added") {
      // Pulse effect for newly added files
      targetScaleXZ = 1.08;
      targetScaleY = 1.08;
    }

    const lerpSpeed = 0.08;
    const sx = meshRef.current.scale.x + (targetScaleXZ - meshRef.current.scale.x) * lerpSpeed;
    const sy = meshRef.current.scale.y + (targetScaleY - meshRef.current.scale.y) * lerpSpeed;
    const sz = meshRef.current.scale.z + (targetScaleXZ - meshRef.current.scale.z) * lerpSpeed;
    meshRef.current.scale.set(sx, sy, sz);
  });

  const emissiveColor = timelineColor
    ? timelineColor
    : isSelected
    ? "#ffffff"
    : node.color;

  const emissiveIntensity = timelineColor
    ? 0.6
    : isSelected
    ? 0.4
    : hovered
    ? 0.2
    : isSearchResult
    ? 0.3
    : 0;

  const opacity = isDimmed ? 0.2 : isHiddenByTimeline ? 0 : 1;

  return (
    <group position={[node.x, node.y, node.z]}>
      <RoundedBox
        ref={meshRef}
        args={[node.width, node.height, node.depth]}
        radius={0.05}
        smoothness={4}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          hoverBuilding(node);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          hoverBuilding(null);
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectBuilding(isSelected ? null : node);
        }}
      >
        <meshStandardMaterial
          color={node.color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>

      {/* Building label */}
      {showLabels && (hovered || isSelected) && !isHiddenByTimeline && (
        <Text
          position={[0, node.height / 2 + 0.8, 0]}
          fontSize={0.5}
          color="#e2e8f0"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {node.fileNode.name}
        </Text>
      )}

      {/* Complexity indicator - glowing top for complex files */}
      {node.fileNode.complexity > 15 && !isHiddenByTimeline && (
        <mesh position={[0, node.height / 2 + 0.1, 0]}>
          <boxGeometry args={[node.width * 0.9, 0.15, node.depth * 0.9]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Timeline state indicator ring */}
      {timelineColor && !isHiddenByTimeline && (
        <mesh position={[0, -node.height / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            Math.max(node.width, node.depth) * 0.6,
            Math.max(node.width, node.depth) * 0.75,
            32
          ]} />
          <meshStandardMaterial
            color={timelineColor}
            emissive={timelineColor}
            emissiveIntensity={1}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}
