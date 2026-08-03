import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Check } from 'lucide-react';
import AppShell from '../design/AppShell';
import { cn, difficultyMeta } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Input, Textarea,
  NativeSelect, FormRow, Note, Chip, DifficultyMark,
} from '../design/primitives';

export const SUPPORTED_LANGUAGES = ['C++', 'C', 'Java', 'JavaScript', 'Python'];

const TAG_OPTIONS = [
  ['arrays', 'Arrays'], ['strings', 'Strings'], ['dynamic programming', 'DP'],
  ['graphs', 'Graphs'], ['trees', 'Trees'], ['maths', 'Maths'],
  ['linkedlists', 'Linked Lists'], ['stacks', 'Stacks'], ['queues', 'Queues'],
  ['hashing', 'Hashing'], ['greedy', 'Greedy'], ['recursion', 'Recursion'],
];

const problemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.enum(TAG_OPTIONS.map(([v]) => v)),
  visibleTestCases: z
    .array(
      z.object({
        input: z.string().min(1, 'Input is required'),
        output: z.string().min(1, 'Output is required'),
        explanation: z.string().min(1, 'Explanation is required'),
      })
    )
    .min(1, 'At least one visible test case required'),
  hiddenTestCases: z
    .array(
      z.object({
        input: z.string().min(1, 'Input is required'),
        output: z.string().min(1, 'Output is required'),
      })
    )
    .min(1, 'At least one hidden test case required'),
  startCode: z
    .array(
      z.object({
        language: z.enum(SUPPORTED_LANGUAGES),
        initialCode: z.string().min(1, 'Initial code is required'),
      })
    )
    .length(SUPPORTED_LANGUAGES.length, `All ${SUPPORTED_LANGUAGES.length} languages required`),
  referenceSolution: z
    .array(
      z.object({
        language: z.enum(SUPPORTED_LANGUAGES),
        completeCode: z.string().min(1, 'Complete code is required'),
      })
    )
    .length(SUPPORTED_LANGUAGES.length, `All ${SUPPORTED_LANGUAGES.length} languages required`),
  hints: z
    .array(z.object({ text: z.string().min(1, 'Hint cannot be empty') }))
    .min(1, 'At least one hint is required'),
});

const defaultFormValues = {
  startCode: SUPPORTED_LANGUAGES.map((language) => ({ language, initialCode: '' })),
  referenceSolution: SUPPORTED_LANGUAGES.map((language) => ({ language, completeCode: '' })),
  hints: [],
};

const alignByLanguage = (entries, codeKey) =>
  SUPPORTED_LANGUAGES.map((language) => {
    const existing = entries?.find((e) => e.language === language);
    return existing || { language, [codeKey]: '' };
  });

const codeAreaClass = 'font-mono text-[11px] leading-[17px]';

const StepRail = ({ steps, current }) => (
  <ol className="mb-4 flex items-stretch border border-rule">
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li
          key={label}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5',
            i > 0 && 'border-l border-rule',
            active && 'bg-sheet-hover'
          )}
          aria-current={active ? 'step' : undefined}
        >
          <span
            className={cn(
              'flex h-3.5 w-3.5 shrink-0 items-center justify-center border',
              done && 'border-approved bg-approved/20',
              active && 'border-line bg-line/20',
              !done && !active && 'border-rule'
            )}
            aria-hidden
          >
            {done && <Check className="h-2 w-2 text-approved" strokeWidth={4} />}
          </span>
          <span
            className={cn(
              't-micro truncate',
              active ? 'text-ink' : done ? 'text-ink-2' : 'text-ink-3'
            )}
          >
            {label}
          </span>
        </li>
      );
    })}
  </ol>
);

function ProblemForm({
  heading,
  subheading,
  defaultValues,
  submitLabel,
  onSubmit,
  lockedDifficulty,
  steps,
  currentStep,
}) {
  const resolvedDefaults =
    defaultValues || (lockedDifficulty ? { ...defaultFormValues, difficulty: lockedDifficulty } : defaultFormValues);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      ...resolvedDefaults,
      startCode: alignByLanguage(resolvedDefaults.startCode, 'initialCode'),
      referenceSolution: alignByLanguage(resolvedDefaults.referenceSolution, 'completeCode'),
      hints: (resolvedDefaults.hints || []).map((h) => (typeof h === 'string' ? { text: h } : h)),
    },
  });

  const { fields: visibleFields, append: appendVisible, remove: removeVisible } = useFieldArray({
    control, name: 'visibleTestCases',
  });
  const { fields: hiddenFields, append: appendHidden, remove: removeHidden } = useFieldArray({
    control, name: 'hiddenTestCases',
  });
  const { fields: hintFields, append: appendHint, remove: removeHint } = useFieldArray({
    control, name: 'hints',
  });

  const submitWithHintsFlattened = (data) => {
    onSubmit({ ...data, hints: data.hints.map((h) => h.text) });
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <AppShell>
      <PageBody width="max-w-4xl">
        <PageHeader title={heading} detail={subheading} />

        {steps && <StepRail steps={steps} current={currentStep} />}

        {hasErrors && (
          <Note tone="redline" className="mb-4">
            Some fields still need attention. The problems are marked below.
          </Note>
        )}

        <form onSubmit={handleSubmit(submitWithHintsFlattened)} className="flex flex-col gap-4">
          <Module ticks>
            <ModuleHead label="Problem identity" />
            <div className="flex flex-col gap-3.5 p-4">
              <FormRow label="Title" required error={errors.title?.message}>
                <Input {...register('title')} placeholder="e.g. Two Sum" invalid={!!errors.title} />
              </FormRow>

              <FormRow label="Statement" required error={errors.description?.message}>
                <Textarea
                  {...register('description')}
                  rows={8}
                  placeholder="Describe the problem, its constraints, and the expected input and output format…"
                  invalid={!!errors.description}
                />
              </FormRow>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <FormRow label="Difficulty" required error={errors.difficulty?.message}>
                  {lockedDifficulty ? (
                    <div className="flex h-9 items-center gap-2 border border-rule bg-sheet-sunk px-2.5">
                      <input type="hidden" {...register('difficulty')} />
                      <DifficultyMark difficulty={lockedDifficulty} />
                      <span className="t-micro text-ink-3">locked for this contest slot</span>
                    </div>
                  ) : (
                    <NativeSelect {...register('difficulty')} className="[&>select]:h-9">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </NativeSelect>
                  )}
                </FormRow>

                <FormRow label="Topic" required error={errors.tags?.message}>
                  <NativeSelect {...register('tags')} className="[&>select]:h-9">
                    {TAG_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </NativeSelect>
                </FormRow>
              </div>
            </div>
          </Module>

          <Module ticks>
            <ModuleHead
              label="Visible cases"
              right={
                <Button
                  type="button"
                  size="xs"
                  onClick={() => appendVisible({ input: '', output: '', explanation: '' })}
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Add
                </Button>
              }
            >
              <span className="t-micro text-ink-3">shown to solvers</span>
            </ModuleHead>

            <div className="flex flex-col gap-3 p-4">
              {errors.visibleTestCases?.root && (
                <Note tone="redline">{errors.visibleTestCases.root.message}</Note>
              )}
              {visibleFields.length === 0 && (
                <p className="t-body-sm text-ink-3">At least one visible case is required.</p>
              )}

              {visibleFields.map((field, index) => (
                <div key={field.id} className="border border-rule">
                  <div className="flex items-center justify-between border-b border-rule bg-sheet-sunk px-2.5 py-1">
                    <span className="t-micro text-line">Example {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVisible(index)}
                      className="text-ink-3 transition-colors hover:text-redline"
                      aria-label={`Remove visible case ${index + 1}`}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5 p-2.5">
                    <FormRow label="Input" error={errors.visibleTestCases?.[index]?.input?.message}>
                      <Textarea
                        {...register(`visibleTestCases.${index}.input`)}
                        rows={3}
                        placeholder="One line per line of stdin"
                        className={codeAreaClass}
                        invalid={!!errors.visibleTestCases?.[index]?.input}
                      />
                    </FormRow>
                    <FormRow label="Expected output" error={errors.visibleTestCases?.[index]?.output?.message}>
                      <Textarea
                        {...register(`visibleTestCases.${index}.output`)}
                        rows={3}
                        placeholder="One line per line of expected output"
                        className={codeAreaClass}
                        invalid={!!errors.visibleTestCases?.[index]?.output}
                      />
                    </FormRow>
                    <FormRow label="Explanation" error={errors.visibleTestCases?.[index]?.explanation?.message}>
                      <Textarea
                        {...register(`visibleTestCases.${index}.explanation`)}
                        rows={2}
                        placeholder="Why this input produces that output"
                        invalid={!!errors.visibleTestCases?.[index]?.explanation}
                      />
                    </FormRow>
                  </div>
                </div>
              ))}
            </div>
          </Module>

          <Module ticks>
            <ModuleHead
              label="Hidden cases"
              right={
                <Button type="button" size="xs" onClick={() => appendHidden({ input: '', output: '' })}>
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Add
                </Button>
              }
            >
              <span className="t-micro text-ink-3">judged on submit</span>
            </ModuleHead>

            <div className="flex flex-col gap-3 p-4">
              {errors.hiddenTestCases?.root && (
                <Note tone="redline">{errors.hiddenTestCases.root.message}</Note>
              )}
              {hiddenFields.length === 0 && (
                <p className="t-body-sm text-ink-3">At least one hidden case is required.</p>
              )}

              {hiddenFields.map((field, index) => (
                <div key={field.id} className="border border-rule">
                  <div className="flex items-center justify-between border-b border-rule bg-sheet-sunk px-2.5 py-1">
                    <span className="t-micro text-ink-2">Case {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeHidden(index)}
                      className="text-ink-3 transition-colors hover:text-redline"
                      aria-label={`Remove hidden case ${index + 1}`}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5 p-2.5">
                    <FormRow label="Input" error={errors.hiddenTestCases?.[index]?.input?.message}>
                      <Textarea
                        {...register(`hiddenTestCases.${index}.input`)}
                        rows={3}
                        className={codeAreaClass}
                        invalid={!!errors.hiddenTestCases?.[index]?.input}
                      />
                    </FormRow>
                    <FormRow label="Expected output" error={errors.hiddenTestCases?.[index]?.output?.message}>
                      <Textarea
                        {...register(`hiddenTestCases.${index}.output`)}
                        rows={3}
                        className={codeAreaClass}
                        invalid={!!errors.hiddenTestCases?.[index]?.output}
                      />
                    </FormRow>
                  </div>
                </div>
              ))}
            </div>
          </Module>

          <Module ticks>
            <ModuleHead label="Starter code & reference solutions" />
            <div className="flex flex-col gap-4 p-4">
              {SUPPORTED_LANGUAGES.map((language, index) => (
                <div key={language} className="border border-rule">
                  <div className="border-b border-rule bg-sheet-sunk px-2.5 py-1">
                    <span className="t-micro text-line">{language}</span>
                  </div>
                  <div className="flex flex-col gap-2.5 p-2.5">
                    <FormRow label="Starter code" error={errors.startCode?.[index]?.initialCode?.message}>
                      <Textarea
                        {...register(`startCode.${index}.initialCode`)}
                        rows={6}
                        className={codeAreaClass}
                        invalid={!!errors.startCode?.[index]?.initialCode}
                      />
                    </FormRow>
                    <FormRow label="Reference solution" error={errors.referenceSolution?.[index]?.completeCode?.message}>
                      <Textarea
                        {...register(`referenceSolution.${index}.completeCode`)}
                        rows={6}
                        className={codeAreaClass}
                        invalid={!!errors.referenceSolution?.[index]?.completeCode}
                      />
                    </FormRow>
                  </div>
                </div>
              ))}
            </div>
          </Module>

          <Module ticks>
            <ModuleHead
              label="Hints"
              right={
                <Button type="button" size="xs" onClick={() => appendHint({ text: '' })}>
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Add
                </Button>
              }
            >
              <span className="t-micro text-ink-3">Premium or credit-unlocked</span>
            </ModuleHead>

            <div className="flex flex-col gap-2.5 p-4">
              {errors.hints?.root && <Note tone="redline">{errors.hints.root.message}</Note>}
              {hintFields.length === 0 && (
                <p className="t-body-sm text-ink-3">At least one hint is required.</p>
              )}

              {hintFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <Chip className="mt-2 shrink-0">{index + 1}</Chip>
                  <div className="min-w-0 flex-1">
                    <Textarea
                      {...register(`hints.${index}.text`)}
                      rows={2}
                      placeholder={`Hint ${index + 1} — nudge, don't solve`}
                      invalid={!!errors.hints?.[index]?.text}
                    />
                    {errors.hints?.[index]?.text && (
                      <span className="t-body-sm mt-1 block text-redline">
                        {errors.hints[index].text.message}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHint(index)}
                    className="mt-2 shrink-0 text-ink-3 transition-colors hover:text-redline"
                    aria-label={`Remove hint ${index + 1}`}
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          </Module>

          <Button type="submit" tone="line" size="lg" className="w-full" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </form>
      </PageBody>
    </AppShell>
  );
}

export default ProblemForm;
