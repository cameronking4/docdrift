import { Sidebar } from "@/components/sidebar";
import { getNavItems } from "@/lib/docs";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = getNavItems();

  return (
    <div className="layout">
      <Sidebar items={navItems} />
      <main className="main-content">{children}</main>
    </div>
  );
}
