"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Song Library", href: "/songs" },
  { label: "Setlists", href: "/setlists" },
  { label: "Favorites", href: "/favorites" },
  { label: "Team", href: "/team" },
];

export default function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];

    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const startX = touchStartX.current;
    const startY = touchStartY.current;

    const touch = event.changedTouches[0];

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (!open && startX <= 32 && deltaX > 60) {
      setOpen(true);
      return;
    }

    if (open && deltaX < -60) {
      setOpen(false);
    }
  };

  return (
    <>
      {!open && (
        <div
          className="fixed left-0 top-0 z-[90] h-full w-8 md:hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-0 z-[100] md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-[280px] max-w-[82vw] flex-col border-r border-white/10 bg-[#090909] shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
              <span className="text-xl text-cyan-300">♪</span>
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-[0.18em] text-cyan-300">
                REST NOTE
              </div>

              <div className="text-lg font-bold text-white">
                HIMIG
              </div>

              <div className="text-xs text-zinc-400">
                Praise and Worship
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-xl px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="border-t border-white/10 px-5 py-4">
            <p className="text-xs text-zinc-500">
              Swipe left to close
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
