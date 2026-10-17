// Fixed, synthetic data for the approved image test; never reads personal schedules.
export const DEMO_VERSION = "image-demo-v1";
export const DEMO_SNAPSHOT = {
  version: DEMO_VERSION,
  imageVersion: DEMO_VERSION,
  imageUrl: `https://base44.app/api/apps/6ad3509425cadbfc49e423a5/functions/line-webhook?asset=calendar&version=${DEMO_VERSION}`,
  moreUrl: `https://example.com/?risuke_demo=${DEMO_VERSION}`,
  activityWindow: "09:00〜22:00",
  timezone: "Asia/Tokyo",
  candidates: [
    { id: "demo-19", dateLabel: "テスト月19日", busy: "13:00〜14:00" },
    { id: "demo-24", dateLabel: "テスト月24日", busy: "16:00〜18:00" },
    { id: "demo-29", dateLabel: "テスト月29日", busy: "10:00〜11:00" },
  ],
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
    text(`【仮データ】${candidate.busy}は予定があり、それ以外の活動時間内は空いています。`, { size: "sm" }),
    text(`活動時間 ${snapshot.activityWindow}\n${snapshot.timezone}／画像の年月は未設定`, { size: "xs", color: "#777777" }),
  ], {
    type: "message", label: "この候補を提案する",
    text: `【テスト提案】${candidate.dateLabel}は${candidate.busy}以外の活動時間（${snapshot.activityWindow}、${snapshot.timezone}）なら予定を入れられます。`,
  });
}

function moreCard(snapshot) {
  return bubble(snapshot, [
    text("もっと見る", { size: "xl", weight: "bold", color: "#225B35" }),
    text("共有ページは準備中です。今回はボタンと画像の表示を確認します。", { size: "sm" }),
    text("このボタンは仮URLを開きます。", { size: "xs", color: "#777777" }),
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
