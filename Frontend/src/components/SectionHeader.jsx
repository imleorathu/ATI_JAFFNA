import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const headerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export default function SectionHeader({ eyebrow, title, text }) {
  const { translate } = useLanguage();

  return (
    <motion.div
      className="mx-auto mb-10 max-w-3xl text-center"
      variants={headerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
    >
      {eyebrow && <motion.p variants={childVariants} className="mb-3 text-sm font-black uppercase tracking-[0.24em] text-clay-accent">{translate(eyebrow)}</motion.p>}
      <motion.h2 variants={childVariants} className="text-3xl font-black text-clay-text md:text-4xl">{translate(title)}</motion.h2>
      {text && <motion.p variants={childVariants} className="mt-4 text-base leading-7 text-clay-muted">{translate(text)}</motion.p>}
    </motion.div>
  );
}
