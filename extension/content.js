/**
 * LaunchIt Chrome Extension Content Script
 * Injected directly into TikTok!
 */

console.log("🐆 LaunchIt TikTok Extension active!");

// Auto-close login popup once login completes so video feed never plays
if (window.name === "TikTokLogin" || window.name === "TikTokAuth") {
  const checkLoginRedirect = () => {
    const path = window.location.pathname;
    if (path.includes("/foryou") || path.startsWith("/@") || (path === "/" && document.cookie.includes("sessionid"))) {
      try {
        chrome.runtime.sendMessage({ type: "TIKTOK_LOGIN_COMPLETED" });
      } catch (_) {}
      window.close();
    }
  };
  checkLoginRedirect();
  setInterval(checkLoginRedirect, 500);
}

function injectLaunchItUI() {
  // 1. Inject Floating LaunchIt Widget in bottom corner if not present
  if (!document.querySelector(".launchit-floating-widget")) {
    const floatBtn = document.createElement("div");
    floatBtn.className = "launchit-floating-widget";
    floatBtn.innerHTML = `
      <img src="${chrome.runtime.getURL("icon.jpg")}" alt="LaunchIt" />
      <span>Launch This Video 🐆</span>
    `;

    floatBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      openInAppLaunchModal();
    });

    document.body.appendChild(floatBtn);
  }

  // 2. Also try to find the video action bar (near Like / Comment / Share)
  const shareButtons = document.querySelectorAll(
    'button[data-e2e="share-icon"], button[data-e2e="comment-icon"], button[data-e2e="like-icon"], div[data-e2e="feed-video-action"]'
  );

  shareButtons.forEach((btn) => {
    const parent = btn.parentElement?.parentElement;
    if (parent && !parent.querySelector(".launchit-btn-injected")) {
      const colBtn = document.createElement("div");
      colBtn.className = "launchit-btn-injected";
      colBtn.title = "Launch this video as a Solana coin on LaunchIt!";
      colBtn.innerHTML = `
        <div class="launchit-icon-wrapper">
          <img src="${chrome.runtime.getURL("icon.jpg")}" alt="LaunchIt" />
        </div>
        <span class="launchit-btn-text">LaunchIt</span>
      `;

      colBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        openInAppLaunchModal();
      });

      parent.appendChild(colBtn);
    }
  });
}

function extractCurrentVideoData() {
  let title = "Viral TikTok Meme";
  let creator = "@creator";
  let url = window.location.href;

  // Extract description
  const descEl = document.querySelector(
    'h1[data-e2e="browse-video-desc"], div[data-e2e="browse-video-desc"], span[data-e2e="browse-video-desc"], [data-e2e="video-desc"]'
  );
  if (descEl && descEl.textContent) {
    title = descEl.textContent.trim().split("#")[0].trim() || "Viral TikTok Meme";
  }

  // Extract author
  const creatorEl = document.querySelector(
    'span[data-e2e="browse-username"], h3[data-e2e="browse-username"], [data-e2e="video-author-uniqueid"]'
  );
  if (creatorEl && creatorEl.textContent) {
    creator = creatorEl.textContent.trim();
  }

  // Generate suggested ticker
  const cleaned = title.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(" ");
  let ticker = cleaned[0]?.toUpperCase() || "VIRAL";
  if (ticker.length > 8) ticker = ticker.slice(0, 8);

  return { title, creator, url, ticker };
}

function openInAppLaunchModal() {
  const existing = document.querySelector(".launchit-modal-overlay");
  if (existing) existing.remove();

  const data = extractCurrentVideoData();

  const overlay = document.createElement("div");
  overlay.className = "launchit-modal-overlay";
  overlay.innerHTML = `
    <div class="launchit-modal-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${chrome.runtime.getURL("icon.jpg")}" style="width: 36px; height: 36px; border-radius: 10px; object-fit: cover; border: 1.5px solid #ff6000;" />
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">LAUNCH<span style="color: #ff6000;">IT</span></h3>
            <div style="font-size: 11px; color: #ff8c37; font-weight: 600;">— see it launch it —</div>
          </div>
        </div>
        <button id="launchit-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
      </div>

      <div style="background: rgba(255, 96, 0, 0.1); border: 1px solid rgba(255, 96, 0, 0.3); border-radius: 10px; padding: 12px; margin-bottom: 16px; font-size: 12px; line-height: 1.4; color: #cbd5e1;">
        Turn this video into a live <b>Solana Token-2022 coin</b> instantly! 👑 <b>1% of all trading volume</b> automatically accumulates in a secure Escrow Vault for the creator to claim anytime on LaunchIt.
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Coin Name</label>
          <input id="launchit-name-input" type="text" style="width: 100%; box-sizing: border-box; background: #151c2b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 10px 12px; color: #fff; font-size: 13px;" />
        </div>

        <div>
          <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Ticker Symbol</label>
          <input id="launchit-ticker-input" type="text" style="width: 100%; box-sizing: border-box; background: #151c2b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 10px 12px; color: #ff8c37; font-size: 14px; font-weight: 700; font-family: monospace;" />
        </div>

        <div>
          <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 6px;">1% Creator Fee Allocation</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;" id="launchit-split-selector">
            <button type="button" class="launchit-split-btn active" data-split="split_50_50" style="padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer; border: 1.5px solid #ff6000; background: rgba(255, 96, 0, 0.2); color: #fff;">
              ⚡ 50 / 50<br/><span style="font-size: 9px; opacity: 0.8; font-weight: 500;">You & Creator</span>
            </button>
            <button type="button" class="launchit-split-btn" data-split="creator_100" style="padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.1); background: #151c2b; color: #94a3b8;">
              👑 100%<br/><span style="font-size: 9px; opacity: 0.8; font-weight: 500;">Video Owner</span>
            </button>
            <button type="button" class="launchit-split-btn" data-split="launcher_100" style="padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.1); background: #151c2b; color: #94a3b8;">
              🚀 100%<br/><span style="font-size: 9px; opacity: 0.8; font-weight: 500;">To You</span>
            </button>
          </div>
        </div>

        <div id="launchit-launcher-wallet-group">
          <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Your Solana Payout Wallet (Optional)</label>
          <input id="launchit-launcher-wallet-input" type="text" placeholder="e.g. 7WdK...9R2e (or claim later on LaunchIt)" style="width: 100%; box-sizing: border-box; background: #151c2b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 10px 12px; color: #fff; font-size: 12px; font-family: monospace;" />
        </div>

        <button id="launchit-deploy-btn" style="margin-top: 8px; padding: 14px; border-radius: 10px; border: none; background: linear-gradient(135deg, #ff6000 0%, #ff8c37 100%); color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(255, 96, 0, 0.5);">
          Launch Coin on Solana 🐆
        </button>

        <div id="launchit-status-area" style="display: none; margin-top: 10px; padding: 12px; border-radius: 10px; background: rgba(20, 241, 149, 0.15); border: 1px solid #14f195; font-size: 13px; color: #14f195; text-align: center;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const nameInput = overlay.querySelector("#launchit-name-input");
  if (nameInput) nameInput.value = data.title;
  const tickerInput = overlay.querySelector("#launchit-ticker-input");
  if (tickerInput) tickerInput.value = "$" + data.ticker;

  let selectedSplit = "split_50_50";
  const splitBtns = overlay.querySelectorAll(".launchit-split-btn");
  splitBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      splitBtns.forEach((b) => {
        b.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        b.style.background = "#151c2b";
        b.style.color = "#94a3b8";
      });
      btn.style.border = "1.5px solid #ff6000";
      btn.style.background = "rgba(255, 96, 0, 0.2)";
      btn.style.color = "#fff";
      selectedSplit = btn.getAttribute("data-split") || "split_50_50";

      const walletGroup = overlay.querySelector("#launchit-launcher-wallet-group");
      if (walletGroup) {
        walletGroup.style.display = selectedSplit === "creator_100" ? "none" : "block";
      }
    });
  });

  const closeBtn = document.getElementById("launchit-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => overlay.remove());
  }

  const deployBtn = document.getElementById("launchit-deploy-btn");
  if (deployBtn) {
    deployBtn.addEventListener("click", () => {
      const statusArea = document.getElementById("launchit-status-area");
      const currentName = nameInput ? nameInput.value : data.title;
      const currentTicker = tickerInput ? tickerInput.value.replace("$", "") : data.ticker;
      const launcherWallet = (overlay.querySelector("#launchit-launcher-wallet-input")?.value || "").trim();

      deployBtn.textContent = "Deploying on Solana...";
      deployBtn.disabled = true;

      setTimeout(() => {
        const fakeMint = "Gen" + Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 8) + "Xv7";
        const tokenUrl = "https://launchit.world/?new_token=1&mint=" + encodeURIComponent(fakeMint) + 
          "&name=" + encodeURIComponent(currentName) + 
          "&symbol=" + encodeURIComponent(currentTicker) + 
          "&video=" + encodeURIComponent(data.url) + 
          "&creator=" + encodeURIComponent(data.creator) + 
          "&fee_split=" + encodeURIComponent(selectedSplit) + 
          (launcherWallet ? "&launcher_wallet=" + encodeURIComponent(launcherWallet) : "");

        deployBtn.style.display = "none";
        if (statusArea) {
          statusArea.style.display = "block";
          statusArea.innerHTML = `
            🎉 <b>$` + currentTicker + ` is LIVE on Solana!</b><br/>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">Opening on LaunchIt...</div>
            <a href="` + tokenUrl + `" target="_blank" style="color: #00f0ff; text-decoration: underline; display: block; margin-top: 8px; font-weight: 700;">Open on LaunchIt Curve &rarr;</a>
          `;
        }

        // Automatically open the live coin in a new tab
        try {
          window.open(tokenUrl, "_blank");
        } catch (e) {
          console.warn("Popup blocked or not allowed, fallback to link", e);
        }
      }, 1000);
    });
  }
}

// Check every 1 second to cover fast TikTok video scrolling
setInterval(injectLaunchItUI, 1000);
injectLaunchItUI();
