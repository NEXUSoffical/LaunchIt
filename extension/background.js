/**
 * LaunchIt Extension Service Worker
 * Real TikTok Authentication & Strict Identity Verification
 */

async function clearAllTikTokSession() {
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

  try {
    await fetch("https://www.tiktok.com/passport/web/account/logout/", {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
  } catch (_) {}
}

/**
 * Strictly retrieves the REAL authenticated TikTok username.
 * Returns null if unauthenticated or unknown. NEVER returns fake or fallback usernames.
 */
async function getActiveTikTokUser() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: ".tiktok.com" });
    const hasSession = cookies.some(
      (c) =>
        (c.name === "sessionid" ||
          c.name === "sessionid_ss" ||
          c.name === "sid_tt" ||
          c.name === "sid_guard") &&
        c.value &&
        c.value.length > 5
    );

    if (!hasSession) return null;

    // 1. Try TikTok Passport API directly using background session credentials
    try {
      const passportRes = await fetch("https://www.tiktok.com/passport/web/account/info/", {
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      if (passportRes.ok) {
        const passportData = await passportRes.json();
        const pUser =
          passportData?.data?.username ||
          passportData?.data?.screen_name ||
          passportData?.data?.unique_id;
        if (pUser && typeof pUser === "string" && !pUser.includes("session") && pUser.trim().length > 0) {
          return pUser.toLowerCase().trim();
        }
      }
    } catch (_) {}

    // 2. Fetch TikTok homepage and parse uniqueId from rehydration JSON
    try {
      const htmlRes = await fetch("https://www.tiktok.com/", {
        credentials: "include",
        headers: { Accept: "text/html" }
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const m =
          html.match(/"uniqueId":"([a-zA-Z0-9_\.\-]+)"/i) ||
          html.match(/"unique_id":"([a-zA-Z0-9_\.\-]+)"/i);
        if (m && m[1] && !["foryou", "live", "explore", "following", "friends"].includes(m[1].toLowerCase())) {
          return m[1].toLowerCase().trim();
        }
      }
    } catch (_) {}

    // 3. Check open TikTok tabs
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
            try {
              const stateEl = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
              if (stateEl) {
                const data = JSON.parse(stateEl.textContent || "{}");
                const defaultScope = data?.["__DEFAULT_SCOPE__"] || {};
                const user =
                  defaultScope?.["webapp.user-detail"]?.userInfo?.user?.uniqueId ||
                  defaultScope?.["webapp.app-context"]?.user?.uniqueId;
                if (user && typeof user === "string" && !["foryou", "live", "explore"].includes(user.toLowerCase())) {
                  return user;
                }
              }
            } catch (_) {}
            return null;
          }
        });
        const user = (results?.[0]?.result || "").toLowerCase().trim();
        if (user && !["foryou", "live", "explore"].includes(user)) return user;
      } catch (_) {}
    }

    // STRICT: Return null if username cannot be verified with certainty
    return null;
  } catch (err) {
    console.warn("getActiveTikTokUser error:", err);
    return null;
  }
}

function broadcastToLaunchIt(payload) {
  try {
    chrome.tabs.query({}, (tabs) => {
      for (const t of tabs || []) {
        if (!t.id || !t.url) continue;
        const u = t.url.toLowerCase();
        if (
          u.includes("launchit.world") ||
          u.includes("localhost:") ||
          u.includes("127.0.0.1:")
        ) {
          chrome.tabs.sendMessage(t.id, payload).catch(() => {});
        }
      }
    });
  } catch (_) {}
}

let activeAuthWindowId = null;
let activeAuthTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // If content script in auth popup navigated away from login form, close immediately
  if (request.type === "TIKTOK_AUTH_NAVIGATED") {
    if (activeAuthWindowId) {
      chrome.windows.remove(activeAuthWindowId).catch(() => {});
      activeAuthWindowId = null;
    }
    if (activeAuthTabId) {
      chrome.tabs.remove(activeAuthTabId).catch(() => {});
      activeAuthTabId = null;
    }
    return;
  }

  if (request.type === "OPEN_TIKTOK_LOGIN") {
    (async () => {
      try {
        const expected = (request.expectedHandle || "").replace("@", "").trim().toLowerCase();
        const forceSwitch = !!request.forceSwitch;

        if (forceSwitch) {
          await clearAllTikTokSession();
        } else {
          // Check if already authenticated as the expected user
          const currentUser = await getActiveTikTokUser();
          if (currentUser) {
            const isMatch = currentUser.toLowerCase() === expected.toLowerCase();
            broadcastToLaunchIt({
              type: "TIKTOK_AUTH_VERIFIED",
              detectedUsername: currentUser,
              expectedUsername: expected,
              isMatch: isMatch,
              error: isMatch
                ? null
                : `Access Denied: You are signed into TikTok as @${currentUser}, but this royalty vault belongs strictly to @${expected}. Only @${expected} can claim these creator royalties.`
            });
            sendResponse({ success: true, alreadyLoggedIn: true, detectedUsername: currentUser, isMatch });
            return;
          }
        }

        // Open clean login popup
        const win = await chrome.windows.create({
          url: `https://www.tiktok.com/login#launchit_auth=1&creator=${expected}`,
          type: "popup",
          width: 550,
          height: 750,
          focused: true
        });

        const tabId = win?.tabs?.[0]?.id;
        const winId = win?.id;
        activeAuthWindowId = winId;
        activeAuthTabId = tabId;

        let isDone = false;

        const processAuthResult = async () => {
          if (isDone) return;
          isDone = true;

          clearInterval(poller);
          chrome.tabs.onUpdated.removeListener(tabListener);

          // IMMEDIATELY CLOSE THE POPUP WINDOW so videos and ads never load or play
          if (winId) chrome.windows.remove(winId).catch(() => {});
          if (tabId) chrome.tabs.remove(tabId).catch(() => {});
          activeAuthWindowId = null;
          activeAuthTabId = null;

          // Query the REAL authenticated username with retries
          let realUser = await getActiveTikTokUser();
          if (!realUser) {
            await new Promise((r) => setTimeout(r, 600));
            realUser = await getActiveTikTokUser();
          }

          if (!realUser) {
            broadcastToLaunchIt({
              type: "TIKTOK_AUTH_VERIFIED",
              detectedUsername: null,
              expectedUsername: expected,
              isMatch: false,
              error: `Verification Failed: Could not detect authenticated TikTok account. Please make sure you signed in.`
            });
            return;
          }

          // STRICT CHECK: Does the detected user match the expected creator?
          const isMatch = realUser.toLowerCase() === expected.toLowerCase();

          broadcastToLaunchIt({
            type: "TIKTOK_AUTH_VERIFIED",
            detectedUsername: realUser,
            expectedUsername: expected,
            isMatch: isMatch,
            error: isMatch
              ? null
              : `Access Denied: You signed into TikTok as @${realUser}, but this royalty vault belongs strictly to @${expected}. You are not authorized to claim this creator's rewards.`
          });
        };

        // 1. Fast Cookie Poller (detects login completion as soon as session cookies are written)
        const poller = setInterval(async () => {
          if (isDone) {
            clearInterval(poller);
            return;
          }
          const user = await getActiveTikTokUser();
          if (user) {
            await processAuthResult();
          }
        }, 300);

        // 2. Tab Navigation Listener: Close immediately if page navigates away from /login
        const tabListener = async (updatedTabId, changeInfo, tab) => {
          if (updatedTabId !== tabId || isDone) return;

          const currentUrl = (tab.url || changeInfo.url || "").toLowerCase();
          if (!currentUrl) return;

          if (
            currentUrl.includes("/foryou") ||
            currentUrl.includes("/@") ||
            (currentUrl.includes("tiktok.com/") &&
              !currentUrl.includes("/login") &&
              !currentUrl.includes("/signup") &&
              !currentUrl.includes("/logout"))
          ) {
            // Close instantly! Never let it buffer videos!
            if (tabId) chrome.tabs.remove(tabId).catch(() => {});
            if (winId) chrome.windows.remove(winId).catch(() => {});
            await processAuthResult();
          }
        };

        chrome.tabs.onUpdated.addListener(tabListener);

        if (winId) {
          chrome.windows.onRemoved.addListener(function onWinRemoved(closedWinId) {
            if (closedWinId === winId) {
              clearInterval(poller);
              chrome.tabs.onUpdated.removeListener(tabListener);
              chrome.windows.onRemoved.removeListener(onWinRemoved);
              if (!isDone) {
                // If user closed the window manually, check if they signed in
                getActiveTikTokUser().then((user) => {
                  if (user) {
                    const isMatch = user.toLowerCase() === expected.toLowerCase();
                    broadcastToLaunchIt({
                      type: "TIKTOK_AUTH_VERIFIED",
                      detectedUsername: user,
                      expectedUsername: expected,
                      isMatch: isMatch,
                      error: isMatch
                        ? null
                        : `Access Denied: You signed into TikTok as @${user}, but this royalty vault belongs strictly to @${expected}.`
                    });
                  }
                });
              }
            }
          });
        }

        sendResponse({ success: true, windowId: winId });
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
        const detectedUsername = await getActiveTikTokUser();

        if (!detectedUsername) {
          sendResponse({
            success: false,
            error: expected
              ? `No active TikTok login detected for @${expected}. Please sign in to verify ownership.`
              : "No active TikTok login detected. Please sign into TikTok."
          });
          return;
        }

        const isMatch = !expected || detectedUsername.toLowerCase() === expected.toLowerCase();

        sendResponse({
          success: isMatch,
          detectedUsername: detectedUsername,
          expectedUsername: expected,
          isMatch: isMatch,
          error: isMatch
            ? null
            : `Access Denied: You are signed into TikTok as @${detectedUsername}, but this royalty vault belongs strictly to @${expected}.`
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: `Verification error: ${err?.message || "Unknown error"}`
        });
      }
    })();

    return true;
  }
});
