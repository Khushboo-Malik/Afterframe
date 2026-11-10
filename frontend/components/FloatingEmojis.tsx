// Drifting, blurred travel emojis. Decorative only; the drift stops with reduced motion (globals.css).
const EMOJIS: [emoji: string, left: number, top: number, size: number, delay: number][] = [
  ["✈️", 8, 16, 34, 0],
  ["🌴", 84, 12, 40, -2],
  ["🏝️", 12, 70, 38, -4],
  ["🗺️", 88, 64, 34, -6],
  ["🍜", 30, 8, 28, -3],
  ["🏔️", 72, 84, 36, -5],
  ["⛵", 50, 90, 30, -1],
  ["🎒", 94, 36, 28, -7],
];

export default function FloatingEmojis() {
  return (
    <>
      {EMOJIS.map(([e, left, top, size, delay]) => (
        <span
          key={e}
          className="emo"
          aria-hidden="true"
          style={{ left: `${left}%`, top: `${top}%`, fontSize: size, animationDelay: `${delay}s` }}
        >
          {e}
        </span>
      ))}
    </>
  );
}
