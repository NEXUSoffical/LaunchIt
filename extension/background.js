/**
 * LaunchIt Extension Service Worker
 * Real TikTok Authentication & Identity Verification
 */

async function clearAllTikTokSession() {
  // 1. Clear browsing data (cache, cookies, localStorage, indexedDB, serviceWorkers)
  try {
    if (chrome.browsingData && chrome.browsingData.remove) {
      await chrome.browsingData.remove(
        {
          origins: [
            "https://www.tiktok.com",
            "https://tiktok.com",
            "https://passport.tiktok.com",
            "https://m.tiktok.com",
            "https://login.tiktok.com"
          ]
        },
        {
          cache: true,
          cookies: true,
          localStorage: true,
          indexedDB: true,
          serviceWorkers: true
        }
      );
    }
  } catch (e) {
    console.warn("browsingData.remove error:", e);
  }

  // 2. Comprehensive cookie wiping across all cookies matching tiktok or bytedance
  try {
    const allCookies = await chrome.cookies.getAll({});
    for (const c of allCookies) {
      if (
        c.domain.includes("tiktok.com") ||
        c.domain.includes("bytedance.com") ||
        c.domain.includes("byteoversea.com")
      ) {
        const protocol = c.secure ? "https://" : "http://";
        const domainClean = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
        try {
          await chrome.cookies.remove({
            url: `${protocol}${domainClean}${c.path}`,
            name: c.name,
            storeId: c.storeId
          });
        } catch (_) {}
      }
    }
  } catch (e) {
    console.warn("cookie wiping error:", e);
  }

  // 3. Clear cookies by exact URL endpoints
  const urls = [
    "https://www.tiktok.com/",
    "https://tiktok.com/",
    "https://passport.tiktok.com/",
    "https://m.tiktok.com/",
    "https://login.tiktok.com/"
  ];
  for (const url of urls) {
    try {
      const cookies = await chrome.cookies.getAll({ url });
      for (const c of cookies) {
        try {
          await chrome.cookies.remove({ url, name: c.name, storeId: c.storeId });
        } catch (_) {}
      }
    } catch (_) {}
  }

  // 4. Invalidate session on TikTok's server
  try {
    await fetch("https://www.tiktok.com/passport/web/account/logout/", {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
  } catch (_) {}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TIKTOK_LOGIN_COMPLETED") {
    const username = (request.username || "").trim().toLowerCase();
    if (!username) return;

    if (sender?.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {});
    }
    // Broadcast to any LaunchIt tabs
    try {
      chrome.tabs.query({ url: ["https://launchit.world/*", "http://localhost/*", "http://127.0.0.1/*"] }, (tabs) => {
        for (const t of tabs || []) {
          if (t.id) {
            chrome.tabs.sendMessage(t.id, {
              type: "TIKTOK_LOGIN_COMPLETED",
              username: username
            }).catch(() => {});
          }
        }
      });
    } catch (_) {}
    return;
  }

  if (request.type === "OPEN_TIKTOK_LOGIN") {
    (async () => {
      try {
        const expected = (request.expectedHandle || "").replace("@", "").trim().toLowerCase();

        // 1. Clear all existing sessions so user is NEVER locked into the wrong account or greeted with "Already logged in"
        await clearAllTikTokSession();

        // 2. Open clean login popup
        const win = await chrome.windows.create({
          url: "https://www.tiktok.com/login",
          type: "popup",
          width: 550,
          height: 750,
          focused: true
        });

        const tabId = win?.tabs?.[0]?.id;

        // 3. Monitor login popup navigation to verify when login is completed
        if (tabId) {
          const tabListener = async (updatedTabId, changeInfo, tab) => {
            if (updatedTabId !== tabId) return;

            if (changeInfo.status === "complete" && tab.url) {
              const url = tab.url.toLowerCase();
              if (url.includes("/login") || url.includes("/signup")) {
                return; // User is entering credentials
              }

              // Navigated away from login screen! Check logged in account
              try {
                const results = await chrome.scripting.executeScript({
                  target: { tabId },
                  func: async () => {
                    try {
                      const res = await fetch("/passport/web/account/info/", { credentials: "include" });
                      if (res.ok) {
                        const d = await res.json();
                        const u = d?.data?.username || d?.data?.screen_name || d?.data?.unique_id;
                        if (u && typeof u === "string" && !u.includes("session")) return u.trim();
                      }
                    } catch (_) {}
                    return null;
                  }
                });

                const loggedInUser = (results?.[0]?.result || "").toLowerCase().trim();
                if (loggedInUser) {
                  if (expected && loggedInUser !== expected) {
                    // Mismatched account! Wipe session and return to login screen
                    await clearAllTikTokSession();
                    chrome.tabs.update(tabId, { url: "https://www.tiktok.com/login" }).catch(() => {});
                    chrome.tabs.query({ url: ["https://launchit.world/*", "http://localhost/*", "http://127.0.0.1/*"] }, (tabs) => {
                      for (const t of tabs || []) {
                        if (t.id) {
                          chrome.tabs.sendMessage(t.id, {
                            type: "TIKTOK_WRONG_ACCOUNT",
                            detected: loggedInUser,
                            expected: expected
                          }).catch(() => {});
                        }
                      }
                    });
                    return;
                  }

                  // Login matched! Close window and broadcast
                  chrome.tabs.onUpdated.removeListener(tabListener);
                  chrome.windows.remove(win.id).catch(() => {});

                  chrome.tabs.query({ url: ["https://launchit.world/*", "http://localhost/*", "http://127.0.0.1/*"] }, (tabs) => {
                    for (const t of tabs || []) {
                      if (t.id) {
                        chrome.tabs.sendMessage(t.id, {
                          type: "TIKTOK_LOGIN_COMPLETED",
                          username: loggedInUser
                        }).catch(() => {});
                      }
                    }
                  });
                }
              } catch (_) {}
            }
          };

          chrome.tabs.onUpdated.addListener(tabListener);

          chrome.windows.onRemoved.addListener(function onWinRemoved(closedWinId) {
            if (closedWinId === win.id) {
              chrome.tabs.onUpdated.removeListener(tabListener);
              chrome.windows.onRemoved.removeListener(onWinRemoved);
            }
          });
        }

        sendResponse({ success: true, windowId: win?.id });
      } catch (err) {
        sendResponse({ success: false, error: err?.message });
      }
    })();
    return true;
  }

  if (request.type === "LOGOUT_TIKTOK") {
    (async () => {
      try {
        await clearAllTikTokSession();
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err?.message });
      }
    })();
    return true;
  }

  if (request.type === "CHECK_TIKTOK_AUTH") {
    const expected = (request.expectedHandle || "").replace("@", "").trim().toLowerCase();

    (async () => {
      try {
        // 1. Check if user has active TikTok session cookies
        const cookies = await chrome.cookies.getAll({ domain: ".tiktok.com" });
        const hasSession = cookies.some(
          (c) => (c.name === "sessionid" || c.name === "sessionid_ss" || c.name === "sid_tt" || c.name === "sid_guard") && c.value && c.value.length > 5
        );

        if (!hasSession) {
          sendResponse({
            success: false,
            error: expected
              ? `No active TikTok login detected. You are not logged into TikTok. Please sign into @${expected} on TikTok.`
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
                func: async () => {
                  try {
                    const res = await fetch("/passport/web/account/info/", { credentials: "include" });
                    if (res.ok) {
                      const data = await res.json();
                      const p = data?.data?.username || data?.data?.screen_name || data?.data?.unique_id;
                      if (p && typeof p === "string" && !p.includes("session")) return p;
                    }
                  } catch (_) {}

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

        // 4. Try fetching TikTok homepage to parse uniqueId from rehydration JSON
        if (!detectedUsername) {
          try {
            const htmlRes = await fetch("https://www.tiktok.com/", {
              credentials: "include",
              headers: { "Accept": "text/html" }
            });
            if (htmlRes.ok) {
              const html = await htmlRes.text();
              const m = html.match(/"uniqueId":"([a-zA-Z0-9_\.\-]+)"/i) ||
                        html.match(/"unique_id":"([a-zA-Z0-9_\.\-]+)"/i);
              if (m && m[1] && !["foryou", "live", "explore"].includes(m[1].toLowerCase())) {
                detectedUsername = m[1].toLowerCase().trim();
              }
            }
          } catch (_) {}
        }

        // 5. Validate detection result
        if (!detectedUsername) {
          sendResponse({
            success: false,
            error: expected
              ? `You have TikTok cookies, but we could not confirm your username. Please open TikTok and ensure you are signed into @${expected}.`
              : "Unable to detect your TikTok username. Please log into TikTok in your browser."
          });
          return;
        }

        // 7. Auto-close completed popup windows (ONLY if on /foryou or home feed, NEVER on /login or /signup)
        try {
          const allTabs = await chrome.tabs.query({ url: "*://*.tiktok.com/*" });
          for (const t of allTabs) {
            if (t.id && t.url && (t.url.includes("/foryou") || t.url.endsWith("tiktok.com/"))) {
              const win = await chrome.windows.get(t.windowId);
              if (win && (win.type === "popup" || (win.width && win.width <= 650))) {
                await chrome.tabs.remove(t.id);
              }
            }
          }
        } catch (_) {}

        // 8. Strict Account Match Check
        if (expected && detectedUsername !== expected) {
          sendResponse({
            success: false,
            detectedUsername: detectedUsername,
            error: `Access Denied: You are signed into TikTok as @${detectedUsername}, but this royalty vault belongs strictly to @${expected}. Only the verified creator can claim these funds.`
          });
          return;
        }

        // 9. 100% Verified Match!
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
