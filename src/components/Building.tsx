import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, RoundedBox } from "@react-three/drei";
import type { Mesh } from "three";
import type { LayoutNode } from "../types";
import { useStore } from "../store/useStore";

interface BuildingProps {
  node: LayoutNode;
}

export function Building({ node }: BuildingProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectBuilding = useStore((s) => s.selectBuilding);
  const hoverBuilding = useStore((s) => s.hoverBuilding);
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const showLabels = useStore((s) => s.showLabels);
  const searchResults = useStore((s) => s.searchResults);

  const isSelected = selectedBuilding?.id === node.id;
  const isSearchResult =
    searchResults.length > 0 && searchResults.some((r) => r.id === node.id);
  const isDimmed = searchResults.length > 0 && !isSearchResult;

  // Gentle hover animation
  useFrame(() => {
    if (!meshRef.current) return;
    const targetScale = hovered || isSelected ? 1.05 : 1;
    const currentScale = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(
      currentScale + (targetScale - currentScale) * 0.1
    );
  });

  const emissiveIntensity = isSelected ? 0.4 : hovered ? 0.2 : isSearchResult ? 0.3 : 0;
  const opacity = isDimmed ? 0.2 : 1;

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
          emissive={isSelected ? "#ffffff" : node.color}
          emissiveIntensity={emissiveIntensity}
          transparent={isDimmed}
          opacity={opacity}
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>

      {/* Building label */}
      {showLabels && (hovered || isSelected) && (
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
      {node.fileNode.complexity > 15 && (
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
    </group>
  );
}
