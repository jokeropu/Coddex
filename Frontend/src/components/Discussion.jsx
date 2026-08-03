import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ThumbsUp, Reply, Trash2, Plus, X } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import { cn } from '../design/cn';
import {
  Button, Input, Textarea, Note, Plotter, EmptySheet, Chip,
} from '../design/primitives';

const formatDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

const PostNote = ({ post, isReply, currentUser, onLike, onDelete, onReplySubmit }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const canDelete =
    currentUser && (currentUser._id === post.author?._id || currentUser.role === 'admin');

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setReplySubmitting(true);
    await onReplySubmit(post._id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
    setReplySubmitting(false);
  };

  return (
    <div className={cn('border border-rule', isReply ? 'bg-sheet-sunk' : 'bg-sheet-raised')}>
      <div className="p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="t-field text-ink">{post.author?.firstName || 'Deleted user'}</span>
            {post.author?.role === 'admin' && <Chip tone="var(--c-line)">Admin</Chip>}
            <span className="t-micro text-ink-3">{formatDate(post.createdAt)}</span>
          </div>
          {canDelete && (
            <Button
              size="xs"
              tone="quiet"
              className="shrink-0 text-ink-3 hover:text-redline"
              onClick={() => onDelete(post._id)}
              aria-label="Delete post"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.75} />
            </Button>
          )}
        </div>

        {post.title && <h4 className="t-h3 mb-1 text-ink">{post.title}</h4>}
        <p className="t-body whitespace-pre-wrap text-ink-2">{post.content}</p>

        {post.code && (
          <div className="mt-2.5 border border-rule">
            {post.language && (
              <div className="border-b border-rule bg-sheet-sunk px-2 py-1">
                <span className="t-micro text-line">{post.language}</span>
              </div>
            )}
            <pre className="t-data overflow-x-auto bg-sheet-sunk p-2.5 text-ink">
              <code>{post.code}</code>
            </pre>
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-1.5">
          <Button
            size="xs"
            tone={post.likedByMe ? 'line' : 'quiet'}
            onClick={() => onLike(post._id)}
            aria-pressed={post.likedByMe}
          >
            <ThumbsUp className="h-3 w-3" strokeWidth={1.75} />
            {post.likeCount}
          </Button>
          {!isReply && (
            <Button size="xs" tone="quiet" onClick={() => setShowReplyForm((p) => !p)}>
              {showReplyForm ? <X className="h-3 w-3" strokeWidth={1.75} /> : <Reply className="h-3 w-3" strokeWidth={1.75} />}
              {showReplyForm ? 'Cancel' : 'Reply'}
            </Button>
          )}
        </div>

        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="mt-2.5 flex flex-col gap-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              aria-label="Reply"
            />
            <Button
              type="submit"
              tone="line"
              size="xs"
              className="self-start"
              loading={replySubmitting}
              disabled={!replyContent.trim()}
            >
              Post reply
            </Button>
          </form>
        )}
      </div>

      {!isReply && post.replies?.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-rule bg-sheet-sunk p-2.5 pl-5">
          {post.replies.map((reply) => (
            <PostNote
              key={reply._id}
              post={reply}
              isReply
              currentUser={currentUser}
              onLike={onLike}
              onDelete={onDelete}
              onReplySubmit={onReplySubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Discussion = ({ problemId }) => {
  const { user } = useSelector((state) => state.auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');
  const [posting, setPosting] = useState(false);
  const [showCodeFields, setShowCodeFields] = useState(false);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const { data } = await axiosClient.get(`/discussion/${problemId}`);
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the discussion. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussion();

  }, [problemId]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await axiosClient.post(`/discussion/${problemId}`, {
        title: title.trim() || undefined,
        content,
        code: code.trim() || undefined,
        language: language.trim() || undefined,
      });
      setTitle('');
      setContent('');
      setCode('');
      setLanguage('');
      setShowCodeFields(false);
      await fetchDiscussion();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post that. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const { data } = await axiosClient.post(`/discussion/like/${postId}`);
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === postId) return { ...p, likeCount: data.likeCount, likedByMe: data.likedByMe };
          if (p.replies?.some((r) => r._id === postId)) {
            return {
              ...p,
              replies: p.replies.map((r) =>
                r._id === postId ? { ...r, likeCount: data.likeCount, likedByMe: data.likedByMe } : r
              ),
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await axiosClient.delete(`/discussion/${postId}`);
      await fetchDiscussion();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete that post.');
    }
  };

  const handleReplySubmit = async (postId, replyContent) => {
    try {
      await axiosClient.post(`/discussion/reply/${postId}`, { content: replyContent });
      await fetchDiscussion();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post that reply.');
    }
  };

  if (loading) return <Plotter label="Loading discussion" />;
  if (error && posts.length === 0) return <Note tone="redline">{error}</Note>;

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleCreatePost} className="border border-rule">
        <div className="border-b border-rule bg-sheet-sunk px-3 py-1.5">
          <span className="t-label text-ink-2">Add a note</span>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — optional, e.g. “O(n) hashmap approach”"
            aria-label="Post title"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your approach, or ask about one…"
            rows={3}
            aria-label="Post content"
          />

          {showCodeFields ? (
            <>
              <Input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Language — e.g. C++, Python, Java"
                aria-label="Code language"
              />
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code"
                rows={5}
                aria-label="Code"
                className="font-mono text-[11px] leading-4"
              />
            </>
          ) : (
            <Button
              type="button"
              size="xs"
              tone="quiet"
              className="self-start"
              onClick={() => setShowCodeFields(true)}
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              Attach code
            </Button>
          )}

          {error && <Note tone="redline">{error}</Note>}

          <Button
            type="submit"
            tone="line"
            size="sm"
            className="self-start"
            loading={posting}
            disabled={!content.trim()}
          >
            Post note
          </Button>
        </div>
      </form>

      {posts.length === 0 ? (
        <EmptySheet
          title="No discussion yet"
          detail="Be the first to write up an approach — the notes here are what other solvers read when they get stuck."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {posts.map((post) => (
            <PostNote
              key={post._id}
              post={post}
              currentUser={user}
              onLike={handleLike}
              onDelete={handleDelete}
              onReplySubmit={handleReplySubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Discussion;
