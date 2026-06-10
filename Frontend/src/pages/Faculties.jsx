import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function Faculties() {
  const cmsPage = useCmsPage("faculties");
  const { t } = useLanguage();
  usePageSeo(cmsPage, "Faculties - ATI Jaffna", "Explore ATI Jaffna departments and academic staff.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow={t("nav.faculties")} fallbackTitle={t("home.departments")} fallbackText={t("page.facultiesText")} />
        <CmsSections cmsPage={cmsPage} imageHeightClass="h-52" cardVariant="image-card" showButtons={false} />
      </div>
    </section>
  );
}
