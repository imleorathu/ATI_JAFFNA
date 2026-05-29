import { forwardRef } from "react";

const GlassCard = forwardRef(function GlassCard({ children, className = "", dark, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={`classroom-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export default GlassCard;
