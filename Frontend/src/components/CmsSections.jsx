import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import GlassCard from "./GlassCard";
import SectionHeader from "./SectionHeader";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } }
};

function SectionButton({ section, variant = "link", defaultText = "", defaultLink = "" }) {
  const { translate } = useLanguage();
  const buttonText = section.buttonText || defaultText;
  const buttonLink = section.buttonLink || defaultLink;
  if (!buttonText || !buttonLink) return null;
  const className = variant === "primary" ? "clay-btn-primary mt-auto" : "mt-5 inline-flex items-center gap-2 text-sm font-bold text-clay-accent";
  const content = (
    <>
      {translate(buttonText)}
      {variant !== "primary" && <ArrowRight size={16} />}
    </>
  );

  if (/^https?:\/\//i.test(buttonLink)) {
    return <a href={buttonLink} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>;
  }

  return <Link to={buttonLink} className={className}>{content}</Link>;
}

function CmsLinkButton({ text, link, primary }) {
  const { translate } = useLanguage();
  if (!text || !link) return null;
  const className = primary ? "clay-btn-primary" : "clay-btn-secondary";

  if (/^https?:\/\//i.test(link)) {
    return <a href={link} target="_blank" rel="noopener noreferrer" className={className}>{translate(text)}</a>;
  }

  return <Link to={link} className={className}>{translate(text)}</Link>;
}

export function CmsPageHeader({ cmsPage, fallbackEyebrow, fallbackTitle, fallbackText }) {
  const content = cmsPage?.published || {};
  return (
    <>
      <SectionHeader
        eyebrow={fallbackEyebrow}
        title={content.heroTitle || fallbackTitle}
        text={content.heroDescription || fallbackText}
      />
      {(content.heroImageUrl || content.primaryButtonText || content.secondaryButtonText) && (
        <motion.div
          className="mx-auto mb-10 max-w-5xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
        >
          {content.heroImageUrl && (
            <div className="clay-image-card mb-5 overflow-hidden">
              <img src={content.heroImageUrl} alt="" className="max-h-[420px] w-full object-cover" />
            </div>
          )}
          {(content.primaryButtonText || content.secondaryButtonText) && (
            <div className="flex flex-wrap justify-center gap-3">
              <CmsLinkButton text={content.primaryButtonText} link={content.primaryButtonLink} primary />
              <CmsLinkButton text={content.secondaryButtonText} link={content.secondaryButtonLink} />
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}

export default function CmsSections({ cmsPage, imageHeightClass = "h-48", cardVariant = "default", defaultButtonText = "", defaultButtonLink = "", showButtons = true }) {
  const { translate } = useLanguage();
  const sections = (cmsPage?.published?.sections || []).filter((section) => section.visible !== false && (section.title || section.body || section.imageUrl || section.embedUrl));
  if (!sections.length) return null;

  const useImageCard = cardVariant === "image-card";

  return (
    <motion.div
      className={`${useImageCard ? "gap-6" : "gap-5"} mb-10 grid md:grid-cols-2 lg:grid-cols-3`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: useImageCard ? "-40px" : "-60px" }}
      variants={{ visible: { transition: { staggerChildren: useImageCard ? 0.1 : 0.08 } } }}
    >
      {sections.map((section, index) => {
        const hasTextContent = section.eyebrow || section.title || section.body || (showButtons && (section.buttonText || section.buttonLink)) || section.embedUrl;
        const imageOnly = section.imageUrl && !hasTextContent;

        return (
          <motion.article
            key={section._id || `${section.title}-${index}`}
            variants={fadeUp}
            className={useImageCard ? "clay-image-card group" : section.layout === "wide" || section.type === "banner" ? "md:col-span-2 lg:col-span-3" : ""}
            whileHover={useImageCard ? { y: -6 } : undefined}
            transition={useImageCard ? { type: "spring", stiffness: 300, damping: 20 } : undefined}
          >
            {useImageCard ? (
              <>
                {section.imageUrl && <img src={section.imageUrl} alt="" className={`${imageHeightClass} w-full object-cover transition duration-700 group-hover:scale-110`} />}
                <div className="flex grow flex-col p-6">
                  {section.eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-clay-accent">{translate(section.eyebrow)}</p>}
                  {section.title && <h3 className="text-xl font-black text-clay-text">{translate(section.title)}</h3>}
                  {section.body && <p className="mt-3 text-sm leading-6 text-clay-muted">{translate(section.body)}</p>}
                  {showButtons && <SectionButton section={section} variant="primary" defaultText={defaultButtonText} defaultLink={defaultButtonLink} />}
                </div>
              </>
            ) : imageOnly ? (
              <div className="clay-image-card group h-full overflow-hidden">
                <img src={section.imageUrl} alt="" className="h-64 w-full object-cover transition duration-700 group-hover:scale-110" />
              </div>
            ) : (
              <GlassCard className={`h-full overflow-hidden p-0 ${section.layout === "split" ? "md:grid md:grid-cols-2" : ""}`}>
                {section.imageUrl && <img src={section.imageUrl} alt="" className={`${section.layout === "split" ? "h-full" : imageHeightClass} w-full object-cover`} />}
                {section.type === "embed" && section.embedUrl && (
                  <iframe title={section.title || "Embedded content"} src={section.embedUrl} className="h-72 w-full" loading="lazy" />
                )}
                <div
                  className={`flex h-full flex-col p-5 ${section.textAlign === "center" ? "items-center text-center" : ""}`}
                  style={section.backgroundColor ? { backgroundColor: section.backgroundColor } : undefined}
                >
                  {section.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay-accent">{translate(section.eyebrow)}</p>}
                  {section.title && <h3 className={`text-xl font-black text-clay-text ${section.eyebrow ? "mt-2" : ""}`}>{translate(section.title)}</h3>}
                  {section.body && <p className={`mt-3 whitespace-pre-line text-sm leading-6 text-clay-muted ${section.type === "quote" ? "text-lg italic" : ""}`}>{translate(section.body)}</p>}
                  {showButtons && <SectionButton section={section} />}
                </div>
              </GlassCard>
            )}
          </motion.article>
        );
      })}
    </motion.div>
  );
}
