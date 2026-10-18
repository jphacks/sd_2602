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

function text(content, options = {}) {
  return { type: "text", text: content, wrap: true, ...options };
}

function bubble(snapshot, contents, action) {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box", layout: "vertical", backgroundColor: "#EAF5EC", paddingAll: "12px",
      contents: [text("リスケRisuke｜画像テスト", { size: "sm", weight: "bold", color: "#317747" })],
    },
    hero: { type: "image", url: snapshot.imageUrl, size: "full", aspectRatio: "589:378", aspectMode: "fit" },
    body: { type: "box", layout: "vertical", spacing: "md", contents },
    footer: {
      type: "box", layout: "vertical", spacing: "sm",
      contents: [
        { type: "button", style: "primary", color: "#317747", action },
        text("テスト用の画像・候補です。実予定ではありません。", { size: "xxs", color: "#777777" }),
      ],
    },
  };
}

function candidateCard(snapshot, candidate) {
  return bubble(snapshot, [
    text(`候補ID：${candidate.id}`, { size: "xs", color: "#777777" }),
    text(candidate.dateLabel, { size: "xl", weight: "bold", color: "#225B35" }),
    text(`【テスト予定】自分：${candidate.busy}`, { size: "sm" }),
    text(`活動時間 ${snapshot.activityWindow}\n${snapshot.timezone}／候補の生成日：${snapshot.generatedDate}`, { size: "xs", color: "#777777" }),
  ], {
    type: "message", label: "この候補を提案する",
    text: `【テスト提案】${candidate.dateLabel}はいかがでしょうか。自分：${candidate.busy}。活動時間 ${snapshot.activityWindow}（${snapshot.timezone}）。候補の提案であり確定ではありません。`,
  });
}

function moreCard(snapshot) {
  return bubble(snapshot, [
    text("もっと見る", { size: "xl", weight: "bold", color: "#225B35" }),
    text("Webのテスト用カレンダーを開きます。", { size: "sm" }),
    text("候補は生成日のWebテスト予定から選出しています。画像は従来の表示確認用です。", { size: "xs", color: "#777777" }),
  ], { type: "uri", label: "もっと見る", uri: snapshot.moreUrl });
}

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
