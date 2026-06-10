import atiSeal from "../assets/organization/ati-jaffna-seal.jpg";
import sliateMark from "../assets/organization/sliate-mark.png";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export { atiSeal, sliateMark };

export default function OrganizationBrand({ variant = "compact", showText = true, className = "" }) {
  const { t } = useLanguage();

  return (
    <div className={`organization-brand organization-brand-${variant} ${className}`.trim()}>
      <div className="organization-brand-marks" aria-label="ATI Jaffna and SLIATE">
        <span className="organization-brand-mark organization-brand-mark-ati">
          <img src={atiSeal} alt="ATI Jaffna seal" />
        </span>
        <span className="organization-brand-divider" aria-hidden="true" />
        <span className="organization-brand-mark organization-brand-mark-sliate">
          <img src={sliateMark} alt="SLIATE logo" />
        </span>
      </div>
      {showText && (
        <span className="organization-brand-copy">
          <span className="organization-brand-title">ATI Jaffna</span>
          <span className="organization-brand-subtitle">{t("brand.subtitle")}</span>
          <span className="organization-brand-parent">{t("brand.parent")}</span>
        </span>
      )}
    </div>
  );
}
