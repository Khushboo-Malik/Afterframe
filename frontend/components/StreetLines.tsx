/** Faint street-map lines behind the Mapped trips page (decorative; colours from tokens, so it follows light/dark). */
export default function StreetLines() {
  return (
    <svg className="trips-bg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <path className="sl-water" d="M-60 712C190 650 372 772 600 706S1000 566 1206 626 1506 726 1660 664" />
      <g className="sl-park">
        <rect x="1170" y="642" width="170" height="92" rx="20" />
        <rect x="96" y="610" width="120" height="70" rx="16" />
        <ellipse cx="760" cy="200" rx="70" ry="40" />
      </g>
      <g className="sl-road">
        <path d="M-20 182 1620 262" />
        <path d="M262-20C302 300 222 600 332 1020" />
        <path d="M984-20 1084 1020" />
        <path d="M-20 884C400 822 900 902 1620 822" />
        <path d="M602-20C642 250 822 420 1620 472" />
      </g>
      <g className="sl-street">
        <path d="M380 300h300M380 340h300M380 380h300M380 420h300M400 290v150M450 290v150M500 290v150M550 290v150M600 290v150M650 290v150" transform="rotate(-12 520 390)" />
        <path d="M1130 300h250M1130 340h250M1130 380h250M1150 280v120M1200 280v120M1250 280v120M1300 280v120M1350 280v120" transform="rotate(8 1250 330)" />
        <path d="M60 300c60 30 120 20 170 60M80 520c80-20 140 10 200-30M1460 120c40 50 50 110 110 150M720 600c40 40 120 50 180 30M1380 560c50-20 110 0 160-40" />
      </g>
      <path className="sl-route" d="M180 420C380 300 520 520 760 360S1100 300 1340 420" />
      <g className="sl-dot">
        <circle cx="180" cy="420" r="9" />
        <circle cx="760" cy="360" r="9" />
        <circle cx="1340" cy="420" r="9" />
      </g>
    </svg>
  );
}
