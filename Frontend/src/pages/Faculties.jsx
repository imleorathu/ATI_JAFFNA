import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";

export default function Faculties() {
  const cmsPage = useCmsPage("faculties");
  usePageSeo(cmsPage, "Faculties - ATI Jaffna", "Explore ATI Jaffna departments and academic staff.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow="Faculties" fallbackTitle="Departments" fallbackText="Explore the academic areas available at ATI Jaffna." />
        <CmsSections cmsPage={cmsPage} imageHeightClass="h-52" cardVariant="image-card" defaultButtonText="View Details" defaultButtonLink="/courses" />
      </div>
    </section>
  );
}
