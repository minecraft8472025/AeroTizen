import type { FireplaceControls } from "../contracts/fireplace";
import type { LauncherConfig, RemoteKeyHandler } from "../contracts/launcher";

const SPACE_KEY_CODE = 32;

export const createFireplaceKeyHandler = (
  keys: Pick<LauncherConfig["KEY"], "UP" | "DOWN" | "ENTER" | "BACK" | "ESC">,
  fireplace: Omit<FireplaceControls, "open">,
): RemoteKeyHandler => ({
  isActive: () => fireplace.isOpen(),
  subscribe: (listener) => fireplace.subscribe?.(listener) ?? (() => {}),
  keydown(code, event) {
    if (code === keys.UP) {
      event.preventDefault();
      fireplace.volumeUp();
    } else if (code === keys.DOWN) {
      event.preventDefault();
      fireplace.volumeDown();
    } else if (code === keys.ENTER || code === SPACE_KEY_CODE || code === keys.BACK || code === keys.ESC) {
      event.preventDefault();
      fireplace.close();
    }
  },
});
