export const MAIN_CONTENT_ID = "main-content";

/** First focusable element of the page. Routing is hash-based, so the target is focused directly instead of changing the hash. */
export function SkipLink() {
  return (
    <a
      className="skip-link"
      href={`#${MAIN_CONTENT_ID}`}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(MAIN_CONTENT_ID)?.focus();
      }}
    >Bỏ qua đến nội dung chính</a>
  );
}

/** Focus target of the skip link; placed right after the header and the sync status. */
export function MainContentAnchor() {
  return <div id={MAIN_CONTENT_ID} className="skip-target" tabIndex={-1} />;
}
