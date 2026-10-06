/**
 * LaunchIt Bridge Script
 * Injected on launchit.world to connect the web app with the user's active TikTok session.
 */

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "LAUNCHIT_REQUEST_TIKTOK_AUTH") {
    const expectedHandle = event.data.expectedHandle;

    chrome.runtime.sendMessage(
      { type: "CHECK_TIKTOK_AUTH", expectedHandle },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              type: "LAUNCHIT_TIKTOK_AUTH_RESULT",
              success: false,
              error: "LaunchIt extension communication error. Ensure extension is enabled."
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
  }
});

// Broadcast that extension bridge is active on launchit.world
window.postMessage({ type: "LAUNCHIT_EXTENSION_READY" }, "*");
