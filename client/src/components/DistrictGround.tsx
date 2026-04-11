import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { BoxGeometry } from "three";
import type { District } from "../types";

interface DistrictGroundProps {
  district: District;
}

export function DistrictGround({ district }: DistrictGroundProps) {
  const edgeGeo = useMemo(
    () => new BoxGeometry(district.width, 0.02, district.depth),
    [district.width, district.depth]
  );

  return (
    <group position={[district.x + district.width / 2, -0.05, district.z + district.depth / 2]}>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[district.width, district.depth]} />
        <meshStandardMaterial
          color={district.color}
          transparent
          opacity={0.6}
          roughness={0.9}
        />
      </mesh>

      {/* District border */}
      <lineSegments>
        <edgesGeometry args={[edgeGeo]} />
        <lineBasicMaterial color="#475569" transparent opacity={0.4} />
      </lineSegments>

      {/* District label */}
      <Text
        position={[0, 0.1, -district.depth / 2 + 0.5]}
        fontSize={0.7}
        color="#64748b"
        anchorX="center"
        anchorY="bottom"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {district.name}
      </Text>
    </group>
  );
}
