/**
 * LaunchIt Extension Service Worker
 * Real TikTok Authentication & Identity Verification
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CHECK_TIKTOK_AUTH") {
    const expected = (request.expectedHandle || "").replace("@", "").trim().toLowerCase();

    // Find any open TikTok tab to read live logged-in session
    chrome.tabs.query({ url: "*://*.tiktok.com/*" }, async (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({
          success: false,
          error: "No TikTok tab is open. Please open TikTok and ensure you are logged into the correct account."
        });
        return;
      }

      // Execute live user detection script inside the TikTok tab
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            // 1. Check sidebar nav profile link / avatar
            const navSelectors = [
              'a[data-e2e="profile-icon"]',
              'a[data-e2e="nav-profile"]',
              'a[data-e2e="user-avatar"]',
              '[data-e2e="user-avatar"] a',
              'header a[href^="/@"]',
              'nav a[href^="/@"]',
              'aside a[href^="/@"]',
              'a[href^="/@"]'
            ];

            for (const selector of navSelectors) {
              const el = document.querySelector(selector);
              const href = el?.getAttribute("href");
              if (href && href.includes("/@")) {
                const handle = href.split("/@")[1]?.split("/")[0]?.split("?")[0]?.trim();
                if (handle && handle !== "foryou" && handle !== "live" && handle !== "explore") {
                  return handle;
                }
              }
            }

            // 2. Check universal rehydration state script
            try {
              const stateEl = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
              if (stateEl) {
                const data = JSON.parse(stateEl.textContent || "{}");
                const defaultScope = data?.["__DEFAULT_SCOPE__"] || {};
                const user = defaultScope?.["webapp.user-detail"]?.userInfo?.user?.uniqueId ||
                             defaultScope?.["webapp.app-context"]?.user?.uniqueId;
                if (user) return user;
              }
            } catch (_) {}

            // 3. Check SIGI_STATE script
            try {
              const sigiEl = document.getElementById("SIGI_STATE");
              if (sigiEl) {
                const sigi = JSON.parse(sigiEl.textContent || "{}");
                const user = sigi?.UserModule?.users?.[Object.keys(sigi?.UserModule?.users || {})[0]]?.uniqueId ||
                             sigi?.AppContext?.user?.uniqueId;
                if (user) return user;
              }
            } catch (_) {}

            return null;
          }
        });

        const detectedUsername = (results?.[0]?.result || "").toLowerCase().trim();

        if (!detectedUsername) {
          sendResponse({
            success: false,
            error: "Not logged into TikTok. Please log into TikTok in your browser first."
          });
          return;
        }

        // Strict verification: does detected user match the required account?
        if (expected && detectedUsername !== expected) {
          sendResponse({
            success: false,
            error: `Access Denied: You are signed into TikTok as @${detectedUsername}, but this vault belongs to @${expected}. Please switch to @${expected} on TikTok.`
          });
          return;
        }

        // 100% Verified Match!
        sendResponse({
          success: true,
          username: detectedUsername
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: `Error inspecting TikTok tab: ${err?.message || "Unknown error"}`
        });
      }
    });

    return true; // Keep message port open for async response
  }
});
