import { MenuFootnotes, MenuSections } from "@/components/menu/MenuSections";
import { CateringBand } from "@/components/sections/CateringBand";
import { CateringSection } from "@/components/sections/CateringSection";
import { Experiences } from "@/components/sections/Experiences";
import { Faq } from "@/components/sections/Faq";
import { Featured } from "@/components/sections/Featured";
import { GalleryTeaser } from "@/components/sections/GalleryTeaser";
import { Hero } from "@/components/sections/Hero";
import { Intro } from "@/components/sections/Intro";
import { Visit } from "@/components/sections/Visit";
import { JsonLd } from "@/components/ui/JsonLd";
import { isPremium, menu } from "@/lib/site";
import { faqJsonLd, menuJsonLd } from "@/lib/site/seo";

/**
 * Home page.
 * Premium sites: a tour of the restaurant that links out to the inner pages.
 * Starter sites: the whole site on one page (story, full menu, catering, hours and location).
 */
export default function HomePage() {
  if (isPremium) {
    return (
      <>
        <Hero />
        <Intro />
        <Featured />
        <Experiences />
        <GalleryTeaser />
        <CateringBand />
        <Visit />
        <Faq />
        <JsonLd data={faqJsonLd()} />
      </>
    );
  }

  return (
    <>
      <Hero />
      <Intro />
      <section id="menu" className="border-t border-line bg-surface" aria-labelledby="menu-heading">
        <div className="container-site pt-20 md:pt-28">
          <p className="eyebrow">Menu</p>
          <h2 id="menu-heading" className="display mt-4 text-[clamp(2.2rem,5vw,4rem)]">
            What we are cooking
          </h2>
          {menu.intro && <p className="mt-5 max-w-2xl text-muted">{menu.intro}</p>}
          <div className="mt-6">
            <MenuSections headingLevel="h3" />
            <MenuFootnotes />
          </div>
        </div>
      </section>
      <GalleryTeaser />
      <CateringSection />
      <Visit />
      <Faq />
      <JsonLd data={menuJsonLd()} />
      <JsonLd data={faqJsonLd()} />
    </>
  );
}
