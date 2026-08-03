import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleLogin } from '@react-oauth/google';
import { Turnstile } from '@marsidev/react-turnstile';
import { Check } from 'lucide-react';
import { registerUser, googleAuth } from '../authSlice';
import AuthLayout, { PasswordField, GoogleBlock } from '../design/AuthLayout';
import { useGround } from '../design/ground';
import { cn } from '../design/cn';
import { Button, FormRow, Input, Note } from '../design/primitives';

const passwordSchema = z
    .string()
    .min(8, { message: 'Password should be at least 8 characters' })
    .regex(/[a-z]/, { message: 'Password must contain a lowercase letter' })
    .regex(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain a number' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain a special character' });

const signupSchema = z
    .object({
        firstName: z.string().min(3, { message: 'Name should be at least 3 characters' }),
        emailId: z.email({ message: 'Enter a valid email address' }),
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

function Signup() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { ground } = useGround();
    const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

    const [turnstileToken, setTurnstileToken] = useState('');
    const turnstileRef = useRef(null);
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({ resolver: zodResolver(signupSchema) });

    const password = watch('password') || '';

    useEffect(() => {
        if (isAuthenticated) navigate('/');
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (error) {
            turnstileRef.current?.reset();
            setTurnstileToken('');
        }
    }, [error]);

    const submittedData = (data) => dispatch(registerUser({ ...data, turnstileToken }));

    return (
        <AuthLayout
            title="Create an account"
            subtitle="Free to start. Your first problem is a minute away."
            footer={
                <span className="t-body text-ink-3">
                    Already registered?{' '}
                    <Link to="/login" className="font-semibold text-line underline-offset-2 hover:underline">
                        Log in
                    </Link>
                </span>
            }
        >
            <form onSubmit={handleSubmit(submittedData)} className="flex flex-col gap-3.5">
                {error && <Note tone="redline">{error}</Note>}

                <FormRow label="Name" error={errors.firstName?.message}>
                    <Input
                        {...register('firstName')}
                        autoComplete="given-name"
                        placeholder="Your name"
                        invalid={!!errors.firstName}
                    />
                </FormRow>

                <FormRow label="Email" error={errors.emailId?.message}>
                    <Input
                        {...register('emailId')}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        invalid={!!errors.emailId}
                    />
                </FormRow>

                <FormRow label="Password" error={errors.password?.message}>
                    <PasswordField
                        register={register}
                        name="password"
                        placeholder="Choose a password"
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

                <FormRow label="Confirm password" error={errors.confirmPassword?.message}>
                    <PasswordField
                        register={register}
                        name="confirmPassword"
                        placeholder="Re-enter your password"
                        invalid={!!errors.confirmPassword}
                        autoComplete="new-password"
                    />
                </FormRow>

                <div className="flex justify-center py-0.5">
                    <Turnstile
                        ref={turnstileRef}
                        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                        options={{ theme: ground === 'night' ? 'dark' : 'light' }}
                        onSuccess={setTurnstileToken}
                        onExpire={() => setTurnstileToken('')}
                    />
                </div>

                <Button
                    type="submit"
                    tone="line"
                    size="lg"
                    className="w-full"
                    loading={loading}
                    disabled={!turnstileToken}
                >
                    Create account
                </Button>
                {!turnstileToken && (
                    <p className="t-micro -mt-1.5 text-center text-ink-3">
                        Complete the verification above to continue
                    </p>
                )}
            </form>

            <GoogleBlock>
                <GoogleLogin
                    theme={ground === 'night' ? 'filled_black' : 'outline'}
                    shape="square"
                    text="signup_with"
                    width="384"
                    onSuccess={(res) => dispatch(googleAuth(res.credential))}
                    onError={() => {}}
                />
            </GoogleBlock>
        </AuthLayout>
    );
}

export default Signup;
