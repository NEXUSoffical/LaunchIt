/**
 * LaunchIt Extension Service Worker
 * Real TikTok Authentication & Identity Verification
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TIKTOK_LOGIN_COMPLETED") {
    if (sender?.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {});
    }
    return;
  }

  if (request.type === "LOGOUT_TIKTOK") {
    (async () => {
      try {
        const cookies = await chrome.cookies.getAll({ domain: ".tiktok.com" });
        for (const c of cookies) {
          try {
            await chrome.cookies.remove({
              url: (c.secure ? "https://" : "http://") + c.domain.replace(/^\./, "") + c.path,
              name: c.name
            });
          } catch (_) {}
        }
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.type === "CHECK_TIKTOK_AUTH") {
    const expected = (request.expectedHandle || "").replace("@", "").trim().toLowerCase();

    (async () => {
      try {
        // 1. Check if user even has active TikTok session cookies
        const cookies = await chrome.cookies.getAll({ domain: ".tiktok.com" });
        const hasSession = cookies.some(
          (c) => (c.name === "sessionid" || c.name === "sessionid_ss" || c.name === "sid_tt") && c.value && c.value.length > 5
        );

        if (!hasSession) {
          sendResponse({
            success: false,
            error: expected
              ? `No active TikTok login detected. You are not logged into TikTok. Please sign into @${expected} on TikTok first.`
              : "No active TikTok login detected. Please sign into TikTok first."
          });
          return;
        }

        let detectedUsername = "";

        // 2. Try TikTok Passport API directly using session credentials
        try {
          const passportRes = await fetch("https://www.tiktok.com/passport/web/account/info/", {
            credentials: "include",
            headers: { "Accept": "application/json" }
          });
          if (passportRes.ok) {
            const passportData = await passportRes.json();
            const pUser = passportData?.data?.username || passportData?.data?.screen_name || passportData?.data?.unique_id;
            if (pUser && typeof pUser === "string" && !pUser.includes("session")) {
              detectedUsername = pUser.toLowerCase().trim();
            }
          }
        } catch (_) {}

        // 3. If passport didn't return username, inspect open TikTok tabs
        if (!detectedUsername) {
          const tabs = await chrome.tabs.query({ url: "*://*.tiktok.com/*" });
          for (const tab of tabs) {
            if (!tab.id) continue;
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  // Profile nav selectors
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
                      if (handle && !["foryou", "live", "explore", "following", "friends"].includes(handle.toLowerCase())) {
                        return handle;
                      }
                    }
                  }

                  // Universal data script
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

                  // SIGI state script
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

              const user = (results?.[0]?.result || "").toLowerCase().trim();
              if (user) {
                detectedUsername = user;
                break;
              }
            } catch (_) {}
          }
        }

        // 4. Validate detection result
        if (!detectedUsername) {
          sendResponse({
            success: false,
            error: expected
              ? `You have TikTok cookies, but we could not confirm your username. Please open TikTok and ensure you are signed into @${expected}.`
              : "Unable to detect your TikTok username. Please log into TikTok in your browser."
          });
          return;
        }

        // Auto-close any popup TikTok login windows so they never play the video feed
        try {
          const allTabs = await chrome.tabs.query({ url: "*://*.tiktok.com/*" });
          for (const t of allTabs) {
            if (t.id && t.url && (t.url.includes("/login") || t.url.includes("/signup") || t.url.includes("/foryou"))) {
              const win = await chrome.windows.get(t.windowId);
              if (win && (win.type === "popup" || (win.width && win.width <= 650))) {
                await chrome.tabs.remove(t.id);
              }
            }
          }
        } catch (_) {}

        // 5. Strict Account Match Check: Does detected username match the expected vault owner?
        if (expected && detectedUsername !== expected) {
          sendResponse({
            success: false,
            detectedUsername: detectedUsername,
            error: `Access Denied: You are signed into TikTok as @${detectedUsername}, but this royalty vault belongs strictly to @${expected}. Only the verified owner can claim these funds.`
          });
          return;
        }

        // 6. 100% Verified Match!
        sendResponse({
          success: true,
          username: detectedUsername
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: `Verification error: ${err?.message || "Unknown error"}`
        });
      }
    })();

    return true; // Keep sendResponse open for async
  }
});
