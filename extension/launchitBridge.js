/**
 * LaunchIt Bridge Script
 * Injected on launchit.world to connect the web app with the user's active TikTok session.
 */

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "LAUNCHIT_REQUEST_TIKTOK_AUTH") {
    const expectedHandle = event.data.expectedHandle;

    try {
      if (!chrome.runtime?.id) {
        window.postMessage(
          {
            type: "LAUNCHIT_TIKTOK_AUTH_RESULT",
            success: false,
            error: "LaunchIt extension was updated. Please refresh this page to reconnect."
          },
          "*"
        );
        return;
      }

      chrome.runtime.sendMessage(
        { type: "CHECK_TIKTOK_AUTH", expectedHandle },
        (response) => {
          if (chrome.runtime.lastError) {
            window.postMessage(
              {
                type: "LAUNCHIT_TIKTOK_AUTH_RESULT",
                success: false,
                error: chrome.runtime.lastError.message || "LaunchIt extension communication error."
              },
              "*"
            );
            return;
          }

          window.postMessage(
            {
              type: "LAUNCHIT_TIKTOK_AUTH_RESULT",
              ...response
            },
            "*"
          );
        }
      );
    } catch (e) {
      window.postMessage(
        {
          type: "LAUNCHIT_TIKTOK_AUTH_RESULT",
          success: false,
          error: "Extension communication error. Please refresh the page."
        },
        "*"
      );
    }
  if (event.data?.type === "LAUNCHIT_REQUEST_LOGOUT") {
    try {
      chrome.runtime.sendMessage({ type: "LOGOUT_TIKTOK" }, (response) => {
        window.postMessage({ type: "LAUNCHIT_LOGOUT_RESULT", ...response }, "*");
      });
    } catch (_) {}
  }
});

// Broadcast that extension bridge is active on launchit.world
window.postMessage({ type: "LAUNCHIT_EXTENSION_READY" }, "*");
