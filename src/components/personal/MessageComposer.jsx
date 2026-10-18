import { useRef, useState } from "react";
function MessageActions({ message, onStatus }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      onStatus("コピーしました！");
    } catch {
      onStatus("コピーできませんでした。文章を選択してコピーしてください。");
    }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ text: message });
      else await copy();
    } catch (error) {
      if (error.name !== "AbortError")
        onStatus("共有できませんでした。コピーをご利用ください。");
    }
  }
  return (
    <div className="message-actions">
      <button
        type="button"
        className="secondary-button"
        disabled={!message.trim()}
        onClick={copy}
      >
        コピー
      </button>
      <button
        type="button"
        className="primary-button"
        disabled={!message.trim()}
        onClick={share}
      >
        共有する
      </button>
    </div>
  );
}
export function MessageComposer({ message, onChange, count, id }) {
  const dialog = useRef(null),
    [status, setStatus] = useState("");
  function open() {
    setStatus("");
    dialog.current.showModal();
  }
  const value = message || "";
  return (
    <>
      <div className="desktop-message">
        <label className="sr-only" htmlFor={id}>
          候補日の連絡文
        </label>
        <textarea
          id={id}
          value={value}
          readOnly={!onChange}
          disabled={!count}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="候補日を選択してください。"
        />
        <MessageActions message={count ? value : ""} onStatus={setStatus} />
        <p role="status">{status}</p>
      </div>
      {count > 0 && (
        <div className="mobile-selection">
          <p>候補 {count}件を選択中</p>
          <button type="button" className="primary-button" onClick={open}>
            文面をつくる
          </button>
        </div>
      )}
      <dialog
        className="message-sheet"
        ref={dialog}
        aria-labelledby={id + "-title"}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="sheet-grab" />
        <h3 id={id + "-title"}>候補日の連絡文</h3>
        <label className="sr-only" htmlFor={id + "-sheet"}>
          共有する連絡文
        </label>
        <textarea
          id={id + "-sheet"}
          value={value}
          readOnly={!onChange}
          onChange={(e) => onChange?.(e.target.value)}
        />
        <MessageActions message={count ? value : ""} onStatus={setStatus} />
        <p role="status">{status}</p>
        <button
          className="sheet-close"
          type="button"
          onClick={() => dialog.current.close()}
        >
          閉じる
        </button>
      </dialog>
    </>
  );
}
