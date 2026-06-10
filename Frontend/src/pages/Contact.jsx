import { motion } from "framer-motion";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import GlassCard from "../components/GlassCard.jsx";
import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export default function Contact() {
  const cmsPage = useCmsPage("contact");
  const { t } = useLanguage();
  usePageSeo(cmsPage, "Contact ATI Jaffna", "Contact ATI Jaffna for campus support.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow={t("nav.contact")} fallbackTitle={t("page.contactTitle")} fallbackText={t("page.contactText")} />
        <CmsSections cmsPage={cmsPage} />
        <motion.div
          className="grid gap-6 lg:grid-cols-[1fr_0.9fr]"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <motion.div variants={fadeUp}>
            <GlassCard>
              <form className="grid gap-4">
                <motion.input
                  className="clay-input"
                  placeholder={t("page.fullName")}
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.input
                  type="email"
                  className="clay-input"
                  placeholder={t("page.email")}
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.input
                  className="clay-input"
                  placeholder={t("page.subject")}
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.textarea
                  className="clay-input min-h-36"
                  placeholder={t("page.message")}
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.button
                  type="button"
                  className="clay-btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => alert("Your message has been sent. We will respond shortly.")}
                >
                  {t("page.sendMessage")}
                </motion.button>
              </form>
            </GlassCard>
          </motion.div>
          <motion.div variants={fadeUp} className="grid gap-5">
            <GlassCard>
              <motion.div
                className="space-y-4 text-sm text-clay-muted"
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <motion.p variants={fadeUp} className="flex gap-3"><Mail className="text-clay-accent" size={20} /> info@atijaffna.edu.lk</motion.p>
                <motion.p variants={fadeUp} className="flex gap-3"><Phone className="text-clay-accent" size={20} /> +94 21 000 0000</motion.p>
                <motion.p variants={fadeUp} className="flex gap-3"><MapPin className="text-clay-accent" size={20} /> {t("footer.location")}</motion.p>
              </motion.div>
              <motion.div
                className="mt-6 flex gap-3 text-clay-text"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <motion.a href="https://facebook.com" target="https://m.facebook.com/100054492848989/about/" rel="noopener noreferrer" whileHover={{ y: -3, color: "#0d6efd" }}><Facebook /></motion.a>
                <motion.a href="https://instagram.com" target="_blank" rel="noopener noreferrer" whileHover={{ y: -3, color: "#0d6efd" }}><Instagram /></motion.a>
                <motion.a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" whileHover={{ y: -3, color: "#0d6efd" }}><Linkedin /></motion.a>
              </motion.div>
            </GlassCard>
            <motion.div
              className="clay-panel h-72 overflow-hidden"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <iframe title="ATI Jaffna map" className="h-full w-full" loading="lazy" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3933.3424591242474!2d80.02107167490469!3d9.651751290436625!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3afe56b963ffa9ff%3A0x3cd84b69fd4e0cb0!2sAdvanced%20Technological%20Institute%20-%20Jaffna%20(ATI-Jaffna)!5e0!3m2!1sen!2slk!4v1780681910153!5m2!1sen!2slk" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
