import { Languages } from "lucide-react";
import { languageOptions, useLanguage } from "../contexts/LanguageContext.jsx";

export default function LanguageSelector({ compact = false }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className={`site-language-selector${compact ? " compact" : ""}`}>
      <Languages size={17} aria-hidden="true" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {compact ? option.shortLabel : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
