import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload, Trash2, Video } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AdminProblemTable from './AdminProblemTable';
import { Button, Note, Chip } from '../design/primitives';
import { ConfirmDialog } from '../design/overlays';
import { toast } from '../design/Toaster';
import { problemNo } from '../design/cn';

const AdminVideo = () => {
  const navigate = useNavigate();
  const [videoProblemIds, setVideoProblemIds] = useState(new Set());
  const [listError, setListError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideoIds = async () => {
      try {
        const { data } = await axiosClient.get('/video/list');
        setVideoProblemIds(new Set(data));
      } catch (err) {
        setListError('Could not load which problems already have a walkthrough.');
        console.error(err);
      }
    };
    fetchVideoIds();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await axiosClient.delete(`/video/delete/${deleteTarget._id}`);
      setVideoProblemIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget._id);
        return next;
      });
      toast.success('Walkthrough removed', { description: deleteTarget.title });
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? 'That problem has no walkthrough to remove.'
          : err.response?.data?.error || 'Could not remove the walkthrough. Try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AdminProblemTable
        title="Walkthrough videos"
        detail="Attach or remove the video solution on each problem. Videos are Premium content, or unlockable with credits."
        moduleLabel="Problems"
        emptyDetail="Add a problem before attaching a walkthrough to it."
        banner={listError ? <Note tone="caution" className="mb-4">{listError}</Note> : null}
        renderActions={(problem) => {
          const has = videoProblemIds.has(problem._id);
          return (
            <>
              {has && <Chip tone="var(--c-approved)" dot className="hidden sm:inline-flex">Video</Chip>}
              <Button
                size="xs"
                tone={has ? 'outline' : 'line'}
                onClick={() =>
                  has ? setReplaceTarget(problem) : navigate(`/admin/upload/${problem._id}`)
                }
              >
                <Upload className="h-3 w-3" strokeWidth={1.75} />
                {has ? 'Replace' : 'Upload'}
              </Button>
              <Button
                size="xs"
                tone="danger"
                disabled={!has}
                title={has ? undefined : 'No walkthrough attached'}
                onClick={() => { setDeleteTarget(problem); setError(''); }}
                aria-label="Remove walkthrough"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.75} />
              </Button>
            </>
          );
        }}
      />

      <ConfirmDialog
        open={!!replaceTarget}
        onOpenChange={(o) => !o && setReplaceTarget(null)}
        tone="caution"
        icon={Video}
        title="Replace the existing walkthrough?"
        subject={replaceTarget && (
          <>
            <span className="t-data shrink-0 text-ink-3">{problemNo(replaceTarget.problemNumber)}</span>
            <span className="t-body min-w-0 truncate font-semibold text-ink">{replaceTarget.title}</span>
          </>
        )}
        consequences={[
          'The current walkthrough is deleted once the new one saves.',
          'Nothing changes until you finish the upload on the next screen.',
        ]}
        confirmLabel="Choose a replacement"
        confirmIcon={Video}
        cancelLabel="Cancel"
        onConfirm={() => navigate(`/admin/upload/${replaceTarget._id}`)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        tone="danger"
        icon={Trash2}
        title="Remove this walkthrough?"
        subject={deleteTarget && (
          <>
            <span className="t-data shrink-0 text-ink-3">{problemNo(deleteTarget.problemNumber)}</span>
            <span className="t-body min-w-0 truncate font-semibold text-ink">{deleteTarget.title}</span>
          </>
        )}
        consequences={[
          'The problem itself stays in the set — only its video is removed.',
          'A Cloudinary upload is deleted for good; a YouTube link just unlinks.',
        ]}
        error={error}
        loading={deleting}
        confirmLabel="Remove walkthrough"
        confirmIcon={Trash2}
        cancelLabel="Keep it"
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default AdminVideo;
