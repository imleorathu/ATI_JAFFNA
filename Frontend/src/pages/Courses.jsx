import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function Courses() {
  const cmsPage = useCmsPage("courses");
  const { t } = useLanguage();
  usePageSeo(cmsPage, "Courses - ATI Jaffna", "Explore ATI Jaffna higher national diploma programmes.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow={t("nav.courses")} fallbackTitle={t("page.coursesTitle")} fallbackText={t("page.coursesText")} />
        <CmsSections cmsPage={cmsPage} />
      </div>
    </section>
  );
}
