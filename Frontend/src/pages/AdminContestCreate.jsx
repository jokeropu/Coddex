import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import axiosClient from '../utils/axiosClient';
import ProblemForm from '../components/ProblemForm';
import AppShell from '../design/AppShell';
import { toast } from '../design/Toaster';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Input, Textarea,
  FormRow, Note, Plotter,
} from '../design/primitives';

const STEPS = ['details', 'easy', 'medium', 'hard'];
const STEP_LABELS = ['Details', 'Easy problem', 'Medium problem', 'Hard problem'];

function ContestDetailsForm({ onSubmit, defaultValues }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues });

  return (
    <AppShell>
      <PageBody width="max-w-2xl">
        <PageHeader
          title="Schedule a contest"
          detail="A contest is a timed set of three problems — one easy, one medium, one hard. Creating it earns you 500 credits."
        />

        <Module ticks>
          <ModuleHead label="Contest details" right={<span className="t-micro text-ink-3">Step 1 of 4</span>} />

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5 p-4">
            <FormRow label="Title" required error={errors.title?.message}>
              <Input
                {...register('title', { required: 'Title is required' })}
                placeholder="e.g. Weekly Contest 1"
                invalid={!!errors.title}
              />
            </FormRow>

            <FormRow label="Description" required error={errors.description?.message}>
              <Textarea
                {...register('description', { required: 'Description is required' })}
                rows={3}
                placeholder="What this contest covers, and anything entrants should know…"
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
              Next — author the easy problem
            </Button>
          </form>
        </Module>
      </PageBody>
    </AppShell>
  );
}

function AdminContestCreate() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [contestDetails, setContestDetails] = useState(null);
  const [problems, setProblems] = useState({ easy: null, medium: null, hard: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const step = STEPS[stepIndex];

  const handleDetailsSubmit = (data) => {
    setContestDetails(data);
    setStepIndex(1);
  };

  const handleProblemSubmit = async (difficulty, data) => {
    const updatedProblems = { ...problems, [difficulty]: { ...data, difficulty } };
    setProblems(updatedProblems);

    if (difficulty === 'hard') {
      setSubmitting(true);
      setError('');
      try {
        await axiosClient.post('/contest/create', {
          ...contestDetails,
          problems: [updatedProblems.easy, updatedProblems.medium, updatedProblems.hard],
        });
        toast.success('Contest scheduled', { description: `${contestDetails.title} — 500 credits awarded.` });
        navigate('/admin');
      } catch (err) {
        setError(err.response?.data?.error || 'Could not create the contest. Your entries are still here — try again.');
        setSubmitting(false);
      }
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  if (step === 'details') {
    return <ContestDetailsForm onSubmit={handleDetailsSubmit} defaultValues={contestDetails || undefined} />;
  }

  if (submitting) {
    return (
      <AppShell>
        <PageBody><Plotter label="Issuing contest" /></PageBody>
      </AppShell>
    );
  }

  return (
    <>
      {error && (
        <div className="fixed inset-x-0 top-12 z-40 mx-auto w-[min(36rem,calc(100vw-2rem))]">
          <Note tone="redline">{error}</Note>
        </div>
      )}
      <ProblemForm
        key={step}
        heading={`Author the ${step} problem`}
        subheading={`Contest “${contestDetails?.title}” — this problem's difficulty is locked to ${step}.`}
        submitLabel={
          step === 'hard' ? 'Create contest' : `Next — author the ${STEPS[stepIndex + 1]} problem`
        }
        lockedDifficulty={step}
        steps={STEP_LABELS}
        currentStep={stepIndex}
        allowWalkthrough
        onSubmit={(data) => handleProblemSubmit(step, data)}
      />
    </>
  );
}

export default AdminContestCreate;
