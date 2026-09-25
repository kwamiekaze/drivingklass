/**
 * The view through the Klassroom window, carried over unchanged from the
 * KleanupCrew office: clear sky, the sun in its shades, rolling hedges, the
 * grove and the flower beds. Keep this file in sync with kleanupcrew.com if the
 * garden there is ever retouched.
 */
const TREE_TONES = [
  { dark: "#35713f", base: "#478c4a", light: "#63a75a" },
  { dark: "#2f6a3c", base: "#427f46", light: "#5c9e55" },
  { dark: "#3b7a44", base: "#4f9350", light: "#6bad5f" },
] as const;

/**
 * A painted broadleaf tree for the window view: a tapered trunk that forks into
 * visible limbs, under a canopy built from overlapping leaf clusters in three
 * tones so it reads as foliage rather than a flat green circle.
 */
function WindowTree({
  position,
  scale = 1,
  tone = 0,
  flip = false,
}: {
  position: [number, number, number];
  scale?: number;
  tone?: number;
  flip?: boolean;
}) {
  const palette = TREE_TONES[tone % TREE_TONES.length] ?? TREE_TONES[0];
  const side = flip ? -1 : 1;

  return (
    <group position={position} scale={scale}>
      {/* shade pooling at the roots, so the tree sits on the grass */}
      <mesh position={[0, -0.79, -0.002]} scale={[1.8, 0.42, 1]}>
        <circleGeometry args={[0.12, 18]} />
        <meshBasicMaterial color="#2f5d38" transparent opacity={0.22} />
      </mesh>
      {/* trunk, tapering out towards the roots */}
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.028, 0.055, 0.76, 8]} />
        <meshBasicMaterial color="#7a5438" />
      </mesh>
      {/* shaded side of the trunk */}
      <mesh position={[0.019, -0.42, 0.001]}>
        <cylinderGeometry args={[0.009, 0.019, 0.76, 6]} />
        <meshBasicMaterial color="#5f3f29" />
      </mesh>
      {/* limbs reaching up into the canopy */}
      <mesh position={[-0.07 * side, -0.26, 0.002]} rotation-z={0.72 * side}>
        <cylinderGeometry args={[0.009, 0.026, 0.32, 6]} />
        <meshBasicMaterial color="#7a5438" />
      </mesh>
      <mesh position={[0.07 * side, -0.32, 0.002]} rotation-z={-0.64 * side}>
        <cylinderGeometry args={[0.008, 0.023, 0.3, 6]} />
        <meshBasicMaterial color="#6d4b31" />
      </mesh>
      {/* canopy: shaded underside */}
      <mesh position={[-0.02 * side, 0.1, 0.006]}>
        <circleGeometry args={[0.44, 24]} />
        <meshBasicMaterial color={palette.dark} />
      </mesh>
      <mesh position={[-0.29 * side, -0.05, 0.007]}>
        <circleGeometry args={[0.26, 20]} />
        <meshBasicMaterial color={palette.dark} />
      </mesh>
      <mesh position={[0.3 * side, -0.03, 0.008]}>
        <circleGeometry args={[0.28, 20]} />
        <meshBasicMaterial color={palette.dark} />
      </mesh>
      {/* canopy: mid tone */}
      <mesh position={[-0.05 * side, 0.17, 0.01]}>
        <circleGeometry args={[0.35, 22]} />
        <meshBasicMaterial color={palette.base} />
      </mesh>
      <mesh position={[0.21 * side, 0.11, 0.011]}>
        <circleGeometry args={[0.23, 18]} />
        <meshBasicMaterial color={palette.base} />
      </mesh>
      <mesh position={[-0.27 * side, 0.09, 0.012]}>
        <circleGeometry args={[0.19, 18]} />
        <meshBasicMaterial color={palette.base} />
      </mesh>
      {/* canopy: sunlit crown */}
      <mesh position={[-0.13 * side, 0.31, 0.014]}>
        <circleGeometry args={[0.2, 18]} />
        <meshBasicMaterial color={palette.light} />
      </mesh>
      <mesh position={[0.07 * side, 0.34, 0.015]}>
        <circleGeometry args={[0.13, 16]} />
        <meshBasicMaterial color={palette.light} />
      </mesh>
    </group>
  );
}

export function SunnyWindowView() {
  return (
    <group>
      {/* clear blue sky */}
      <mesh position={[0, 1.95, -1.8]}>
        <planeGeometry args={[5.4, 3.4]} />
        <meshBasicMaterial color="#8fd2f2" />
      </mesh>

      {/* Cheerful sun wearing shades, with a soft glow and rays. It sits far
          enough inside the upper right pane that the whole disc stays clear of
          the window head and jamb right across the welcome camera sweep. */}
      <group position={[0.72, 2.38, -1.68]}>
        {/* soft layered glow */}
        {[0.54, 0.47, 0.4].map((radius, index) => (
          <mesh key={radius} position={[0, 0, -0.035 + index * 0.004]}>
            <circleGeometry args={[radius, 36]} />
            <meshBasicMaterial color="#ffd489" transparent opacity={0.1} />
          </mesh>
        ))}
        {/* sun rays */}
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * 0.37, Math.sin(angle) * 0.37, -0.01]}
              rotation-z={angle}
            >
              <planeGeometry args={[0.16, 0.045]} />
              <meshBasicMaterial color="#ffd35c" transparent opacity={0.9} />
            </mesh>
          );
        })}
        {/* sun face */}
        <mesh>
          <circleGeometry args={[0.28, 32]} />
          <meshBasicMaterial color="#ffdb5c" />
        </mesh>
        {/* dark sunglasses */}
        <mesh position={[-0.095, 0.035, 0.01]}>
          <circleGeometry args={[0.075, 20]} />
          <meshBasicMaterial color="#242424" />
        </mesh>
        <mesh position={[0.095, 0.035, 0.01]}>
          <circleGeometry args={[0.075, 20]} />
          <meshBasicMaterial color="#242424" />
        </mesh>
        <mesh position={[0, 0.045, 0.01]}>
          <planeGeometry args={[0.09, 0.02]} />
          <meshBasicMaterial color="#242424" />
        </mesh>
        {/* big smile */}
        <mesh position={[0, -0.03, 0.01]} rotation-z={3.49}>
          <torusGeometry args={[0.1, 0.018, 8, 24, 2.44]} />
          <meshBasicMaterial color="#c76b1f" />
        </mesh>
      </group>
      {(
        [
          [-1.2, 2.63, 0.22],
          [-0.88, 2.69, 0.28],
          [-0.53, 2.62, 0.2],
        ] as Array<[number, number, number]>
      ).map(([x, y, radius], index) => (
        <mesh key={index} position={[x, y, -1.66]} scale={[1.45, 0.72, 1]}>
          <circleGeometry args={[radius, 20]} />
          <meshBasicMaterial color="#f8fcf4" transparent opacity={0.94} />
        </mesh>
      ))}

      {/* layered lawn and rolling hedges */}
      <mesh position={[0, 1.03, -1.67]}>
        <planeGeometry args={[5.4, 1.55]} />
        <meshBasicMaterial color="#84bd64" />
      </mesh>
      {[-1.45, -0.65, 0.85, 1.55].map((x, index) => (
        <mesh
          key={x}
          position={[x, 1.43 + (index % 2) * 0.07, -1.635 + index * 0.008]}
          scale={[1.25, 0.55, 1]}
        >
          <circleGeometry args={[0.72, 24]} />
          <meshBasicMaterial color={index % 2 ? "#5f9d57" : "#6caa5e"} />
        </mesh>
      ))}

      {/* natural midground grove with no neighboring buildings */}
      {(
        [
          { x: -1.18, y: 1.46, scale: 0.6, tone: 0, flip: false },
          { x: -0.72, y: 1.55, scale: 0.7, tone: 1, flip: true },
          { x: -0.18, y: 1.5, scale: 0.64, tone: 2, flip: false },
          { x: 0.38, y: 1.56, scale: 0.74, tone: 1, flip: false },
          { x: 0.95, y: 1.49, scale: 0.65, tone: 0, flip: true },
        ] as const
      ).map(({ x, y, scale, tone, flip }, index) => (
        <WindowTree
          key={x}
          position={[x, y, -1.585 + index * 0.02]}
          scale={scale}
          tone={tone}
          flip={flip}
        />
      ))}

      {/* clipped lawn stripes, garden stones, foreground trees and flower beds */}
      {[0.77, 0.9, 1.03].map((y) => (
        <mesh key={y} position={[0, y, -1.6]}>
          <planeGeometry args={[3.45, 0.025]} />
          <meshBasicMaterial color="#a9d582" transparent opacity={0.55} />
        </mesh>
      ))}
      {(
        [
          { x: 0.09, y: 0.58, radius: 0.105 },
          { x: 0.04, y: 0.71, radius: 0.09 },
          { x: 0.12, y: 0.82, radius: 0.075 },
        ] as const
      ).map(({ x, y, radius }) => (
        <mesh key={y} position={[x, y, -1.47]} scale={[1.55, 0.56, 1]}>
          <circleGeometry args={[radius, 16]} />
          <meshBasicMaterial color="#d9d0b7" />
        </mesh>
      ))}
      {[-1.5, 1.55].map((x, index) => (
        <WindowTree
          key={x}
          position={[x, 1.4, -1.475 + index * 0.014]}
          scale={0.92}
          tone={index ? 1 : 2}
          flip={index === 1}
        />
      ))}
      {/* Flower beds. Neighbouring beds overlap, so each one is stepped back
          further than a single bed is deep. Otherwise a bed's blossoms land on
          exactly the same plane as the next bed's foliage and the two flicker
          against each other wherever they cross. */}
      {[-1.05, -0.82, 0.78, 1.02].map((x, index) => (
        <group key={x} position={[x, 0.64, -1.44 + index * 0.05]}>
          <mesh scale={[1.3, 0.7, 1]}>
            <circleGeometry args={[0.21, 18]} />
            <meshBasicMaterial color="#336e42" />
          </mesh>
          <mesh position={[-0.07, 0.05, 0.008]} scale={[1, 0.82, 1]}>
            <circleGeometry args={[0.13, 16]} />
            <meshBasicMaterial color="#3f8449" />
          </mesh>
          <mesh position={[0.09, 0.04, 0.014]} scale={[1, 0.8, 1]}>
            <circleGeometry args={[0.11, 16]} />
            <meshBasicMaterial color="#4a9152" />
          </mesh>
          <mesh position={[-0.05, 0.1, 0.02]}>
            <circleGeometry args={[0.028, 10]} />
            <meshBasicMaterial color={index % 2 ? "#fff0ad" : "#f5a1a8"} />
          </mesh>
          <mesh position={[0.08, 0.09, 0.023]}>
            <circleGeometry args={[0.024, 10]} />
            <meshBasicMaterial color={index % 2 ? "#f5a1a8" : "#fff0ad"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
