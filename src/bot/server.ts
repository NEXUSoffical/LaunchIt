import { LaunchItSocialBot, ViralCommentEvent } from "./socialBot";

/**
 * LaunchIt Social Webhook Server
 * Listens to incoming TikTok, Instagram, and X (Twitter) comment events
 * and triggers instant Solana Token-2022 bonding curve deployment.
 */

const bot = new LaunchItSocialBot();

export async function handleIncomingCommentWebhook(payload: any): Promise<any> {
  console.log("Received social webhook payload:", payload);

  // Example payload parsing for TikTok / IG / X
  const event: ViralCommentEvent = {
    platform: payload.platform || "tiktok",
    videoId: payload.videoId || "video_123",
    videoUrl: payload.videoUrl || "https://www.tiktok.com/@user/video/123",
    commentAuthor: payload.author || "@user",
    commentText: payload.text || "@LaunchIt $VIRAL",
    videoTitle: payload.videoTitle || "Viral Clip",
    videoThumbnail: payload.thumbnail || "https://launchit.world/logo.jpg",
  };

  try {
    const launchResult = await bot.launchFromComment(event);
    console.log("Successfully launched coin:", launchResult);
    
    // In production, posts the reply back to TikTok / IG / X API
    return {
      success: true,
      data: launchResult,
    };
  } catch (err: any) {
    console.error("Failed to launch from comment:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}
