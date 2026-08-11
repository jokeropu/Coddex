import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { toast } from '../design/Toaster';
import { problemNo } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Input, Textarea,
  FormRow, Note, Plotter, EmptySheet, DifficultyMark,
} from '../design/primitives';

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    const fetchContest = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get(`/contest/${contestId}`);
        setContest(data);
        if (data.isCreator && data.status === 'upcoming') {
          reset({
            title: data.title,
            description: data.description,
            startTime: toDatetimeLocal(data.startTime),
            endTime: toDatetimeLocal(data.endTime),
            walkthroughs: (data.problems || []).map((p) => ({
              problemId: p._id,
              url: p.walkthrough?.url || '',
            })),
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

  const onSubmit = async (formData) => {
    setError(null);
    try {
      await axiosClient.put(`/contest/${contestId}`, formData);
      toast.success('Contest updated');
      navigate('/contests');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save those changes. Try again.');
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

  if (!contest?.isCreator || contest.status !== 'upcoming') {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <EmptySheet
            title="This contest is locked"
            detail="A contest can only be edited by the admin who created it, and only before it opens."
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
          detail="Title, description, timing and walkthroughs can change until the contest opens. The three problems themselves are fixed once created."
          actions={backAction}
        />

        <Module ticks>
          <ModuleHead label="Contest details" />

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5 p-4">
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
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-label text-ink-2">Walkthroughs</span>
                  <span className="t-micro text-ink-3">optional</span>
                </div>

                <p className="t-body-sm -mt-2 text-ink-3">
                  A walkthrough stays hidden until this contest closes, then publishes with its
                  problem. Clear a field to remove one.
                </p>

                {contest.problems.map((problem, index) => (
                  <div key={problem._id} className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="t-data text-ink-3">{problemNo(problem.problemNumber)}</span>
                      <span className="t-body min-w-0 truncate font-semibold text-ink">{problem.title}</span>
                      <DifficultyMark difficulty={problem.difficulty} />
                    </div>

                    <input type="hidden" {...register(`walkthroughs.${index}.problemId`)} />
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...register(`walkthroughs.${index}.url`)}
                    />

                    {problem.walkthrough?.title && (
                      <span className="t-body-sm text-ink-3">
                        Currently: {problem.walkthrough.title}
                        {problem.walkthrough.author && ` — ${problem.walkthrough.author}`}
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
      </PageBody>
    </AppShell>
  );
}

export default AdminContestEdit;
