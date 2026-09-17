
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Dashboard", href: "/", icon: "⌂" },
  { label: "Song Library", href: "/songs", icon: "♫" },
  { label: "Setlists", href: "/setlists", icon: "☰" },
  { label: "Favorites", href: "/favorites", icon: "♡" },
  { label: "Team", href: "/team", icon: "♙" },
];

export default function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

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

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") {
      return;
    }

    startX.current = event.clientX;
    startY.current = event.clientY;
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (
      startX.current === null ||
      startY.current === null ||
      event.pointerType === "mouse"
    ) {
      return;
    }

    const deltaX = event.clientX - startX.current;
    const deltaY = event.clientY - startY.current;

    const initialX = startX.current;

    startX.current = null;
    startY.current = null;

    // Ignore normal vertical scrolling.
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    // Open from the left edge.
    if (!open && initialX <= 48 && deltaX > 60) {
      setOpen(true);
      return;
    }

    // Close by swiping left.
    if (open && deltaX < -60) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Mobile left-edge swipe zone */}
      {!open && (
        <div
          className="fixed left-0 top-0 z-[90] h-full w-12 md:hidden"
          style={{ touchAction: "pan-y" }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          aria-hidden="true"
        />
      )}

      {/* Mobile navigation */}
      <div
        className={`fixed inset-0 z-[100] md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 appearance-none border-0 bg-black/60 p-0 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer */}
        <aside
          className={`absolute left-0 top-0 flex h-full w-64 max-w-[82vw] flex-col border-r border-neutral-800 bg-[#090909] shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          {/* BRAND */}
          <div className="border-b border-neutral-800 px-6 py-6">
            <Link
              href="/"
              className="block"
              onClick={() => setOpen(false)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-[#090909]">
                  <svg
                    viewBox="0 0 64 64"
                    className="h-7 w-7"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="himigMobileRestGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#67e8f9"
                        />
                        <stop
                          offset="55%"
                          stopColor="#22d3ee"
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="M31 7
                         C39 13 48 19 49 27
                         C50 34 44 38 37 41
                         C31 44 29 47 33 52
                         C36 56 40 59 42 61
                         C33 58 25 54 20 49
                         C15 44 16 39 22 35
                         C27 32 31 30 30 26
                         C29 21 23 18 18 16
                         C23 14 27 11 31 7Z"
                      fill="url(#himigMobileRestGradient)"
                    />
                  </svg>
                </div>

                <div>
                  <h1 className="font-serif text-2xl font-semibold italic tracking-wide text-white">
                    HIMIG
                  </h1>

                  <p className="text-xs text-neutral-500">
                    Praise and Worship
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* MENU */}
          <div className="px-4 py-5">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              MENU
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      isActive
                        ? "bg-neutral-800 font-semibold text-white hover:bg-neutral-700"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <span className="flex w-5 justify-center text-lg">
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* FOOTER */}
          <div className="mt-auto border-t border-neutral-800 p-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                Current Team
              </p>

              <p className="mt-2 text-sm font-medium text-white">
                KCCC Psalmist
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Praise and Worship
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
