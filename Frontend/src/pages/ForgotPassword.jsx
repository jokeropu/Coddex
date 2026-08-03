import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AuthLayout from '../design/AuthLayout';
import { Button, FormRow, Input, Note } from '../design/primitives';

const forgotPasswordSchema = z.object({
    emailId: z.email({ message: 'Enter a valid email address' }),
});

function ForgotPassword() {
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

    const submittedData = async (data) => {
        setError('');
        try {
            await axiosClient.post('/user/forgotPassword', data);
            setSubmitted(true);
        } catch (err) {
            const res = err.response?.data;
            setError(
                typeof res === 'string'
                    ? res
                    : 'We could not send the reset link just now. Please try again in a moment.'
            );
        }
    };

    return (
        <AuthLayout
            title="Reset your password"
            subtitle="We’ll email you a link to set a new one."
            footer={
                <span className="t-body text-ink-3">
                    Remembered it?{' '}
                    <Link to="/login" className="font-semibold text-line underline-offset-2 hover:underline">
                        Sign in
                    </Link>
                </span>
            }
        >
            {submitted ? (
                <div className="flex flex-col items-center gap-3 border border-approved/40 bg-[color-mix(in_srgb,var(--c-approved)_7%,transparent)] px-5 py-8 text-center">
                    <MailCheck className="h-6 w-6 text-approved" strokeWidth={1.5} aria-hidden />
                    <div className="flex flex-col gap-1">
                        <p className="t-h3 text-ink">Check your inbox</p>
                        <p className="t-body-sm max-w-xs text-ink-2">
                            If that address is registered, a reset link is on its way. The link expires
                            shortly, so use it soon.
                        </p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit(submittedData)} className="flex flex-col gap-3.5">
                    {error && <Note tone="redline">{error}</Note>}

                    <FormRow label="Email" error={errors.emailId?.message}>
                        <Input
                            {...register('emailId')}
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            invalid={!!errors.emailId}
                        />
                    </FormRow>

                    <Button type="submit" tone="line" size="lg" className="w-full" loading={isSubmitting}>
                        Send reset link
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}

export default ForgotPassword;
