import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import ProblemForm from './ProblemForm';
import AppShell from '../design/AppShell';
import { toast } from '../design/Toaster';
import { problemNo } from '../design/cn';
import { PageBody, Plotter, EmptySheet, Button } from '../design/primitives';
import { ConfirmDialog } from '../design/overlays';

function AdminUpdateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingSave, setPendingSave] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const { data } = await axiosClient.get(`/problem/adminProblemById/${id}`);
        setProblem(data);
      } catch (err) {
        setError('Could not load that problem.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [id]);

  const requestSave = (data) => {
    setSaveError('');
    setPendingSave(data);
  };

  const confirmSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await axiosClient.put(`/problem/update/${id}`, pendingSave);
      toast.success('Problem updated', { description: pendingSave.title });
      navigate(problem?.contestId ? `/admin/contest/edit/${problem.contestId}` : '/admin/update');
    } catch (error) {
      setSaveError(
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Could not save your changes.'
      );
      setSaving(false);
    }
  };

  if (loading) {
    return <AppShell><PageBody><Plotter label="Loading problem" /></PageBody></AppShell>;
  }

  if (error || !problem) {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <EmptySheet
            title="Problem not found"
            detail={error || 'This problem may have been deleted.'}
            action={
              <Button size="sm" asChild>
                <Link to="/admin/update"><ArrowLeft className="h-3 w-3" strokeWidth={2} />Back to problems</Link>
              </Button>
            }
          />
        </PageBody>
      </AppShell>
    );
  }

  const inContest = !!problem.contestId;

  return (
    <>
      <ProblemForm
      heading="Edit problem"
      subheading={
        inContest
          ? `${problemNo(problem.problemNumber)} — ${problem.title}. Part of a contest, so changes stay hidden until it opens.`
          : `${problemNo(problem.problemNumber)} — ${problem.title}. Changes go live for every solver immediately.`
      }
      submitLabel="Save changes"
      onSubmit={requestSave}
      defaultValues={{
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        tags: problem.tags,
        visibleTestCases: problem.visibleTestCases,
        hiddenTestCases: problem.hiddenTestCases,
        startCode: problem.startCode,
        referenceSolution: problem.referenceSolution,
        hints: problem.hints || [],
      }}
    />

      <ConfirmDialog
        open={!!pendingSave}
        onOpenChange={(o) => !o && setPendingSave(null)}
        tone="caution"
        icon={Save}
        title="Save these changes?"
        subject={
          <>
            <span className="t-data shrink-0 text-ink-3">{problemNo(problem.problemNumber)}</span>
            <span className="t-body min-w-0 truncate font-semibold text-ink">
              {pendingSave?.title || problem.title}
            </span>
          </>
        }
        consequences={
          inContest
            ? [
                'The statement, test cases and solutions are replaced for this contest problem.',
                'Nobody sees it until the contest opens, and editing closes an hour beforehand.',
              ]
            : [
                'The statement, test cases and solutions are replaced for every solver immediately.',
                'Existing submissions are judged against the new hidden test cases from now on.',
              ]
        }
        error={saveError}
        loading={saving}
        confirmLabel="Save changes"
        confirmIcon={Save}
        cancelLabel="Keep editing"
        onConfirm={confirmSave}
      />
    </>
  );
}

export default AdminUpdateForm;
