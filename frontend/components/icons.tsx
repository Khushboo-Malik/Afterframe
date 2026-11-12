// One drawn icon family (16px grid, 1.7 stroke) standing in for the ▶ ✓ ⚠ ↗ 📍 💡 glyphs.
// All decorative: the text next to each icon carries the meaning.
type P = { className?: string };
const cls = (c?: string) => (c ? `ic ${c}` : "ic");

export const PlayIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M4.6 2.9v10.2L13 8z" fill="currentColor" /></svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.6l3.2 3.1L13 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const WarnIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.3l6.4 11.2H1.6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M8 6.5v3.2M8 11.7v.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
);
export const ExtIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 10.8L11 5M6 4.6h5.4V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const PinIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.6s-4.7-4.3-4.7-7.8a4.7 4.7 0 0 1 9.4 0c0 3.5-4.7 7.8-4.7 7.8z" fill="currentColor" /><circle cx="8" cy="6.8" r="1.7" fill="var(--af-surface)" /></svg>
);
export const BulbIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M6.3 13.9h3.4M8 1.9a4.3 4.3 0 0 0-2.6 7.7c.5.4.8.9.8 1.5v.6h3.6v-.6c0-.6.3-1.1.8-1.5A4.3 4.3 0 0 0 8 1.9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const SpinIcon = ({ className }: P) => (
  <svg className={cls(`spin ${className ?? ""}`.trim())} viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2a6 6 0 1 0 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
export const MoonIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.6 5.6 0 1 0 7 7z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
);
export const SunIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
);
export const ArrowRightIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const ChevronIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
);
export const MinusIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
);
export const FitIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const YouTubeMark = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#e0281b" /><path d="M10 9v6l5.2-3z" fill="#fff" /></svg>
);
export const PlaneIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M14.2 2.1 1.9 7.2l4.6 1.6 1.6 4.6 6.1-11.3zM6.5 8.8l3.6-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
);
export const StartIcon = ({ className }: P) => (
  <svg className={cls(className)} viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3v10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M13 3.4v9.2L6.2 8z" fill="currentColor" /></svg>
);
export const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const LogoMark = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="1.5" y="3.5" width="23" height="19" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 18.5s-4.5-4.2-4.5-7.3a4.5 4.5 0 0 1 9 0c0 3.1-4.5 7.3-4.5 7.3z" fill="var(--af-accent)" /><circle cx="13" cy="11.2" r="1.6" fill="var(--af-surface)" /></svg>
);
export const BigPinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
);
export const BadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
);
