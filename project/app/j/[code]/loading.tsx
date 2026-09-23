import './invite.css';

/** Shown while the invite is read. Shaped like the real card, never a bare spinner. */
export default function InviteLoading() {
  return (
    <main className="invite">
      <div className="invite__col">
        <div className="invite__card" aria-busy="true" aria-live="polite">
          <div className="invite__mark" />
          <span className="sr-only">Checking this invite…</span>
          <div className="invite__skeleton" style={{ height: 26, width: '88%', marginBottom: 10 }} />
          <div className="invite__skeleton" style={{ height: 26, width: '64%', marginBottom: 20 }} />
          <div className="invite__skeleton" style={{ height: 15, width: '100%', marginBottom: 8 }} />
          <div className="invite__skeleton" style={{ height: 15, width: '76%' }} />
          <div className="invite__skeleton" style={{ height: 52, borderRadius: 18, marginTop: 28 }} />
        </div>
      </div>
    </main>
  );
}
