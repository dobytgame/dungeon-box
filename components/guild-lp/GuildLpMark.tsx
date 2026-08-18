interface Props {
  className?: string;
}

export default function GuildLpMark({ className = 'h-2.5 w-2.5' }: Props) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 1.1 10.9 6 6 10.9 1.1 6Z" fill="currentColor" />
    </svg>
  );
}
