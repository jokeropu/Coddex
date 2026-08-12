import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowLeft, Pencil, Save, Video } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { toast } from '../design/Toaster';
import { problemNo } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Input, Textarea,
  FormRow, Note, Plotter, EmptySheet, DifficultyMark,
} from '../design/primitives';
import { ConfirmDialog } from '../design/overlays';

const toDatetimeLocal = (isoString) => {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function AdminContestEdit() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingSave, setPendingSave] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    const fetchContest = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get(`/contest/${contestId}`);
        setContest(data);
        if (data.isCreator && data.editable) {
          reset({
            title: data.title,
            description: data.description,
            startTime: toDatetimeLocal(data.startTime),
            endTime: toDatetimeLocal(data.endTime),
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load that contest.');
      } finally {
        setLoading(false);
      }
    };
    fetchContest();
  }, [contestId, reset]);

  const requestSave = (formData) => {
    setError(null);
    setSaveError('');
    setPendingSave(formData);
  };

  const confirmSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await axiosClient.put(`/contest/${contestId}`, pendingSave);
      toast.success('Contest updated');
      navigate('/contests');
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not save those changes. Try again.');
      setSaving(false);
    }
  };

  const backAction = (
    <Button size="sm" tone="quiet" asChild>
      <Link to="/contests"><ArrowLeft className="h-3 w-3" strokeWidth={2} />All contests</Link>
    </Button>
  );

  if (loading) {
    return <AppShell><PageBody><Plotter label="Loading contest" /></PageBody></AppShell>;
  }

  if (error && !contest) {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <EmptySheet title="Contest not available" detail={error} action={backAction} />
        </PageBody>
      </AppShell>
    );
  }

  if (!contest?.isCreator || !contest.editable) {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <EmptySheet
            title="This contest is locked"
            detail={
              contest?.isCreator
                ? 'Editing closes an hour before a contest opens, so the paper cannot change under anyone already preparing.'
                : 'A contest can only be edited by the admin who created it.'
            }
            action={backAction}
          />
        </PageBody>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageBody width="max-w-2xl">
        <PageHeader
          title="Edit contest"
          detail="Everything here stays editable until an hour before the contest opens. After that the paper is locked."
          actions={backAction}
        />

        <Module ticks>
          <ModuleHead label="Contest details" />

          <form onSubmit={handleSubmit(requestSave)} className="flex flex-col gap-3.5 p-4">
            {error && <Note tone="redline">{error}</Note>}

            <FormRow label="Title" required error={errors.title?.message}>
              <Input {...register('title', { required: 'Title is required' })} invalid={!!errors.title} />
            </FormRow>

            <FormRow label="Description" required error={errors.description?.message}>
              <Textarea
                {...register('description', { required: 'Description is required' })}
                rows={3}
                invalid={!!errors.description}
              />
            </FormRow>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormRow label="Opens" required error={errors.startTime?.message}>
                <Input
                  type="datetime-local"
                  {...register('startTime', { required: 'Start time is required' })}
                  invalid={!!errors.startTime}
                />
              </FormRow>
              <FormRow label="Closes" required error={errors.endTime?.message}>
                <Input
                  type="datetime-local"
                  {...register('endTime', { required: 'End time is required' })}
                  invalid={!!errors.endTime}
                />
              </FormRow>
            </div>

            {contest.problems?.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-rule-faint pt-4">
                <span className="t-label text-ink-2">Problems</span>

                <p className="t-body-sm -mt-2 text-ink-3">
                  Statements, test cases and solutions stay editable until an hour before the
                  contest opens. A walkthrough stays hidden until it closes, then publishes with
                  its problem.
                </p>

                {contest.problems.map((problem) => (
                  <div key={problem._id} className="flex flex-col gap-2 border border-rule bg-sheet-sunk p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="t-data text-ink-3">{problemNo(problem.problemNumber)}</span>
                      <span className="t-body min-w-0 flex-1 truncate font-semibold text-ink">{problem.title}</span>
                      <DifficultyMark difficulty={problem.difficulty} />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="xs" tone="outline" asChild>
                        <Link to={`/admin/update/${problem._id}`}>
                          <Pencil className="h-3 w-3" strokeWidth={1.75} />
                          Edit problem
                        </Link>
                      </Button>
                      <Button size="xs" tone={problem.walkthrough ? 'quiet' : 'outline'} asChild>
                        <Link to={`/admin/upload/${problem._id}?returnTo=/admin/contest/edit/${contestId}`}>
                          <Video className="h-3 w-3" strokeWidth={1.75} />
                          {problem.walkthrough ? 'Replace walkthrough' : 'Add walkthrough'}
                        </Link>
                      </Button>
                    </div>

                    {problem.walkthrough && (
                      <span className="t-body-sm text-ink-3">
                        {problem.walkthrough.provider === 'youtube'
                          ? `YouTube — ${problem.walkthrough.title || 'linked'}${problem.walkthrough.author ? ` (${problem.walkthrough.author})` : ''}`
                          : 'Uploaded to Cloudinary'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" tone="line" size="lg" className="w-full" loading={isSubmitting}>
              Save changes
            </Button>
          </form>
        </Module>

        <ConfirmDialog
          open={!!pendingSave}
          onOpenChange={(o) => !o && setPendingSave(null)}
          tone="caution"
          icon={Save}
          title="Save these changes?"
          subject={
            <span className="t-body min-w-0 truncate font-semibold text-ink">
              {pendingSave?.title || contest.title}
            </span>
          }
          consequences={[
            'Entrants see the new title, description and timing straight away.',
            'Editing closes an hour before the contest opens.',
          ]}
          error={saveError}
          loading={saving}
          confirmLabel="Save changes"
          confirmIcon={Save}
          cancelLabel="Keep editing"
          onConfirm={confirmSave}
        />
      </PageBody>
    </AppShell>
  );
}

export default AdminContestEdit;
