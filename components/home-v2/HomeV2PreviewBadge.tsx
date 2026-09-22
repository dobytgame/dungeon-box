import Link from 'next/link';

export default function HomeV2PreviewBadge() {
  return (
    <div className="pointer-events-none fixed bottom-24 left-3 z-[60] md:bottom-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-sm border border-mesa-jade/30 bg-mesa-ink/90 px-3 py-2 shadow-lg backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-mesa-jade" aria-hidden="true" />
        <p className="home-v2-display text-[10px] tracking-[0.16em] text-mesa-parchment">
          Prévia admin
        </p>
        <Link
          href="/admin"
          className="home-v2-display text-[10px] tracking-[0.14em] text-mesa-jade underline-offset-2 hover:underline"
        >
          Console
        </Link>
      </div>
    </div>
  );
}
