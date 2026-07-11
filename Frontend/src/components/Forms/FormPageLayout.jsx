import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Full-page form shell (replaces FloatingCard for forms).
 */
const FormPageLayout = ({
  title,
  subtitle,
  backTo,
  onBack,
  children,
  maxWidth = "max-w-5xl",
  embedded = false,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div className="min-h-full bg-canvas text-ink py-4 sm:py-6 px-4 sm:px-6">
      <div className={`mx-auto ${maxWidth}`}>
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
        </div>

        {embedded ? children : <div className="tracker-card-plain !border-l-0 p-5 sm:p-6">{children}</div>}
      </div>
    </div>
  );
};

export default FormPageLayout;
