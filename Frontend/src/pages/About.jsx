import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function About() {
  const cmsPage = useCmsPage("about");
  const { t } = useLanguage();
  usePageSeo(cmsPage, "About ATI Jaffna", "Learn about ATI Jaffna history, vision, mission, and leadership.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow={t("nav.about")} fallbackTitle={t("page.aboutTitle")} fallbackText={t("page.aboutText")} />
        <CmsSections cmsPage={cmsPage} />
      </div>
    </section>
  );
}
