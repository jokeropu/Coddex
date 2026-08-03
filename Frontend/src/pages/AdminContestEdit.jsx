import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import { toast } from '../design/Toaster';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Input, Textarea,
  FormRow, Note, Plotter, EmptySheet,
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
          detail="Title, description and timing can change until the contest opens. The three problems are fixed once created."
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
