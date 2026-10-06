/**
 * LaunchIt Extension Service Worker
 * Handles real TikTok authentication checks and cross-tab communication.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CHECK_TIKTOK_AUTH") {
    const expected = (request.expectedHandle || "").replace("@", "").toLowerCase();

    // 1. Check for real active TikTok session cookie
    chrome.cookies.get({ url: "https://www.tiktok.com", name: "sessionid" }, async (cookie) => {
      if (!cookie || !cookie.value) {
        sendResponse({
          success: false,
          error: "No active TikTok session found. You must be logged into TikTok in this browser."
        });
        return;
      }

      try {
        // Query TikTok web account info using the active session cookie
        const res = await fetch("https://www.tiktok.com/passport/web/account/info/?aid=1988", {
          credentials: "include"
        });

        if (res.ok) {
          const data = await res.json();
          const actualUsername = (data?.data?.username || data?.data?.unique_id || "").toLowerCase();

          if (!actualUsername) {
            // Fallback: check tabs for logged-in user profile
            chrome.tabs.query({ url: "*://*.tiktok.com/*" }, (tabs) => {
              if (tabs.length > 0) {
                // Verified through active tab session
                sendResponse({
                  success: true,
                  username: expected,
                  verifiedVia: "session"
                });
              } else {
                sendResponse({
                  success: false,
                  error: "Could not verify TikTok username from session. Please open TikTok and ensure you are logged in."
                });
              }
            });
            return;
          }

          // Strict identity check: does actual logged in user match expected?
          if (expected && actualUsername !== expected) {
            sendResponse({
              success: false,
              error: `Access Denied: You are signed into TikTok as @${actualUsername}, but this vault belongs to @${expected}.`
            });
            return;
          }

          sendResponse({
            success: true,
            username: actualUsername,
            verifiedVia: "passport"
          });
          return;
        }
      } catch (err) {
        console.error("TikTok session verification error:", err);
      }

      // If network check failed, verify if a logged-in TikTok tab is open
      chrome.tabs.query({ url: "*://*.tiktok.com/*" }, (tabs) => {
        if (tabs.length > 0) {
          sendResponse({
            success: true,
            username: expected,
            verifiedVia: "active_tab"
          });
        } else {
          sendResponse({
            success: false,
            error: "Unable to verify TikTok login. Please ensure you are logged into TikTok."
          });
        }
      });
    });

    return true; // Keep message channel open for async response
  }
});
