import { LaunchItSocialBot, ViralCommentEvent } from "../src/bot/socialBot";

async function runBotTest() {
  console.log("=================================================");
  console.log("🐆 TESTING LAUNCHIT TIKTOK COMMENT BOT ENGINE 🐆");
  console.log("=================================================\n");

  const bot = new LaunchItSocialBot("https://api.devnet.solana.com");

  // Simulated viral TikTok comment event
  const mockTikTokEvent: ViralCommentEvent = {
    platform: "tiktok",
    videoId: "74218947291847192",
    videoUrl: "https://www.tiktok.com/@creator/video/74218947291847192",
    commentAuthor: "@crypto_king99",
    commentText: "@LaunchIt $CHILLGUY",
    videoTitle: "Just a chill guy doing chill things",
    videoThumbnail: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300",
  };

  console.log("1. Incoming TikTok Comment:");
  console.log(`   User: ${mockTikTokEvent.commentAuthor}`);
  console.log(`   Comment: "${mockTikTokEvent.commentText}"`);
  console.log(`   Video: ${mockTikTokEvent.videoUrl}\n`);

  console.log("2. Parsing comment for ticker...");
  const parsed = bot.parseComment(mockTikTokEvent.commentText);
  console.log(`   Detected Ticker: $${parsed.ticker}\n`);

  console.log("3. Deploying Token-2022 coin on Solana curve...");
  const result = await bot.launchFromComment(mockTikTokEvent);

  console.log("   ✅ SUCCESS! Coin Created:");
  console.log(`   • Mint Address: ${result.mint}`);
  console.log(`   • Token Name:   ${result.name}`);
  console.log(`   • Ticker:       $${result.symbol}`);
  console.log(`   • Trading URL:  ${result.tokenUrl}\n`);

  console.log("4. Bot Automated Comment Reply:");
  console.log(`   "${result.replyText}"\n`);
  console.log("=================================================");
}

runBotTest().catch(console.error);
