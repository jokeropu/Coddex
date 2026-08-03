import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload, Trash2, Video } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AdminProblemTable from './AdminProblemTable';
import { Button, Note, Chip } from '../design/primitives';
import { Dialog, DialogContent } from '../design/overlays';
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

      <Dialog open={!!replaceTarget} onOpenChange={(o) => !o && setReplaceTarget(null)}>
        {replaceTarget && (
          <DialogContent
            title="Replace the existing walkthrough?"
            description={`${problemNo(replaceTarget.problemNumber)} — ${replaceTarget.title}`}
            width="max-w-md"
            footer={
              <>
                <Button size="sm" tone="quiet" onClick={() => setReplaceTarget(null)}>Cancel</Button>
                <Button
                  size="sm"
                  tone="line"
                  onClick={() => navigate(`/admin/upload/${replaceTarget._id}`)}
                >
                  <Video className="h-3 w-3" strokeWidth={1.75} />
                  Upload replacement
                </Button>
              </>
            }
          >
            <p className="t-body text-ink-2">
              This problem already has a walkthrough. Uploading a new one overwrites it.
            </p>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        {deleteTarget && (
          <DialogContent
            title="Remove this walkthrough?"
            description={`${problemNo(deleteTarget.problemNumber)} — ${deleteTarget.title}`}
            width="max-w-md"
            footer={
              <>
                <Button size="sm" tone="quiet" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                  Keep it
                </Button>
                <Button size="sm" tone="redline" loading={deleting} onClick={confirmDelete}>
                  Remove walkthrough
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3">
              <p className="t-body text-ink-2">
                The problem stays in the set; only its video solution is deleted.
              </p>
              {error && <Note tone="redline">{error}</Note>}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

export default AdminVideo;
