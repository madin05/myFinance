import { createInstallController } from './installPrompt.js';
import { createNetworkGateController } from './networkStatus.js';
import { registerServiceWorker, applyServiceWorkerUpdate } from './registerSw.js';
import {
  showOfflineGate,
  hideOfflineGate,
  setOfflineGateFeedback,
  showUpdateToast,
  showIosInstallModal
} from './pwaUi.js';

let initialized = false;

/**
 * Updates visibility and accessible label on all PWA install buttons across sidebar and profile dropdown.
 */
function syncInstallTriggers(mode) {
  const buttons = document.querySelectorAll('[data-pwa-install]');
  const shouldShow = mode === 'native' || mode === 'ios';

  buttons.forEach((btn) => {
    btn.hidden = !shouldShow;
    btn.style.display = shouldShow ? '' : 'none';
    btn.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  });
}

/**
 * Bootstraps MyFinance PWA capabilities: online-only network gate, install triggers, and Service Worker lifecycle.
 */
export function initPwa() {
  if (initialized || typeof window === 'undefined') return null;
  initialized = true;

  let networkGate = null;

  networkGate = createNetworkGateController({
    onLock: (message) => {
      showOfflineGate({
        message,
        onRetry: () => networkGate?.verifyAndRecover()
      });
    },
    onUnlock: () => {
      hideOfflineGate();
    },
    onFeedback: (message, isChecking) => {
      setOfflineGateFeedback(message, isChecking);
    }
  });

  networkGate.init();

  const installController = createInstallController();
  installController.init();
  installController.subscribe(syncInstallTriggers);

  document.addEventListener('click', async (event) => {
    const installTrigger = event.target.closest('[data-pwa-install]');
    if (!installTrigger) return;

    document.getElementById('profile-dropdown')?.classList.remove('active');

    const mode = installController.getMode();
    if (mode === 'native') {
      await installController.promptInstall();
    } else if (mode === 'ios') {
      showIosInstallModal();
    }
  });

  registerServiceWorker({
    onUpdateAvailable: (waitingWorker) => {
      showUpdateToast({
        onAccept: () => applyServiceWorkerUpdate(waitingWorker)
      });
    }
  });

  return {
    networkGate,
    installController
  };
}
