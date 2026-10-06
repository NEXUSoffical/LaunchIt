/**
 * LaunchIt Bridge Script
 * Injected on launchit.world to connect the web app with the user's active TikTok session.
 */

// Listen for messages from web page
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
  }

  if (event.data?.type === "LAUNCHIT_REQUEST_LOGOUT") {
    try {
      chrome.runtime.sendMessage({ type: "LOGOUT_TIKTOK" }, (response) => {
        window.postMessage({ type: "LAUNCHIT_LOGOUT_RESULT", ...response }, "*");
      });
    } catch (_) {}
  }

  if (event.data?.type === "LAUNCHIT_OPEN_TIKTOK_LOGIN") {
    try {
      chrome.runtime.sendMessage(
        {
          type: "OPEN_TIKTOK_LOGIN",
          expectedHandle: event.data.expectedHandle
        },
        (response) => {
          window.postMessage({ type: "LAUNCHIT_OPEN_LOGIN_RESULT", ...response }, "*");
        }
      );
    } catch (_) {}
  }
});

// Listen for push notifications from background (e.g. login completed, wrong account)
try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "TIKTOK_LOGIN_COMPLETED") {
      window.postMessage(
        {
          type: "LAUNCHIT_TIKTOK_LOGIN_COMPLETED",
          username: message.username
        },
        "*"
      );
    }
    if (message?.type === "TIKTOK_WRONG_ACCOUNT") {
      window.postMessage(
        {
          type: "LAUNCHIT_TIKTOK_WRONG_ACCOUNT",
          detected: message.detected,
          expected: message.expected
        },
        "*"
      );
    }
  });
} catch (_) {}

// Broadcast that extension bridge is active on launchit.world
window.postMessage({ type: "LAUNCHIT_EXTENSION_READY" }, "*");
