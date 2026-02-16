"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  id: string;
  title: string;
  path: string;
  slug: string;
}

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          DocDrift
        </Link>
      </div>
      <ul className="sidebar-nav">
        {items.map((item) => {
          const href = `/docs/${item.slug}`;
          const isActive = pathname === href;
          return (
            <li key={item.id}>
              <Link
                href={href}
                className={`sidebar-link${isActive ? " active" : ""}`}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
