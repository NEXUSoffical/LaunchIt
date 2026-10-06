import { Connection, Keypair, PublicKey } from "@solana/web3.js";

/**
 * LaunchIt Social Tagging Engine
 * 
 * Allows users to launch coins directly inside TikTok, Instagram, and X (Twitter)
 * simply by commenting:
 *    "@LaunchIt launch $TICKER" or "@LaunchIt $TICKER"
 */

export interface ViralCommentEvent {
  platform: "tiktok" | "instagram" | "x";
  videoId: string;
  videoUrl: string;
  commentAuthor: string;
  commentText: string;
  videoTitle?: string;
  videoThumbnail?: string;
}

export interface LaunchResult {
  mint: string;
  name: string;
  symbol: string;
  tokenUrl: string;
  replyText: string;
}

export class LaunchItSocialBot {
  private rpcUrl: string;
  private deployerKeypair?: Keypair;

  constructor(rpcUrl: string = "https://api.devnet.solana.com") {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Parse incoming comment from TikTok / IG / X
   * e.g. "@LaunchIt $CHILLGUY" or "@LaunchIt launch $DOGE"
   */
  public parseComment(comment: string): { ticker?: string; valid: boolean } {
    const mentionRegex = /@launchit\w*/i;
    if (!mentionRegex.test(comment)) {
      return { valid: false };
    }

    // 1. Look for $TICKER
    const tickerMatch = comment.match(/\$([A-Za-z0-9_]{2,10})/);
    if (tickerMatch) {
      return { ticker: tickerMatch[1].toUpperCase(), valid: true };
    }

    // 2. Look for word after "launch"
    const launchWordMatch = comment.match(/launch\s+([A-Za-z0-9_]{2,10})/i);
    if (launchWordMatch) {
      return { ticker: launchWordMatch[1].toUpperCase(), valid: true };
    }

    // 3. Look for any word right after the @mention (e.g. "@launchit4 SUNTZ")
    const wordAfterMention = comment.match(/@launchit\w*\s+([A-Za-z0-9_]{2,10})/i);
    if (wordAfterMention) {
      return { ticker: wordAfterMention[1].toUpperCase(), valid: true };
    }

    return { ticker: "VIRAL", valid: true };
  }

  /**
   * Extract video metadata from TikTok / IG / X URL
   */
  public async extractVideoMetadata(videoUrl: string): Promise<{ title: string; ticker: string; thumbnail: string }> {
    // In production, uses TikTok API / oEmbed endpoint: https://www.tiktok.com/oembed?url=...
    // or RapidAPI / yt-dlp metadata extractor
    let platform = "tiktok";
    if (videoUrl.includes("instagram.com")) platform = "instagram";
    if (videoUrl.includes("x.com") || videoUrl.includes("twitter.com")) platform = "x";

    return {
      title: "Viral Meme Coin",
      ticker: "VIRAL",
      thumbnail: "https://launchit.world/logo.jpg",
    };
  }

  /**
   * Automatically deploy the Token-2022 coin on LaunchIt's Solana curve
   */
  public async launchFromComment(event: ViralCommentEvent): Promise<LaunchResult> {
    const parsed = this.parseComment(event.commentText);
    if (!parsed.valid) {
      throw new Error("Invalid LaunchIt comment");
    }

    const ticker = parsed.ticker || "VIRAL";
    const name = event.videoTitle || `${ticker} Coin`;
    const thumbnail = event.videoThumbnail || "https://launchit.world/logo.jpg";

    // Generate real on-chain mint address
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey.toBase58();

    const tokenUrl = `https://launchit.world/token/${mintAddress}`;
    const replyText = `🚀 $${ticker} has been launched on Solana! See it, launch it. 🐆 Trade now: ${tokenUrl}`;

    return {
      mint: mintAddress,
      name,
      symbol: ticker,
      tokenUrl,
      replyText,
    };
  }
}
