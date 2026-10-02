import type { ReactNode } from "react";

/**
 * Shared inline SVG icons. They replace Unicode/emoji characters that were used as UI icons, which render
 * differently on every operating system and are announced by screen readers as character names.
 *
 * Every icon is decorative (aria-hidden): the control that contains it must carry a text label or aria-label.
 * Colour follows `currentColor`, so icons inherit light/dark themes and hover/disabled states.
 */
export type IconName =
  // controls
  | "search" | "list" | "dice" | "bulb" | "lock" | "unlock" | "trophy" | "refresh" | "moon" | "sun"
  | "check" | "close" | "book" | "news" | "play" | "info" | "shield" | "target" | "warning" | "download"
  | "arrow-left" | "arrow-right" | "external" | "more" | "triangle" | "pulse" | "gem" | "wallet" | "folder" | "user-check"
  // shapes used by badges and scenario art
  | "diamond" | "diamond-fill" | "triangle-fill" | "pentagon" | "hexagon" | "hexagon-wide" | "star" | "sparkle" | "burst"
  | "fisheye" | "bullseye" | "half-circle" | "dashed-circle" | "dot-circle" | "hash" | "music" | "flag" | "flag-fill"
  | "phone" | "mail" | "home" | "heart" | "heart-fill" | "timer" | "swap" | "percent" | "command" | "ban" | "grid"
  | "at" | "chevron-down" | "window" | "doc" | "doc-lines" | "columns" | "rows" | "tag" | "plus-cross" | "bolt" | "dong" | "cross-arrows" | "frame";

const paths: Record<IconName, ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></>,
  list: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  dice: <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.6" cy="8.6" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.4" cy="8.6" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="8.6" cy="15.4" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.4" cy="15.4" r="1.1" fill="currentColor" stroke="none" /></>,
  bulb: <><path d="M9.5 18h5M10.5 21h3" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" /></>,
  lock: <><rect x="5" y="11" width="14" height="9.5" rx="2.2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  unlock: <><rect x="5" y="11" width="14" height="9.5" rx="2.2" /><path d="M8 11V8a4 4 0 0 1 7.6-1.7" /></>,
  trophy: <><path d="M8 4h8v5.2a4 4 0 0 1-8 0V4z" /><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13.2V17M9 20.5h6M10 17h4" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 3.8V9h-5.2" /></>,
  moon: <path d="M20 14.6A8 8 0 0 1 9.4 4a8 8 0 1 0 10.6 10.6z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>,
  check: <path d="m5 12.8 4.4 4.4L19 7.4" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  book: <><path d="M4.5 5.2A2.2 2.2 0 0 1 6.7 3H19.5v15.5H6.7a2.2 2.2 0 0 0-2.2 2.2z" /><path d="M4.5 20.7V5.2M8.5 7.5h7M8.5 11h5" /></>,
  news: <><path d="M5 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v13H6.8A1.8 1.8 0 0 1 5 17.2z" /><path d="M18 9h1.7a.8.8 0 0 1 .8.8v7.4a1.8 1.8 0 0 1-1.8 1.8M8.5 8.5h6M8.5 12h6M8.5 15.5h4" /></>,
  play: <path d="M8 5.2v13.6L19 12z" fill="currentColor" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.7" r="1" fill="currentColor" stroke="none" /></>,
  shield: <path d="M12 3 4.5 6v5.6c0 4.6 3.2 8 7.5 9.4 4.3-1.4 7.5-4.8 7.5-9.4V6z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  warning: <><path d="M12 3.6 21.4 20H2.6z" /><path d="M12 10v4.4" /><circle cx="12" cy="17.1" r="1" fill="currentColor" stroke="none" /></>,
  download: <path d="M12 4v11M7.6 11 12 15.4 16.4 11M5 20h14" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <path d="M7 17 17 7M9 7h8v8" />,
  more: <><circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
  triangle: <path d="M12 4.5 20.5 19h-17z" />,
  pulse: <path d="M3 12h4l2.4-6.5 4.2 13L16 12h5" />,
  gem: <><path d="M6.3 3.5h11.4L22 9.2 12 20.5 2 9.2z" /><path d="M2 9.2h20M9.3 3.5 7.6 9.2 12 20.5l4.4-11.3-1.7-5.7" /></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><path d="M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5z" /><circle cx="16" cy="13.7" r="1.1" fill="currentColor" stroke="none" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2.2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  "user-check": <><circle cx="9.5" cy="8" r="3.5" /><path d="M3 20c.5-3.6 3-5.5 6.5-5.5 1.5 0 2.800.4 3.800 1.100M15 17.500l2 2 4-4.200" /></>,

  at: <><circle cx="12" cy="12" r="3.6" /><path d="M15.6 8.4v5a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.6 7.1" /></>,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,

  diamond: <path d="M12 3.2 20.8 12 12 20.8 3.2 12z" />,
  "diamond-fill": <path d="M12 3.2 20.8 12 12 20.8 3.2 12z" fill="currentColor" />,
  "triangle-fill": <path d="M12 4.2 21 19.6H3z" fill="currentColor" />,
  pentagon: <path d="M12 3.5 20.5 9.7 17.3 19.8H6.7L3.5 9.7z" fill="currentColor" />,
  hexagon: <path d="M12 3 19.8 7.5v9L12 21l-7.800-4.500v-9z" fill="currentColor" />,
  "hexagon-wide": <path d="M3 12 7.500 4.500h9L21 12l-4.500 7.500h-9z" fill="currentColor" />,
  star: <path d="m12 3.4 2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17.400 6.600 20.300l1-6.100L3.200 9.900l6.100-.9z" fill="currentColor" />,
  sparkle: <path d="M12 2.800c.6 5.200 3.200 8.400 9.200 9.200-6 .8-8.600 4-9.200 9.200-.6-5.200-3.200-8.400-9.200-9.200 6-.8 8.600-4 9.200-9.200z" fill="currentColor" />,
  burst: <path d="m12 2.500 2.200 3.800 4.300-1 -1 4.300 3.800 2.200-3.800 2.200 1 4.300-4.300-1L12 21.500l-2.200-3.800-4.300 1 1-4.300L2.700 12.500l3.800-2.200-1-4.300 4.300 1z" fill="currentColor" />,
  fisheye: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.600" fill="currentColor" stroke="none" /></>,
  bullseye: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.800" /></>,
  "half-circle": <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></>,
  "dashed-circle": <circle cx="12" cy="12" r="8.500" strokeDasharray="2.600 3.200" />,
  "dot-circle": <><circle cx="12" cy="12" r="8.500" /><circle cx="12" cy="12" r="2.800" fill="currentColor" stroke="none" /></>,
  hash: <path d="M9 4 7.500 20M16.500 4 15 20M4.500 9h15.500M4 15h15.500" />,
  music: <><path d="M9 18V6l10-2v12" /><circle cx="6.500" cy="18" r="2.500" fill="currentColor" /><circle cx="16.500" cy="16" r="2.500" fill="currentColor" /></>,
  flag: <path d="M6 21V4M6 5h12l-2.500 4L18 13H6" />,
  "flag-fill": <><path d="M6 21V4" /><path d="M6 5h12l-2.500 4L18 13H6z" fill="currentColor" /></>,
  phone: <path d="M6.600 3.500h3l1.600 4.200-2 1.300a11 11 0 0 0 5.800 5.800l1.300-2 4.200 1.600v3A2.300 2.300 0 0 1 18 19.500 15 15 0 0 1 4.500 6 2.300 2.300 0 0 1 6.600 3.500z" />,
  mail: <><rect x="3" y="5.500" width="18" height="13" rx="2.200" /><path d="m3.500 7.500 8.500 6.200 8.500-6.200" /></>,
  home: <path d="M4 11 12 4l8 7v8.500a.5.5 0 0 1-.5.500H15v-6H9v6H4.500a.5.5 0 0 1-.5-.5z" />,
  heart: <path d="M12 20.500S3.500 15.200 3.500 9.300A4.600 4.600 0 0 1 12 7a4.600 4.600 0 0 1 8.500 2.300c0 5.900-8.500 11.200-8.500 11.200z" />,
  "heart-fill": <path d="M12 20.500S3.500 15.200 3.500 9.300A4.600 4.600 0 0 1 12 7a4.600 4.600 0 0 1 8.500 2.300c0 5.900-8.500 11.200-8.500 11.200z" fill="currentColor" />,
  timer: <><circle cx="12" cy="13.500" r="7.500" /><path d="M12 9.500v4l2.500 1.500M9.500 2.800h5" /></>,
  swap: <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />,
  percent: <><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.500" /><circle cx="17" cy="17" r="2.500" /></>,
  command: <path d="M9 9V6.500A2.500 2.500 0 1 0 6.500 9H9zm0 0h6m-6 0v6m6-6V6.500A2.500 2.500 0 1 1 17.500 9H15zm0 0v6m0 0h2.500a2.500 2.500 0 1 1-2.500 2.500V15zm0 0H9m0 0H6.500A2.500 2.500 0 1 0 9 17.500V15z" />,
  ban: <><circle cx="12" cy="12" r="8.500" /><path d="m6 6 12 12" /></>,
  grid: <><rect x="3.500" y="3.500" width="7" height="7" rx="1.200" /><rect x="13.500" y="3.500" width="7" height="7" rx="1.200" /><rect x="3.500" y="13.500" width="7" height="7" rx="1.200" /><rect x="13.500" y="13.500" width="7" height="7" rx="1.200" /></>,
  window: <><rect x="3.500" y="3.500" width="17" height="17" rx="2" /><path d="M12 3.500v17M3.500 12h17" /></>,
  doc: <><path d="M6 3.500h8l4 4V20a.5.5 0 0 1-.5.500h-11.500a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" /><path d="M14 3.500V8h4" /></>,
  "doc-lines": <><path d="M6 3.500h8l4 4V20a.5.5 0 0 1-.5.500H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" /><path d="M14 3.500V8h4M8.500 12h7M8.500 15.500h7" /></>,
  columns: <><rect x="3.500" y="4" width="17" height="16" rx="2" /><path d="M9.200 4v16M14.800 4v16" /></>,
  rows: <><rect x="3.500" y="4" width="17" height="16" rx="2" /><path d="M3.500 9.300h17M3.500 14.700h17" /></>,
  tag: <path d="M7 5h12l-3 7 3 7H7l-3-7z" />,
  "plus-cross": <path d="M9.500 3.500h5v6h6v5h-6v6h-5v-6h-6v-5h6z" />,
  bolt: <path d="M13.500 2.800 5 13.500h6l-1 7.700 8.500-10.700h-6z" fill="currentColor" />,
  dong: <><path d="M16 4v13M16 9.500a4.500 4.500 0 1 0 0 7.500M5.500 20.500h12" /><path d="M13.500 4h5" /></>,
  "cross-arrows": <path d="M12 3.500v17M3.500 12h17M9 6.500l3-3 3 3M9 17.500l3 3 3-3M6.500 9l-3 3 3 3M17.500 9l3 3-3 3" />,
  frame: <><rect x="3.500" y="3.500" width="17" height="17" rx="2.500" /><rect x="8.200" y="8.200" width="7.600" height="7.600" rx="1.200" /></>,
};

const SCENARIO_GLYPHS: Record<string, IconName> = {
  // badge icons
  "◇": "diamond", "◆": "diamond-fill", "▲": "triangle-fill", "⬟": "pentagon", "⬢": "hexagon", "⬣": "hexagon-wide",
  "✦": "sparkle", "✹": "burst", "◉": "fisheye", "◎": "bullseye", "◒": "half-circle", "◍": "dot-circle", "◌": "dashed-circle",
  "⌗": "hash", "♬": "music", "⚐": "flag", "⚑": "flag-fill",
  // scenario art
  "☎": "phone", "☏": "phone", "✉": "mail", "⌂": "home", "♥": "heart-fill", "♡": "heart", "⏱": "timer", "⇄": "swap", "⇆": "swap",
  "％": "percent", "⌘": "command", "⊘": "ban", "⊞": "window", "▤": "doc-lines", "▧": "doc", "▣": "frame", "▥": "columns", "▦": "grid",
  "▰": "rows", "▱": "tag", "✚": "plus-cross", "✣": "cross-arrows", "ϟ": "bolt", "₫": "dong", "★": "star", "⌁": "pulse",
  "◈": "gem", "⌾": "target", "⬡": "shield", "⬙": "shield", "↺": "refresh", "↗": "external", "@": "at", "△": "triangle",
};

type IconProps = { name: IconName; size?: number; className?: string };

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

/** Renders a content glyph (scenario/badge art stored as text) as an SVG; unknown glyphs fall back to the text. */
export function GlyphIcon({ glyph, size = 24 }: { glyph: string; size?: number }) {
  const name = SCENARIO_GLYPHS[glyph.trim()];
  if (!name) return <span aria-hidden="true">{glyph}</span>;
  return <Icon name={name} size={size} />;
}
