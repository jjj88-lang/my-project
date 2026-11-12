import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MenuNav } from "@/components/menu/MenuNav";
import { MenuFootnotes, MenuSections } from "@/components/menu/MenuSections";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { isPremium, menu, site } from "@/lib/site";
import { orderLink } from "@/lib/site/nav";
import { menuJsonLd, pageMetadata, place } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Menu",
  description: `The full ${site.name} menu with prices: ${menu.sections
    .slice(0, 4)
    .map((s) => s.name.toLowerCase())
    .join(", ")} and more. ${site.cuisines.join(", ")} in ${place}.`,
  path: "/menu",
});

export default function MenuPage() {
  if (!isPremium) notFound();

  return (
    <>
      <PageHeader eyebrow={site.cuisines.join(" · ")} title="Menu" intro={menu.intro}>
        {orderLink &&
          (orderLink.external ? (
            <a href={orderLink.href} target="_blank" rel="noopener noreferrer" className="btn btn-solid no-print">
              {orderLink.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <Link href={orderLink.href} className="btn btn-solid no-print">
              {orderLink.label}
            </Link>
          ))}
      </PageHeader>
      <div className="container-site">
        <MenuNav sections={menu.sections.map((s) => ({ id: s.id, name: s.name }))} />
        <MenuSections />
        <MenuFootnotes />
      </div>
      <JsonLd data={menuJsonLd()} />
    </>
  );
}
