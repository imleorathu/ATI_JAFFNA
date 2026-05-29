import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";

export default function Courses() {
  const cmsPage = useCmsPage("courses");
  usePageSeo(cmsPage, "Courses - ATI Jaffna", "Explore ATI Jaffna higher national diploma programmes.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow="Courses" fallbackTitle="Higher National Diploma Programmes" fallbackText="Explore course pathways and contact ATI Jaffna for programme details." />
        <CmsSections cmsPage={cmsPage} />
      </div>
    </section>
  );
}
