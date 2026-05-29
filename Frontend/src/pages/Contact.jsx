import { motion } from "framer-motion";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import GlassCard from "../components/GlassCard.jsx";
import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";

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
  usePageSeo(cmsPage, "Contact ATI Jaffna", "Contact ATI Jaffna for campus support.");

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow="Contact" fallbackTitle="Get in Touch" fallbackText="Send a message to ATI Jaffna or visit the campus office for support." />
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
                  placeholder="Full name"
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.input
                  type="email"
                  className="clay-input"
                  placeholder="Email address"
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.input
                  className="clay-input"
                  placeholder="Subject"
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.textarea
                  className="clay-input min-h-36"
                  placeholder="Message"
                  whileFocus={{ scale: 1.01, borderColor: "#0d6efd" }}
                />
                <motion.button
                  type="button"
                  className="clay-btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => alert("Your message has been sent. We will respond shortly.")}
                >
                  Send Message
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
                <motion.p variants={fadeUp} className="flex gap-3"><MapPin className="text-clay-accent" size={20} /> Jaffna, Northern Province, Sri Lanka</motion.p>
              </motion.div>
              <motion.div
                className="mt-6 flex gap-3 text-clay-text"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <motion.a href="https://facebook.com" target="_blank" rel="noopener noreferrer" whileHover={{ y: -3, color: "#0d6efd" }}><Facebook /></motion.a>
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
              <iframe title="ATI Jaffna map" className="h-full w-full" loading="lazy" src="https://www.google.com/maps?q=Jaffna%20Sri%20Lanka&output=embed" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
