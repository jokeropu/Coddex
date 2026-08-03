import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { Upload, KeyRound, TriangleAlert } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import { updateUserProfile, logoutUser } from '../authSlice';
import AppShell from '../design/AppShell';
import { GithubMark, LinkedinMark } from '../design/brands';
import { toast } from '../design/Toaster';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Input, FormRow, Note,
} from '../design/primitives';
import { Dialog, DialogContent } from '../design/overlays';

function Settings() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');
    const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
    const [linksSaving, setLinksSaving] = useState(false);
    const [linksError, setLinksError] = useState('');

    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState('');

    const [passwordRequestSent, setPasswordRequestSent] = useState(false);
    const [passwordRequestLoading, setPasswordRequestLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const extractMessage = (err) => {
        const data = err.response?.data;
        return typeof data === 'string' ? data : (data?.error || 'Something went wrong. Please try again.');
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setAvatarError('That file is not an image. Choose a PNG or JPEG.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError('That image is over 5 MB. Choose a smaller one.');
            return;
        }

        setAvatarUploading(true);
        setAvatarError('');

        try {
            const { data: sig } = await axiosClient.get('/user/avatar/signature');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('signature', sig.signature);
            formData.append('timestamp', sig.timestamp);
            formData.append('public_id', sig.public_id);
            formData.append('overwrite', sig.overwrite);
            formData.append('api_key', sig.api_key);

            const { data: cloudinaryResult } = await axios.post(sig.upload_url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { data } = await axiosClient.patch('/user/profile', {
                cloudinaryPublicId: cloudinaryResult.public_id,
                secureUrl: cloudinaryResult.secure_url,
            });

            dispatch(updateUserProfile({ profilePicture: data.user.profilePicture }));
            toast.success('Profile picture updated');
        } catch (err) {
            setAvatarError(extractMessage(err));
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleLinksSubmit = async (e) => {
        e.preventDefault();
        setLinksSaving(true);
        setLinksError('');

        try {
            const { data } = await axiosClient.patch('/user/profile', { githubUrl, linkedinUrl });
            dispatch(updateUserProfile({
                githubUrl: data.user.githubUrl,
                linkedinUrl: data.user.linkedinUrl,
            }));
            toast.success('Links saved');
        } catch (err) {
            setLinksError(extractMessage(err));
        } finally {
            setLinksSaving(false);
        }
    };

    const handleChangePasswordRequest = async () => {
        setPasswordRequestLoading(true);
        setPasswordError('');
        try {
            await axiosClient.post('/user/forgotPassword', { emailId: user.emailId });
            setPasswordRequestSent(true);
        } catch (err) {
            setPasswordError(extractMessage(err));
        } finally {
            setPasswordRequestLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        setDeleteError('');
        try {
            await axiosClient.delete('/user/deleteProfile');
            dispatch(logoutUser());
            navigate('/signup');
        } catch (err) {
            setDeleteError(extractMessage(err));
            setDeleting(false);
        }
    };

    const initial = user?.firstName?.[0]?.toUpperCase() || 'U';

    return (
        <AppShell>
            <PageBody width="max-w-2xl">
                <PageHeader
                    title="Settings"
                    detail="How you appear on standings and in discussion."
                />

                <Module ticks className="mb-4">
                    <ModuleHead label="Identity" />
                    <div className="flex flex-wrap items-center gap-4 p-4">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand">
                            {user?.profilePicture ? (
                                <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xl font-extrabold text-white">{initial}</span>
                            )}
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="t-body font-semibold text-ink">
                                {user?.firstName} {user?.lastName || ''}
                            </p>
                            <p className="t-data mb-2.5 text-ink-3">{user?.emailId}</p>

                            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-rule bg-sheet-raised px-4 transition-colors hover:border-rule-strong hover:bg-sheet-hover">
                                <Upload className="h-3 w-3 text-ink-2" strokeWidth={1.75} aria-hidden />
                                <span className="t-field text-ink-2">
                                    {avatarUploading ? 'Uploading…' : 'Change picture'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    disabled={avatarUploading}
                                    className="sr-only"
                                />
                            </label>
                            <p className="t-micro mt-1.5 text-ink-3">PNG or JPEG, up to 5 MB</p>
                            {avatarError && <Note tone="redline" className="mt-2">{avatarError}</Note>}
                        </div>
                    </div>
                </Module>

                <Module ticks className="mb-4">
                    <ModuleHead label="Public links" />
                    <form onSubmit={handleLinksSubmit} className="flex flex-col gap-3.5 p-4">
                        <FormRow label="GitHub">
                            <div className="relative">
                                <GithubMark className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                                <Input
                                    type="url"
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    placeholder="https://github.com/yourusername"
                                    className="pl-8"
                                />
                            </div>
                        </FormRow>

                        <FormRow label="LinkedIn">
                            <div className="relative">
                                <LinkedinMark className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                                <Input
                                    type="url"
                                    value={linkedinUrl}
                                    onChange={(e) => setLinkedinUrl(e.target.value)}
                                    placeholder="https://linkedin.com/in/yourusername"
                                    className="pl-8"
                                />
                            </div>
                        </FormRow>

                        {linksError && <Note tone="redline">{linksError}</Note>}

                        <Button type="submit" tone="line" size="md" className="self-start" loading={linksSaving}>
                            Save links
                        </Button>
                    </form>
                </Module>

                <Module ticks className="mb-4">
                    <ModuleHead label="Password" />
                    <div className="flex flex-col gap-3 p-4">
                        <p className="t-body text-ink-2">
                            We’ll email a reset link to <span className="t-data text-ink">{user?.emailId}</span>.
                        </p>

                        {passwordError && <Note tone="redline">{passwordError}</Note>}

                        {passwordRequestSent ? (
                            <Note tone="approved" title="SENT">
                                Check your inbox for the link to set a new password.
                            </Note>
                        ) : (
                            <Button
                                size="md"
                                className="self-start"
                                loading={passwordRequestLoading}
                                onClick={handleChangePasswordRequest}
                            >
                                <KeyRound className="h-3 w-3" strokeWidth={1.75} />
                                Send reset link
                            </Button>
                        )}
                    </div>
                </Module>

                <Module className="border-redline/45">
                    <div className="flex items-center gap-2 border-b border-redline/45 bg-[color-mix(in_srgb,var(--c-redline)_8%,transparent)] px-3 py-1.5">
                        <TriangleAlert className="h-3 w-3 text-redline" strokeWidth={2} aria-hidden />
                        <span className="t-label text-redline">Irreversible</span>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                        <p className="t-body text-ink-2">
                            Deleting your account removes your profile, every submission, your contest
                            history and your rating. This cannot be undone.
                        </p>
                        <Button tone="danger" size="md" className="self-start" onClick={() => setShowDeleteModal(true)}>
                            Delete account
                        </Button>
                    </div>
                </Module>
            </PageBody>

            <Dialog
                open={showDeleteModal}
                onOpenChange={(o) => {
                    setShowDeleteModal(o);
                    if (!o) { setDeleteConfirmText(''); setDeleteError(''); }
                }}
            >
                <DialogContent
                    title="Delete your account?"
                    description="This removes everything and cannot be undone."
                    width="max-w-md"
                    footer={
                        <>
                            <Button size="sm" tone="quiet" disabled={deleting} onClick={() => setShowDeleteModal(false)}>
                                Keep my account
                            </Button>
                            <Button
                                size="sm"
                                tone="redline"
                                loading={deleting}
                                disabled={deleteConfirmText !== 'DELETE'}
                                onClick={handleDeleteAccount}
                            >
                                Delete permanently
                            </Button>
                        </>
                    }
                >
                    <div className="flex flex-col gap-3">
                        <p className="t-body text-ink-2">
                            Your profile, submissions, contest participation, rating and all related data
                            will be erased.
                        </p>
                        <FormRow
                            label="Type DELETE to confirm"
                            error={deleteError || undefined}
                        >
                            <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                autoComplete="off"
                                invalid={!!deleteError}
                            />
                        </FormRow>
                    </div>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}

export default Settings;
