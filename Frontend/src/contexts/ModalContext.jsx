import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import AppModal from "../components/AppModal.jsx";

const ModalContext = createContext(null);

const toneIcons = {
  danger: ShieldAlert,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info
};

export function ModalProvider({ children }) {
  const [prompt, setPrompt] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const closePrompt = useCallback((result = false) => {
    setInputValue("");
    setPrompt((current) => {
      current?.resolve?.(result);
      return null;
    });
  }, []);

  const confirm = useCallback((options) => {
    const settings = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve) => {
      setPrompt({
        title: "Please confirm",
        message: "",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        tone: "warning",
        ...settings,
        resolve
      });
    });
  }, []);

  const alert = useCallback((options) => {
    const settings = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve) => {
      setPrompt({
        title: "Notice",
        message: "",
        confirmLabel: "Okay",
        tone: "info",
        alertOnly: true,
        ...settings,
        resolve
      });
    });
  }, []);

  const requestText = useCallback((options) => {
    const settings = typeof options === "string" ? { message: options } : options;
    setInputValue(settings.defaultValue || "");
    return new Promise((resolve) => {
      setPrompt({
        title: "Enter value",
        message: "",
        confirmLabel: "Continue",
        cancelLabel: "Cancel",
        tone: "info",
        ...settings,
        textInput: true,
        resolve
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm, alert, requestText }), [alert, confirm, requestText]);
  const Icon = toneIcons[prompt?.tone] || Info;

  return (
    <ModalContext.Provider value={value}>
      {children}
      <AppModal open={Boolean(prompt)} onClose={() => closePrompt(false)} size="sm">
        {prompt && (
          <div className="app-prompt">
            <div className={`app-prompt-icon app-prompt-icon-${prompt.tone}`}>
              <Icon size={24} />
            </div>
            <h2>{prompt.title}</h2>
            <p>{prompt.message}</p>
            {prompt.textInput && (
              <input
                autoFocus
                className="app-prompt-input"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={prompt.placeholder}
              />
            )}
            <div className="app-prompt-actions">
              {!prompt.alertOnly && (
                <button type="button" className="app-modal-button app-modal-button-muted" onClick={() => closePrompt(false)}>
                  {prompt.cancelLabel}
                </button>
              )}
              <button
                type="button"
                className={`app-modal-button ${prompt.tone === "danger" ? "app-modal-button-danger" : "app-modal-button-primary"}`}
                onClick={() => closePrompt(prompt.textInput ? inputValue.trim() || null : true)}
              >
                {prompt.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </AppModal>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used inside ModalProvider");
  return context;
}
