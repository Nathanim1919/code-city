import { useMemo } from "react";
import { QuadraticBezierLine } from "@react-three/drei";
import type { LayoutEdge } from "../types";
import { useStore } from "../store/useStore";

interface DependencyEdgesProps {
  edges: LayoutEdge[];
}

export function DependencyEdges({ edges }: DependencyEdgesProps) {
  const selectedBuilding = useStore((s) => s.selectedBuilding);

  const visibleEdges = useMemo(() => {
    if (selectedBuilding) {
      // Show only edges connected to the selected building
      return edges.filter(
        (e) =>
          e.source.id === selectedBuilding.id ||
          e.target.id === selectedBuilding.id
      );
    }
    return edges;
  }, [edges, selectedBuilding]);

  return (
    <group>
      {visibleEdges.map((edge, i) => {
        const isHighlighted =
          selectedBuilding &&
          (edge.source.id === selectedBuilding.id ||
            edge.target.id === selectedBuilding.id);

        const midY = Math.max(edge.source.height, edge.target.height) + 2;

        return (
          <QuadraticBezierLine
            key={`${edge.source.id}-${edge.target.id}-${i}`}
            start={[edge.source.x, edge.source.height + 0.1, edge.source.z]}
            end={[edge.target.x, edge.target.height + 0.1, edge.target.z]}
            mid={[
              (edge.source.x + edge.target.x) / 2,
              midY,
              (edge.source.z + edge.target.z) / 2,
            ]}
            color={isHighlighted ? "#60a5fa" : "#475569"}
            lineWidth={isHighlighted ? 2 : 0.5}
            transparent
            opacity={isHighlighted ? 0.8 : 0.15}
          />
        );
      })}
    </group>
  );
}
