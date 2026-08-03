import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleLogin } from '@react-oauth/google';
import { Turnstile } from '@marsidev/react-turnstile';
import { LogIn } from 'lucide-react';
import { loginUser, googleAuth } from '../authSlice';
import AuthLayout, { PasswordField, GoogleBlock } from '../design/AuthLayout';
import { useGround } from '../design/ground';
import { Button, FormRow, Input, Note } from '../design/primitives';

const loginSchema = z.object({
    emailId: z.email({ message: 'Enter a valid email address' }),
    password: z.string().min(1, { message: 'Enter your password' }),
});

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { ground } = useGround();
    const { isAuthenticated, error } = useSelector((state) => state.auth);

    const [turnstileToken, setTurnstileToken] = useState('');
    const turnstileRef = useRef(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({ resolver: zodResolver(loginSchema) });

    useEffect(() => {
        if (isAuthenticated) navigate('/');
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (error) {
            turnstileRef.current?.reset();
            setTurnstileToken('');
        }
    }, [error]);

    const submittedData = (data) => dispatch(loginUser({ ...data, turnstileToken }));

    return (
        <AuthLayout
            title="Log in"
            subtitle="Welcome back. Pick up where your last draft left off."
            pageRef="AUTH-01"
            footer={
                <span className="t-body-sm text-ink-3">
                    New to Coddex?{' '}
                    <Link to="/signup" className="font-semibold text-line underline-offset-2 hover:underline">
                        Create an account
                    </Link>
                </span>
            }
        >
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

                <FormRow
                    label="Password"
                    error={errors.password?.message}
                    hint={
                        <Link to="/forgot-password" className="text-line underline-offset-2 hover:underline">
                            Forgot password?
                        </Link>
                    }
                >
                    <PasswordField
                        register={register}
                        name="password"
                        placeholder="Your password"
                        invalid={!!errors.password}
                        autoComplete="current-password"
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
                    loading={isSubmitting}
                    disabled={!turnstileToken}
                >
                    <LogIn className="h-4 w-4" strokeWidth={2} />
                    Log in
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
                    text="signin_with"
                    onSuccess={(res) => dispatch(googleAuth(res.credential))}
                    onError={() => {}}
                />
            </GoogleBlock>
        </AuthLayout>
    );
}

export default Login;
