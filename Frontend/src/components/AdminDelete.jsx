import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AdminProblemTable from './AdminProblemTable';
import { Button, Note } from '../design/primitives';
import { Dialog, DialogContent } from '../design/overlays';
import { toast } from '../design/Toaster';
import { problemNo } from '../design/cn';

const AdminDelete = () => {
  const [target, setTarget] = useState(null);
  const [removeFn, setRemoveFn] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    setError('');
    try {
      await axiosClient.delete(`/problem/delete/${target._id}`);
      removeFn?.(target._id);
      toast.success('Problem deleted', { description: target.title });
      setTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete that problem. Try again.');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AdminProblemTable
        title="Delete a problem"
        detail="Deleting a problem removes it for everyone. Submissions already made against it are affected."
        moduleLabel="Problems"
        emptyDetail="There is nothing to withdraw."
        renderActions={(problem, { removeLocally }) => (
          <Button
            size="xs"
            tone="danger"
            onClick={() => {
              setTarget(problem);
              setRemoveFn(() => removeLocally);
              setError('');
            }}
          >
            <Trash2 className="h-3 w-3" strokeWidth={1.75} />
            Withdraw
          </Button>
        )}
      />

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        {target && (
          <DialogContent
            title="Delete this problem?"
            description={`${problemNo(target.problemNumber)} — ${target.title}`}
            width="max-w-md"
            footer={
              <>
                <Button size="sm" tone="quiet" disabled={deleting} onClick={() => setTarget(null)}>
                  Keep it
                </Button>
                <Button size="sm" tone="redline" loading={deleting} onClick={confirmDelete}>
                  Withdraw permanently
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3">
              <p className="t-body text-ink-2">
                This removes the problem from the set for everyone. It cannot be undone.
              </p>
              {error && <Note tone="redline">{error}</Note>}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

export default AdminDelete;
