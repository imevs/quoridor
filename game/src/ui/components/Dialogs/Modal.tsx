import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren, TargetedMouseEvent } from 'preact';
import styles from './Modal.module.css';
import baseStyles from './DialogBase.module.css';

export interface DialogCloseButtonProps {
  id?: string;
  onClick: () => void;
}

export function DialogCloseButton({ id, onClick }: DialogCloseButtonProps) {
  return (
    <button
      id={id}
      class={baseStyles.dialogClose}
      type="button"
      aria-label="Close dialog"
      onClick={onClick}
    >
      ✕
    </button>
  );
}

export interface DialogHeaderProps {
  title: string;
  desc?: string;
  titleId?: string;
  descId?: string;
  children?: ComponentChildren;
}

export function DialogHeader({ title, desc, titleId, descId, children }: DialogHeaderProps) {
  return (
    <div class={baseStyles.panelHero}>
      {children}
      <h2 id={titleId} class={baseStyles.heroTitle}>
        {title}
      </h2>
      {desc && (
        <p id={descId} class={baseStyles.heroDesc}>
          {desc}
        </p>
      )}
    </div>
  );
}

export interface ModalProps {
  id: string;
  open: boolean;
  className?: string;
  onClose: () => void;
  onOpen?: () => void;
  children: ComponentChildren;
}

export function Modal({ id, open, className = '', onClose, onOpen, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sync open prop -> native dialog
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open && !el.open) {
      try {
        el.showModal();
      } catch {
        /* already open */
      }
    } else if (!open && el.open) {
      try {
        el.close();
      } catch {
        /* already closed */
      }
    }
  }, [open]);

  // Sync native dialog DOM state & events -> store callbacks
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleClose = () => {
      onClose();
    };

    el.addEventListener('close', handleClose);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'open') {
          if (el.open) {
            onOpen?.();
          } else {
            onClose();
          }
        }
      }
    });

    observer.observe(el, { attributes: true, attributeFilter: ['open'] });

    return () => {
      el.removeEventListener('close', handleClose);
      observer.disconnect();
    };
  }, [onClose, onOpen]);

  const handleBackdropClick = (e: TargetedMouseEvent<HTMLDialogElement>) => {
    const el = ref.current;
    if (!el || !el.open) return;
    if (e.target === el) {
      const rect = el.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) {
        try {
          el.close();
        } catch {
          /* ignore */
        }
      }
    }
  };

  return (
    <dialog
      id={id}
      ref={ref}
      class={`${styles.panel} ${className}`}
      onClick={handleBackdropClick}
    >
      {children}
    </dialog>
  );
}
