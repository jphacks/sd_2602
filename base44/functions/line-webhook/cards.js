import { candidateBubble, moreBubble } from "./presentation.js";
import candidateData from "./candidates-data.json" with { type: "json" };
// Fixed, synthetic data for the approved image test; never reads personal schedules.
export const DEMO_VERSION = "image-demo-v1";
export const DEMO_SNAPSHOT = {
  version: DEMO_VERSION,
  imageVersion: DEMO_VERSION,
  imageUrl: `https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/line-webhook?asset=calendar&version=${DEMO_VERSION}`,
  moreUrl: "https://sync-engine-copy-49e423a5.base44.app/me",
  activityWindow: candidateData.activityWindow,
  generatedDate: candidateData.today,
  timezone: "Asia/Tokyo",
  candidates: candidateData.candidates,
};

function candidateCard(snapshot, candidate) {
  return candidateBubble({imageUrl:snapshot.imageUrl,aspectRatio:'589:378',dateLabel:candidate.dateLabel,self:candidate.busy});
}
function moreCard(snapshot) { return moreBubble(snapshot.moreUrl); }

export function buildDemoMessages(snapshot = DEMO_SNAPSHOT) {
  if (!snapshot || snapshot.version !== DEMO_VERSION || snapshot.imageVersion !== snapshot.version) {
    throw new Error("DEMO_VERSION_MISMATCH");
  }
  if (!Array.isArray(snapshot.candidates) || snapshot.candidates.length > 3) throw new Error("DEMO_CANDIDATES_INVALID");
  if (!snapshot.candidates.length) return [{ type: "text", text: "【テスト用】候補日が見つかりませんでした。" }];
  if (new URL(snapshot.imageUrl).protocol !== "https:" || new URL(snapshot.moreUrl).protocol !== "https:") {
    throw new Error("DEMO_URL_INVALID");
  }
  return [{
    type: "flex",
    altText: `【画像テスト】リスケRisukeの候補${snapshot.candidates.length}件（実予定ではありません）`,
    contents: {
      type: "carousel",
      contents: [...snapshot.candidates.map((candidate) => candidateCard(snapshot, candidate)), moreCard(snapshot)],
    },
  }];
}
