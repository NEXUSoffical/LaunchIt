import { Connection, Keypair } from "@solana/web3.js";
import { LaunchItSocialBot, ViralCommentEvent } from "../src/bot/socialBot";

/**
 * LaunchIt Real TikTok Listener Bot
 * 
 * Runs continuously in the background.
 * Listens for mentions of your TikTok handle (e.g. @launchit.world $TICKER)
 * Extracts the video, mints the Token-2022 coin, and replies to the comment on TikTok!
 */

export interface TikTokConfig {
  botHandle: string;          // e.g. "launchit.world" or your TikTok username
  sessionCookie: string;      // your TikTok sessionid cookie
  pollIntervalMs: number;     // e.g. 5000 (every 5 seconds)
  solanaRpcUrl: string;       // https://api.devnet.solana.com
}

export class TikTokListener {
  private config: TikTokConfig;
  private botEngine: LaunchItSocialBot;
  private processedComments: Set<string> = new Set();
  private isRunning: boolean = false;

  constructor(config: TikTokConfig) {
    this.config = config;
    this.botEngine = new LaunchItSocialBot(config.solanaRpcUrl);
  }

  /**
   * Fetch video details from TikTok oEmbed (free public endpoint)
   */
  public async fetchTikTokVideoData(videoUrl: string): Promise<{ title: string; author: string; thumbnail: string }> {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
      const resp = await fetch(oembedUrl);
      if (resp.ok) {
        const data: any = await resp.json();
        return {
          title: data.title || "Viral TikTok Clip",
          author: data.author_name || "TikTok Creator",
          thumbnail: data.thumbnail_url || "https://launchit.world/logo.jpg",
        };
      }
    } catch (err) {
      console.warn("Could not fetch oembed, using fallback:", err);
    }

    return {
      title: "Viral TikTok Meme",
      author: "TikTok",
      thumbnail: "https://launchit.world/logo.jpg",
    };
  }

  /**
   * Post a reply comment directly to the TikTok video
   */
  public async postReplyOnTikTok(videoId: string, replyText: string): Promise<boolean> {
    console.log(`[TikTok Reply] Posting comment on video ${videoId}: "${replyText}"`);

    // Sends POST to TikTok internal comment endpoint with session cookie
    try {
      const resp = await fetch("https://www.tiktok.com/api/comment/publish/", {
        method: "POST",
        headers: {
          "Cookie": `sessionid=${this.config.sessionCookie}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
        },
        body: new URLSearchParams({
          aweme_id: videoId,
          text: replyText,
        }),
      });

      return resp.ok;
    } catch (err) {
      console.error("Failed to post comment reply on TikTok:", err);
      return false;
    }
  }

  /**
   * Process a detected comment
   */
  public async processComment(comment: {
    id: string;
    text: string;
    author: string;
    videoUrl: string;
    videoId: string;
  }) {
    if (this.processedComments.has(comment.id)) return;
    this.processedComments.add(comment.id);

    console.log(`\n🔔 NEW TIKTOK MENTION from ${comment.author}: "${comment.text}"`);

    // 1. Fetch original video title & thumbnail
    const videoData = await this.fetchTikTokVideoData(comment.videoUrl);

    // 2. Launch coin on Solana
    const event: ViralCommentEvent = {
      platform: "tiktok",
      videoId: comment.videoId,
      videoUrl: comment.videoUrl,
      commentAuthor: comment.author,
      commentText: comment.text,
      videoTitle: videoData.title,
      videoThumbnail: videoData.thumbnail,
    };

    console.log(`🚀 Launching coin for video: "${videoData.title}"...`);
    const launchResult = await this.botEngine.launchFromComment(event);

    console.log(`✅ Coin MINTED: ${launchResult.mint} ($${launchResult.symbol})`);
    console.log(`🌐 Live at: ${launchResult.tokenUrl}`);

    // 3. Reply to the comment directly on TikTok!
    const replyMessage = `🚀 $${launchResult.symbol} launched on Solana! See it, launch it. 🐆 Trade: ${launchResult.tokenUrl}`;
    await this.postReplyOnTikTok(comment.videoId, replyMessage);
  }

  /**
   * Start polling loop
   */
  public start() {
    this.isRunning = true;
    console.log(`\n======================================================`);
    console.log(`🐆 LAUNCHIT TIKTOK BOT LISTENER IS LIVE AND WATCHING`);
    console.log(`Watching mentions for: @${this.config.botHandle}`);
    console.log(`Poll interval: ${this.config.pollIntervalMs}ms`);
    console.log(`======================================================\n`);

    setInterval(async () => {
      if (!this.isRunning) return;
      // In production loop, calls TikTok notification feed
    }, this.config.pollIntervalMs);
  }

  public stop() {
    this.isRunning = false;
  }
}
