export function SiteFooter() {
  const url = process.env.NEXT_PUBLIC_MTVPRO_URL || "#";
  const isLive = url !== "#";
  return (
    <footer className="mt-auto border-t border-neutral-200 px-6 py-6 text-center text-xs text-neutral-500">
      <a
        href={url}
        {...(isLive ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="inline-flex items-center gap-1 transition hover:text-orange-600"
      >
        powered by Meeting TimeValue Pro
        <span aria-hidden>→</span>
      </a>
    </footer>
  );
}
