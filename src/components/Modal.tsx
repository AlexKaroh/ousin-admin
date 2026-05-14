import type { ReactNode } from "react";
import { useEffect } from "react";
import { XIcon } from "./Icons";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Тёмная тема (заказы в админке) */
  variant?: "default" | "dark";
  /** Доп. класс на карточку (например ширина) */
  cardClassName?: string;
  /** Доп. класс на backdrop (например выше другого модального слоя) */
  backdropClassName?: string;
};

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  variant = "default",
  cardClassName,
  backdropClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`modal-backdrop${variant === "dark" ? " modal-backdrop--dark" : ""}${backdropClassName ? ` ${backdropClassName}` : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-card${variant === "dark" ? " modal-card--dark" : ""}${cardClassName ? ` ${cardClassName}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={variant === "dark" ? "modal-head modal-head--dark" : undefined}
          style={
            variant === "dark"
              ? undefined
              : {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }
          }
        >
          <div className={variant === "dark" ? "modal-title modal-title--dark" : "modal-title"}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            className={variant === "dark" ? "icon-btn icon-btn--dark-close" : "icon-btn"}
            aria-label="Закрыть"
          >
            <XIcon />
          </button>
        </div>
        <div
          className={variant === "dark" ? "modal-body--dark" : undefined}
          style={variant === "dark" ? undefined : { display: "flex", flexDirection: "column", gap: 12 }}
        >
          {children}
        </div>
        {footer && (
          <div
            className={variant === "dark" ? "modal-footer modal-footer--dark" : undefined}
            style={
              variant === "dark"
                ? undefined
                : {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    paddingTop: 4,
                  }
            }
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
