import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { theme, text } from '../../theme';
import { deleteIgPost, getIgStatus, listIgPosts, updateIgPost } from '../../lib/adminApi';
import { IG_ASPECT_RATIO, IG_CAPTION_MAX } from '../../types';
import type { IgPost, IgPostStatus, IgStatus } from '../../types';
import { page, pageTitle, caption as captionStyle, hint, input, smallButton, dangerButton, errorBox, noticeBox } from './adminStyles';

const STATUS_LABEL: Record<IgPostStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  publishing: 'Publishing…',
  published: 'Published',
  failed: 'Failed',
};

const statusColor = (post: IgPost) =>
  post.status === 'failed' ? '#F0B8A8' : post.status === 'published' && !post.dryRun ? theme.brass : text.soft;

export default function InstagramPosts() {
  const [posts, setPosts] = useState<IgPost[] | null>(null);
  const [status, setStatus] = useState<IgStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notice = (useLocation().state as { notice?: string } | null)?.notice;

  useEffect(() => {
    listIgPosts()
      .then(setPosts)
      .catch((err: Error) => setError(err.message));
    getIgStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  const replace = (post: IgPost) => setPosts((list) => list?.map((p) => (p.id === post.id ? post : p)) ?? null);
  const remove = (id: number) => setPosts((list) => list?.filter((p) => p.id !== id) ?? null);

  return (
    <div style={page}>
      <h1 style={pageTitle}>Instagram</h1>

      {notice && <p style={noticeBox}>{notice}</p>}
      {error && <p style={errorBox}>{error}</p>}

      {status && !status.configured && <p style={errorBox}>Instagram isn’t connected yet (no access token).</p>}
      {status?.error && <p style={errorBox}>Instagram connection problem: {status.error}</p>}
      {status?.configured && !status.error && (
        <p style={{ ...hint, margin: '-12px 0 28px' }}>
          {status.username && `Connected as @${status.username}. `}
          {status.live ? 'Posting is live.' : 'Test mode: posts here are dry runs — only the live site posts for real.'}
        </p>
      )}

      {!posts && !error && <p style={hint}>Loading…</p>}
      {posts?.length === 0 && (
        <p style={hint}>
          No posts yet. Open a piece from <Link to="/admin" style={{ color: theme.bone, textDecoration: 'underline' }}>All artwork</Link> and
          tick “Also create an Instagram post”.
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {posts?.map((post) => (
          <PostRow key={post.id} post={post} onChange={replace} onDelete={remove} onError={setError} />
        ))}
      </ul>
    </div>
  );
}

interface RowProps {
  post: IgPost;
  onChange: (post: IgPost) => void;
  onDelete: (id: number) => void;
  onError: (message: string | null) => void;
}

function PostRow({ post, onChange, onDelete, onError }: RowProps) {
  const [draftCaption, setDraftCaption] = useState(post.caption);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editable = post.status === 'draft' || post.status === 'failed';
  const dirty = draftCaption !== post.caption;

  const run = async (label: string, action: () => Promise<void>) => {
    onError(null);
    setBusy(label);
    try {
      await action();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  return (
    <li style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '24px 0', borderBottom: `1px solid ${theme.rule}` }}>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {post.slides.slice(0, 3).map((slide) => (
          <div
            key={slide.igUrl}
            style={{
              width: 84,
              aspectRatio: String(IG_ASPECT_RATIO[post.aspect]),
              alignSelf: 'flex-start',
              background: `center / cover no-repeat url("${slide.igUrl}")`,
              border: theme.border,
            }}
          />
        ))}
        {post.slides.length > 3 && <span style={{ ...hint, alignSelf: 'center' }}>+{post.slides.length - 3}</span>}
      </div>

      <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: theme.serif, fontSize: 22 }}>{post.artworkTitle ?? 'Deleted artwork'}</span>
          <span style={{ ...captionStyle, color: statusColor(post) }}>
            {post.status === 'published' && post.dryRun ? 'Dry run — not posted' : STATUS_LABEL[post.status]}
          </span>
          <span style={{ ...hint, fontSize: 12 }}>
            {new Date(post.publishedAt ?? post.createdAt).toLocaleString()}
          </span>
        </div>

        {post.status === 'failed' && post.error && <p style={{ ...errorBox, margin: 0 }}>{post.error}</p>}

        {editable ? (
          <>
            <textarea
              style={{ ...input, resize: 'vertical', lineHeight: 1.6, border: theme.border, padding: 12 }}
              rows={5}
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
            />
            <span style={{ ...hint, fontSize: 12, color: draftCaption.length > IG_CAPTION_MAX ? '#F0B8A8' : text.faint }}>
              {draftCaption.length} / {IG_CAPTION_MAX} characters
            </span>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: text.soft, whiteSpace: 'pre-wrap' }}>{post.caption}</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {editable && (
            <>
              <button
                type="button"
                style={{ ...smallButton, background: theme.paper, color: theme.ink }}
                disabled={busy !== null}
                onClick={() =>
                  run('Posting…', async () => onChange(await updateIgPost(post.id, { caption: draftCaption, action: 'publish' })))
                }
              >
                {post.status === 'failed' ? 'Retry' : 'Post now'}
              </button>
              {dirty && (
                <button
                  type="button"
                  style={smallButton}
                  disabled={busy !== null}
                  onClick={() => run('Saving…', async () => onChange(await updateIgPost(post.id, { caption: draftCaption })))}
                >
                  Save caption
                </button>
              )}
            </>
          )}
          {post.permalink && (
            <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={smallButton}>
              View on Instagram ↗
            </a>
          )}
          {post.artworkId && (
            <Link to={`/admin/${post.artworkId}`} style={smallButton}>
              Edit artwork
            </Link>
          )}
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 14, color: text.soft }}>
                {post.status === 'published' && !post.dryRun ? 'Remove this record? The post stays on Instagram.' : 'Delete this post?'}
              </span>
              <button
                type="button"
                style={{ ...dangerButton, padding: '8px 14px', fontSize: 11 }}
                disabled={busy !== null}
                onClick={() => run('Deleting…', async () => (await deleteIgPost(post.id), onDelete(post.id)))}
              >
                Yes
              </button>
              <button type="button" style={smallButton} onClick={() => setConfirmDelete(false)}>
                No
              </button>
            </>
          ) : (
            <button type="button" style={smallButton} disabled={busy !== null} onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
          {busy && <span style={{ fontSize: 14, color: text.soft }}>{busy}</span>}
        </div>
      </div>
    </li>
  );
}
