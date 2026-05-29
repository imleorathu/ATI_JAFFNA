export default function Button({ children, variant = "primary", className = "", href = "#" }) {
  const styles =
    variant === "secondary"
      ? "clay-btn-secondary"
      : "clay-btn-primary";

  return (
    <a href={href} className={`${styles} ${className}`}>
      {children}
    </a>
  );
}
