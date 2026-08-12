import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AdminProblemTable from './AdminProblemTable';
import { Button } from '../design/primitives';
import { ConfirmDialog } from '../design/overlays';
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

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        tone="danger"
        icon={Trash2}
        title="Delete this problem?"
        subject={target && (
          <>
            <span className="t-data shrink-0 text-ink-3">{problemNo(target.problemNumber)}</span>
            <span className="t-body min-w-0 truncate font-semibold text-ink">{target.title}</span>
          </>
        )}
        consequences={[
          'Everyone loses access to the problem, its test cases and its editorial.',
          'Submission history for it stops resolving to anything.',
          'This cannot be undone.',
        ]}
        error={error}
        loading={deleting}
        confirmLabel="Delete permanently"
        confirmIcon={Trash2}
        cancelLabel="Keep it"
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default AdminDelete;
