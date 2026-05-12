export function SiteFooter() {
  const url = process.env.NEXT_PUBLIC_MTVPRO_URL || "#";
  const isLive = url !== "#";
  return (
    <footer className="mt-auto border-t border-zinc-900/80 px-6 py-6 text-center text-xs text-zinc-500">
      <a
        href={url}
        {...(isLive ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="inline-flex items-center gap-1 transition hover:text-orange-400"
      >
        powered by Meeting TimeValue Pro
        <span aria-hidden>→</span>
      </a>
    </footer>
  );
}
