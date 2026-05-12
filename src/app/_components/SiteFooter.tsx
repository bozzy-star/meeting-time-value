"use client";

import { LOCALES, LOCALE_LABEL, useTranslation } from "../_lib/i18n";

export function SiteFooter() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <footer className="mt-auto border-t border-neutral-200 px-6 py-6 text-center text-xs text-neutral-500">
      <p>{t.footer.copy}</p>
      <nav
        aria-label="Language"
        className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
      >
        {LOCALES.map((l, i) => {
          const active = l === locale;
          return (
            <span key={l} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLocale(l)}
                aria-pressed={active}
                className={`transition ${
                  active
                    ? "font-semibold text-orange-600"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {LOCALE_LABEL[l]}
              </button>
              {i < LOCALES.length - 1 && (
                <span aria-hidden className="text-neutral-300">
                  |
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </footer>
  );
}
