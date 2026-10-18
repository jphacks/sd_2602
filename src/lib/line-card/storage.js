// SDK-backed private file upload; DB persistence remains an injected boundary.
export function createPrivateCardStore({ core, saveResult }) {
  if (
    typeof core?.UploadPrivateFile !== "function" ||
    typeof saveResult !== "function"
  )
    throw new Error("CARD_STORE_NOT_CONFIGURED");
  return {
    async saveImage({ version, png }) {
      if (
        !/^[a-zA-Z0-9_-]{1,100}$/.test(version) ||
        !(png instanceof Uint8Array) ||
        png.length > 2 * 1024 * 1024
      )
        throw new Error("CARD_ASSET_INVALID");
      const file = new File([png], version + ".png", { type: "image/png" });
      const result = await core.UploadPrivateFile({ file });
      if (typeof result?.file_uri !== "string" || !result.file_uri)
        throw new Error("CARD_IMAGE_SAVE_FAILED");
      return { key: result.file_uri };
    },
    saveResult,
  };
}
