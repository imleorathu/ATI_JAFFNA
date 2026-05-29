import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";

export default function About() {
  const cmsPage = useCmsPage("about");
  usePageSeo(cmsPage, "About ATI Jaffna", "Learn about ATI Jaffna history, vision, mission, and leadership.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow="About" fallbackTitle="A Practical Higher Education Campus in Jaffna" fallbackText="ATI Jaffna supports students with technology-focused education, professional pathways, and a campus culture built around growth." />
        <CmsSections cmsPage={cmsPage} />
      </div>
    </section>
  );
}
