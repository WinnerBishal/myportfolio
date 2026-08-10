/**
 * Kinematics and projection for the delta robot drawn on the home page.
 *
 * The mechanism is a real rotary delta: three actuators on a fixed base plate,
 * each driving an upper arm in its own vertical plane, with a parallelogram
 * forearm pair constraining the moving platform to stay level. Angles come from
 * the closed-form inverse solution below, not from hand-placed artwork, so the
 * drawing is geometrically consistent in every pose it is asked for.
 *
 * Shared by the page's frontmatter (which renders the resting pose at build
 * time) and the client script (which animates it), so both agree exactly.
 */

export type Vec3 = { x: number; y: number; z: number };
export type Point = { x: number; y: number };

export type DeltaConfig = {
  /** Distance from the base centre to each shoulder joint. */
  baseRadius: number;
  /** Distance from the platform centre to each wrist joint. */
  platformRadius: number;
  /** Upper arm length, shoulder to elbow. */
  bicep: number;
  /** Forearm length, elbow to wrist. */
  forearm: number;
  /** Half the spacing between the two rods of a parallelogram forearm. */
  rodOffset: number;
  /** Actuator placement around the base, in degrees. */
  phis: [number, number, number];
};

export const DELTA: DeltaConfig = {
  baseRadius: 200,
  platformRadius: 62,
  bicep: 215,
  forearm: 430,
  rodOffset: 18,
  phis: [30, 150, 270]
};

/** Platform height at rest, and the two working heights of the pick cycle. */
export const HOME: Vec3 = { x: 0, y: 0, z: -440 };
export const TRAVEL_Z = -440;
/** Chosen so the closed gripper meets a part resting on the surface. */
export const WORK_Z = -526;
export const SURFACE_Z = -600;

const DEG = Math.PI / 180;
const ISO = 30 * DEG;
const COS_ISO = Math.cos(ISO);
const SIN_ISO = Math.sin(ISO);

/** Axonometric projection: x/y recede at 30 degrees, z is screen-vertical. */
export function project(p: Vec3): Point {
  return {
    x: (p.x - p.y) * COS_ISO,
    y: (p.x + p.y) * SIN_ISO - p.z
  };
}

/** Painter's-algorithm depth; larger is nearer the viewer. */
export function depth(p: Vec3): number {
  return p.x + p.y;
}

export type ArmSolution = {
  /** Shoulder angle from horizontal, radians, positive tilting downwards. */
  theta: number;
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  /** Unit vector perpendicular to the arm plane; the rods straddle it. */
  side: Vec3;
  reachable: boolean;
};

/**
 * Inverse kinematics for one arm.
 *
 * In the arm's own frame the elbow sits at `bicep * (cos t, 0, -sin t)` from the
 * shoulder, so requiring the forearm to close the loop gives
 *   a*cos t - c*sin t = (a^2 + b^2 + c^2 + bicep^2 - forearm^2) / (2*bicep)
 * which is a single harmonic in t. The negative branch is the elbows-out
 * assembly mode that a physical delta uses.
 */
export function solveArm(target: Vec3, phiDeg: number, cfg: DeltaConfig = DELTA): ArmSolution {
  const phi = phiDeg * DEG;
  const u: Vec3 = { x: Math.cos(phi), y: Math.sin(phi), z: 0 };
  const v: Vec3 = { x: -Math.sin(phi), y: Math.cos(phi), z: 0 };

  const shoulder: Vec3 = { x: cfg.baseRadius * u.x, y: cfg.baseRadius * u.y, z: 0 };
  const wrist: Vec3 = {
    x: target.x + cfg.platformRadius * u.x,
    y: target.y + cfg.platformRadius * u.y,
    z: target.z
  };

  const a = target.x * u.x + target.y * u.y + (cfg.platformRadius - cfg.baseRadius);
  const b = target.x * v.x + target.y * v.y;
  const c = target.z;

  const k = (a * a + b * b + c * c + cfg.bicep * cfg.bicep - cfg.forearm * cfg.forearm) / (2 * cfg.bicep);
  const mag = Math.hypot(a, c);
  const ratio = mag === 0 ? 2 : k / mag;
  const reachable = Math.abs(ratio) <= 1;
  const theta = -Math.atan2(c, a) - Math.acos(Math.max(-1, Math.min(1, ratio)));

  const elbow: Vec3 = {
    x: shoulder.x + cfg.bicep * Math.cos(theta) * u.x,
    y: shoulder.y + cfg.bicep * Math.cos(theta) * u.y,
    z: -cfg.bicep * Math.sin(theta)
  };

  return { theta, shoulder, elbow, wrist, side: v, reachable };
}

function offset(p: Vec3, dir: Vec3, amount: number): Vec3 {
  return { x: p.x + dir.x * amount, y: p.y + dir.y * amount, z: p.z + dir.z * amount };
}

function line(a: Vec3, b: Vec3): string {
  const p1 = project(a);
  const p2 = project(b);
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

function polygon(points: Vec3[]): string {
  return (
    points
      .map((p, i) => {
        const s = project(p);
        return `${i === 0 ? "M" : "L"} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

export type ArmGeometry = {
  /** Painter order key. */
  depth: number;
  /** Shoulder angle in degrees, for the console readout. */
  theta: number;
  bicep: string;
  rodA: string;
  rodB: string;
  shoulder: Point;
  elbow: Point;
  wrist: Point;
};

export type Frame = {
  arms: ArmGeometry[];
  platform: string;
  platformEdge: string;
  gripperLeft: string;
  gripperRight: string;
  payload: Point;
  payloadVisible: boolean;
};

const GRIP_DROP = 34;
const GRIP_LENGTH = 40;
/** Where a held part sits between the fingers, measured from the platform. */
const GRIP_HOLD = 62;

/**
 * Full drawing geometry for one pose.
 * `grip` runs 0 (open) to 1 (closed); `payload` rides the gripper when held.
 */
export function buildFrame(
  target: Vec3,
  grip: number,
  holding: boolean,
  cfg: DeltaConfig = DELTA
): Frame {
  const arms: ArmGeometry[] = cfg.phis.map((phi) => {
    const arm = solveArm(target, phi, cfg);
    return {
      // Sorted on the shoulder, which never moves, so the painter order — and
      // therefore the DOM order — is identical in every pose.
      depth: depth(arm.shoulder),
      theta: (arm.theta * 180) / Math.PI,
      bicep: line(arm.shoulder, arm.elbow),
      rodA: line(offset(arm.elbow, arm.side, cfg.rodOffset), offset(arm.wrist, arm.side, cfg.rodOffset)),
      rodB: line(offset(arm.elbow, arm.side, -cfg.rodOffset), offset(arm.wrist, arm.side, -cfg.rodOffset)),
      shoulder: project(arm.shoulder),
      elbow: project(arm.elbow),
      wrist: project(arm.wrist)
    };
  });
  arms.sort((a, b) => a.depth - b.depth);

  const wrists = cfg.phis.map((phi) => {
    const p = phi * DEG;
    return {
      x: target.x + cfg.platformRadius * Math.cos(p),
      y: target.y + cfg.platformRadius * Math.sin(p),
      z: target.z
    };
  });

  const spread = 30 - 18 * grip;
  const tipZ = target.z - GRIP_DROP - GRIP_LENGTH;
  const fingerBase: Vec3 = { x: target.x, y: target.y, z: target.z - GRIP_DROP };
  const payloadPoint = project({ x: target.x, y: target.y, z: target.z - GRIP_HOLD });

  return {
    arms,
    platform: polygon(wrists),
    platformEdge: polygon(wrists.map((w) => ({ ...w, z: w.z - 14 }))),
    gripperLeft: [
      line(fingerBase, { ...fingerBase, x: fingerBase.x - spread }),
      line({ ...fingerBase, x: fingerBase.x - spread }, { x: fingerBase.x - spread, y: fingerBase.y, z: tipZ })
    ].join(" "),
    gripperRight: [
      line(fingerBase, { ...fingerBase, x: fingerBase.x + spread }),
      line({ ...fingerBase, x: fingerBase.x + spread }, { x: fingerBase.x + spread, y: fingerBase.y, z: tipZ })
    ].join(" "),
    payload: payloadPoint,
    payloadVisible: holding
  };
}

/** The fixed structure: base plate, actuator housings, work surface. */
export function buildStatics(cfg: DeltaConfig = DELTA) {
  // Hexagonal plate with the actuator axles at the midpoints of three alternate
  // sides, matching the built machine. A regular hexagon's side midpoints fall
  // 60 degrees apart, so alternate ones land exactly on the actuator angles and
  // the shoulder positions the kinematics already uses need no adjustment: the
  // plate's inradius simply is the base radius.
  const thickness = 30;
  const inradius = cfg.baseRadius * 1.02;
  const circumradius = inradius / Math.cos(30 * DEG);

  const plateTop = Array.from({ length: 6 }, (_, k) => {
    const p = (cfg.phis[0] - 30 + k * 60) * DEG;
    return { x: circumradius * Math.cos(p), y: circumradius * Math.sin(p), z: 0 };
  });
  const plateBottom = plateTop.map((p) => ({ ...p, z: -thickness }));

  const sides = plateTop.map((p, i) => {
    const next = plateTop[(i + 1) % plateTop.length];
    return polygon([p, next, { ...next, z: -thickness }, { ...p, z: -thickness }]);
  });

  // Each actuator shows only as its output shaft, running along the side of the
  // plate it is mounted on, through the shoulder the arm pivots about.
  const axles = cfg.phis.map((phi) => {
    const p = phi * DEG;
    const u = { x: Math.cos(p), y: Math.sin(p), z: 0 };
    const v = { x: -Math.sin(p), y: Math.cos(p), z: 0 };
    const shoulder = { x: cfg.baseRadius * u.x, y: cfg.baseRadius * u.y, z: 0 };
    const end = (sign: number) => ({
      x: shoulder.x + v.x * 74 * sign,
      y: shoulder.y + v.y * 74 * sign,
      z: 0
    });

    return {
      shaft: line(end(-1), end(1)),
      capA: project(end(-1)),
      capB: project(end(1))
    };
  });

  const half = 250;
  const surface = polygon([
    { x: -half, y: -half, z: SURFACE_Z },
    { x: half, y: -half, z: SURFACE_Z },
    { x: half, y: half, z: SURFACE_Z },
    { x: -half, y: half, z: SURFACE_Z }
  ]);

  // Hexagons in the plate's own coordinates rather than projected, for drawing
  // and clipping the console that lies in the plate plane. The console sits
  // inset from the edges so the frame — and the axles and shoulders mounted on
  // it — stays visible as a border around the screen.
  const localHex = (radius: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const p = (cfg.phis[0] - 30 + k * 60) * DEG;
      return { x: radius * Math.cos(p), y: radius * Math.sin(p) };
    })
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ") + " Z";

  const consoleInset = 20;
  const consoleInradius = inradius - consoleInset;

  // Brackets holding the screen into the frame. They sit on the three edges
  // that carry no actuator, so they never collide with an arm.
  const bezelAngles = cfg.phis.map((phi) => phi + 60);
  const bezels = bezelAngles.map((angle) => {
    const p = angle * DEG;
    const u = { x: Math.cos(p), y: Math.sin(p) };
    const v = { x: -Math.sin(p), y: Math.cos(p) };
    const at = (radial: number, lateral: number) => ({
      x: u.x * radial + v.x * lateral,
      y: u.y * radial + v.y * lateral
    });

    // Just enough overlap onto the screen lip to read as fixed to it.
    const inner = consoleInradius - 4;
    const outer = inradius + 1;
    const half = 52;
    const corners = [at(inner, -half), at(inner, half), at(outer, half * 0.78), at(outer, -half * 0.78)];

    return {
      plate:
        corners.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ") + " Z",
      bolt: at((consoleInradius + inradius) / 2, 0)
    };
  });

  return {
    plateTop: polygon(plateTop),
    plateBottom: polygon(plateBottom),
    plateLocal: localHex(circumradius),
    consoleLocal: localHex(consoleInradius / Math.cos(30 * DEG)),
    bezels,
    sides,
    axles,
    surface
  };
}

/** Conveyor lane the parts arrive on, and the bin the robot sorts them into. */
export const LANE = {
  x: -130,
  from: -300,
  to: 300,
  halfWidth: 34,
  z: SURFACE_Z
};

export const BIN = {
  x: 155,
  y: -10,
  hx: 80,
  hy: 80,
  floor: SURFACE_Z,
  height: 55
};

/** Radius of a part, in world units. */
export const ITEM_RADIUS = 17;

/** Height the gripper releases a part from, just clear of the bin rim. */
export const RELEASE_Z = BIN.floor + BIN.height + 34 + GRIP_HOLD;

function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): string {
  return polygon([a, b, c, d]);
}

/**
 * The lane and the bin, split into the faces that sit behind the parts and the
 * faces that sit in front of them, so the caller can paint parts in between.
 */
export function buildScene(cfg: DeltaConfig = DELTA) {
  const { x, from, to, halfWidth, z } = LANE;
  const rail = (offset: number) =>
    line({ x: x + offset, y: from, z }, { x: x + offset, y: to, z });

  const ties: string[] = [];
  for (let y = from; y <= to; y += 48) {
    ties.push(line({ x: x - halfWidth, y, z }, { x: x + halfWidth, y, z }));
  }

  const { hx, hy, floor, height } = BIN;
  const top = floor + height;
  const corner = (sx: number, sy: number, sz: number) => ({
    x: BIN.x + sx * hx,
    y: BIN.y + sy * hy,
    z: sz
  });

  return {
    lane: {
      rails: [rail(-halfWidth), rail(halfWidth)],
      ties,
      // A soft ground shadow so the lane reads as resting on something.
      bed: quad(
        { x: x - halfWidth, y: from, z },
        { x: x + halfWidth, y: from, z },
        { x: x + halfWidth, y: to, z },
        { x: x - halfWidth, y: to, z }
      )
    },
    bin: {
      floor: quad(corner(-1, -1, floor), corner(1, -1, floor), corner(1, 1, floor), corner(-1, 1, floor)),
      // Further from the viewer: drawn before the parts.
      back: [
        quad(corner(-1, -1, floor), corner(-1, 1, floor), corner(-1, 1, top), corner(-1, -1, top)),
        quad(corner(-1, -1, floor), corner(1, -1, floor), corner(1, -1, top), corner(-1, -1, top))
      ],
      // Nearer the viewer: drawn after the parts, and kept translucent so the
      // gripper stays visible when it reaches inside.
      front: [
        quad(corner(1, -1, floor), corner(1, 1, floor), corner(1, 1, top), corner(1, -1, top)),
        quad(corner(-1, 1, floor), corner(1, 1, floor), corner(1, 1, top), corner(-1, 1, top))
      ],
      rim: polygon([corner(-1, -1, top), corner(1, -1, top), corner(1, 1, top), corner(-1, 1, top)])
    }
  };
}
