import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AuthLayout, { PasswordField } from '../design/AuthLayout';
import { cn } from '../design/cn';
import { Button, FormRow, Note, Stamp } from '../design/primitives';

const passwordSchema = z
    .string()
    .min(8, { message: 'Password should be at least 8 characters' })
    .regex(/[a-z]/, { message: 'Password must contain a lowercase letter' })
    .regex(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain a number' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain a special character' });

const resetPasswordSchema = z
    .object({
        password: passwordSchema,
        confirmPassword: z.string().min(1, { message: 'Re-enter your password' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const RULES = [
    { test: (v) => v.length >= 8, label: '8+ characters' },
    { test: (v) => /[a-z]/.test(v), label: 'Lowercase' },
    { test: (v) => /[A-Z]/.test(v), label: 'Uppercase' },
    { test: (v) => /[0-9]/.test(v), label: 'Number' },
    { test: (v) => /[^a-zA-Z0-9]/.test(v), label: 'Symbol' },
];

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({ resolver: zodResolver(resetPasswordSchema) });

    const password = watch('password') || '';

    const submittedData = async (data) => {
        setError('');
        try {
            await axiosClient.post(`/user/resetPassword/${token}`, { password: data.password });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            const res = err.response?.data;
            setError(
                typeof res === 'string'
                    ? res
                    : 'That reset link is no longer valid. Request a new one and try again.'
            );
        }
    };

    return (
        <AuthLayout
            title="Set a new password"
            subtitle="Choose something you haven’t used here before."
            footer={
                <Link to="/login" className="t-body font-semibold text-line underline-offset-2 hover:underline">
                    Back to sign in
                </Link>
            }
        >
            {success ? (
                <div className="flex flex-col items-center gap-4 py-6">
                    <Stamp verdict="approved" label="Reset" sub="Password updated" />
                    <p className="t-body-sm text-center text-ink-2">
                        Taking you to sign in…
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit(submittedData)} className="flex flex-col gap-3.5">
                    {error && <Note tone="redline">{error}</Note>}

                    <FormRow label="New password" error={errors.password?.message}>
                        <PasswordField
                            register={register}
                            name="password"
                            placeholder="Choose a new password"
                            invalid={!!errors.password}
                            autoComplete="new-password"
                        />
                        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            {RULES.map((r) => {
                                const ok = r.test(password);
                                return (
                                    <li
                                        key={r.label}
                                        className={cn(
                                            't-micro flex items-center gap-1 transition-colors',
                                            ok ? 'text-approved' : 'text-ink-3'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex h-2.5 w-2.5 items-center justify-center border',
                                                ok ? 'border-approved bg-approved/20' : 'border-rule'
                                            )}
                                            aria-hidden
                                        >
                                            {ok && <Check className="h-1.5 w-1.5" strokeWidth={4} />}
                                        </span>
                                        {r.label}
                                    </li>
                                );
                            })}
                        </ul>
                    </FormRow>

                    <FormRow label="Confirm new password" error={errors.confirmPassword?.message}>
                        <PasswordField
                            register={register}
                            name="confirmPassword"
                            placeholder="Re-enter your new password"
                            invalid={!!errors.confirmPassword}
                            autoComplete="new-password"
                        />
                    </FormRow>

                    <Button type="submit" tone="line" size="lg" className="w-full" loading={isSubmitting}>
                        Reset password
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}

export default ResetPassword;
