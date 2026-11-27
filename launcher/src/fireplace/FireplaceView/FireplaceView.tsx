import { useLayoutEffect, useRef } from "preact/hooks";

import { useStore } from "../../shared/hooks/useStore";
import type { Translate } from "../../shared/i18n/createTranslations";
import type { Store } from "../../shared/state/createStore";
import { FIRE_HEIGHT, FIRE_WIDTH, startFireAnimation } from "../startFireAnimation";

import styles from "./FireplaceView.module.css";

export interface FireplaceState {
  readonly audioAvailable: boolean;
  readonly open: boolean;
  readonly volume: number;
  readonly volumeVisible: boolean;
}

interface Props {
  readonly onClose: () => void;
  readonly state: Store<FireplaceState>;
  readonly translate: Translate;
}

export const FireplaceView = ({ onClose, state, translate }: Props) => {
  const { open, volume, volumeVisible, audioAvailable } = useStore(state);
  const canvas = useRef<HTMLCanvasElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previousFocus?.focus?.();
  }, [open]);

  useLayoutEffect(() => {
    if (open && canvas.current) {
      return startFireAnimation(canvas.current);
    }
  }, [open]);

  if (!open) {
    return null;
  }
  let volumeLabel = translate("fireplace.audioUnavailable");
  if (audioAvailable) {
    volumeLabel = volume === 0 ? translate("fireplace.muted") : translate("fireplace.volume", { level: volume });
  }
  return (
    <div
      id="fireplace"
      class={styles.fireplace}
      role="dialog"
      aria-modal="true"
      aria-label={translate("common.fireplace")}
    >
      <canvas
        id="fire-canvas"
        class={styles.canvas}
        ref={canvas}
        width={FIRE_WIDTH}
        height={FIRE_HEIGHT}
        aria-hidden="true"
      />
      <div class={styles.hearth} aria-hidden="true" />
      <div
        id="fire-volume"
        class={styles.volume}
        role="status"
        aria-live="polite"
        aria-hidden={volumeVisible ? undefined : true}
        data-visible={volumeVisible}
      >
        {volumeLabel}
      </div>
      <div class={styles.hints} aria-hidden="true">
        {translate("fireplace.hints")}
      </div>
      <button
        ref={closeButton}
        type="button"
        class={styles.close}
        aria-label={translate("fireplace.close")}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
};
