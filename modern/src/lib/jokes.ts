/**
 * Content and timing for the console printed on the delta's base plate.
 * Jokes are kept local rather than fetched, so the page stays static.
 */
export const ROBOT_JOKES: string[] = [
  "Out of charge, so it took a holiday.",
  "A robot walks in. Orders a screwdriver.",
  "Why was it late? It took the scenic path.",
  "Told an inverse kinematics joke. Nobody solved it.",
  "Robots never panic. They have a home position.",
  "The gripper and I split. It could not let go.",
  "Bad comedians. Their timing is deterministic.",
  "The servo got promoted. Excellent feedback.",
  "I asked for speed. It picked up a part instead.",
  "Two encoders walk in. Both count it twice.",
  "Parallel robots are humble. They share the load.",
  "My robot listens well. Good sensor fusion.",
  "Never play cards with a delta. No tells.",
  "It quit stand-up. Too many hard stops.",
  "The arm skipped lunch. It was already well fed."
];

/** Characters per line, sized so a line stays inside the plate. */
export const JOKE_WRAP = 22;
/** Baseline spacing, in plate units. */
export const JOKE_LINE_HEIGHT = 30;
/**
 * Console layout in plate units. The message block grows downwards from
 * JOKE_TOP; the status rule and readout sit below it. Everything has to stay
 * inside the inset hexagon, whose inradius is 184, so the far corner of the
 * lowest line is the binding constraint.
 */
export const JOKE_TOP = -60;
export const JOKE_LEFT = -150;
export const STATUS_RULE_Y = 26;
export const STATUS_STATE_Y = 52;
export const STATUS_AXES_Y = 80;

const CHARS_PER_SECOND = 24;

/**
 * Greedy wrap to a character budget. Deterministic, so the build-time render
 * and the client-side animation lay out identically.
 */
export function wrapJoke(text: string, maxChars = JOKE_WRAP): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }

  return lines;
}

/** Baseline offset of a console line, relative to the previous one. */
export function lineOffset(index: number): number {
  return index === 0 ? JOKE_TOP : JOKE_LINE_HEIGHT;
}

export function randomJoke(): string {
  return ROBOT_JOKES[Math.floor(Math.random() * ROBOT_JOKES.length)];
}

export type ConsoleStep =
  | { kind: "type"; text: string }
  | { kind: "hold"; seconds: number }
  | { kind: "clear" };

export type ConsoleFrame = { lines: string[]; cursor: boolean };

/** Boot banner, then the joke, then a pause before the next one. */
export function consoleProgram(jokeLines: string[]): ConsoleStep[] {
  return [
    { kind: "hold", seconds: 0.4 },
    { kind: "type", text: "> DELTA-3 ONLINE" },
    { kind: "hold", seconds: 0.45 },
    { kind: "type", text: "> WELCOME" },
    { kind: "hold", seconds: 0.9 },
    { kind: "clear" },
    { kind: "hold", seconds: 0.3 },
    ...jokeLines.map((line): ConsoleStep => ({ kind: "type", text: line })),
    { kind: "hold", seconds: 5 },
    { kind: "clear" },
    { kind: "hold", seconds: 0.6 }
  ];
}

function stepDuration(step: ConsoleStep): number {
  if (step.kind === "type") return step.text.length / CHARS_PER_SECOND;
  if (step.kind === "hold") return step.seconds;
  return 0;
}

export function consoleDuration(steps: ConsoleStep[]): number {
  return steps.reduce((total, step) => total + stepDuration(step), 0);
}

/** What the console shows `seconds` into the program. */
export function consoleFrameAt(steps: ConsoleStep[], seconds: number): ConsoleFrame {
  let time = seconds;
  let lines: string[] = [];

  for (const step of steps) {
    const duration = stepDuration(step);
    if (step.kind === "type" && time < duration) {
      const revealed = Math.floor((time / duration) * step.text.length);
      return { lines: [...lines, step.text.slice(0, revealed)], cursor: true };
    }
    if (step.kind === "hold" && time < duration) {
      return { lines, cursor: true };
    }
    time -= duration;
    if (step.kind === "type") lines = [...lines, step.text];
    if (step.kind === "clear") lines = [];
  }

  return { lines, cursor: true };
}
