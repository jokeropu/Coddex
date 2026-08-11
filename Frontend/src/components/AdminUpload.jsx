import { useParams, useNavigate } from 'react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Upload, FileVideo, ArrowLeft, Link2 } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import AppShell from '../design/AppShell';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, FormRow, Input, Note, Stamp,
} from '../design/primitives';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 bytes';
  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function AdminUpload() {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState('file');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideo, setUploadedVideo] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setError,
    clearErrors,
  } = useForm();

  const selectedFile = watch('videoFile')?.[0];
  const youtubeUrl = watch('youtubeUrl');

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setUploadedVideo(null);
    clearErrors();
    reset();
  };

  const onLinkYoutube = async (data) => {
    setUploading(true);
    clearErrors();

    try {
      const { data: saved } = await axiosClient.post('/video/youtube', {
        problemId,
        url: data.youtubeUrl,
      });
      setUploadedVideo(saved.videoSolution);
      reset();
    } catch (err) {
      console.error('YouTube link error:', err);
      setError('root', {
        type: 'manual',
        message:
          err.response?.data?.error ||
          'That link could not be verified. Check it and try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    const file = data.videoFile[0];

    setUploading(true);
    setUploadProgress(0);
    clearErrors();

    try {
      const signatureResponse = await axiosClient.get(`/video/create/${problemId}`);
      const { signature, timestamp, public_id, api_key, upload_url } = signatureResponse.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp);
      formData.append('public_id', public_id);
      formData.append('api_key', api_key);

      const uploadResponse = await axios.post(upload_url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      const cloudinaryResult = uploadResponse.data;

      const metadataResponse = await axiosClient.post('/video/save', {
        problemId,
        cloudinaryPublicId: cloudinaryResult.public_id,
        secureUrl: cloudinaryResult.secure_url,
        duration: cloudinaryResult.duration,
      });

      setUploadedVideo(metadataResponse.data.videoSolution);
      reset();
    } catch (err) {
      console.error('Upload error:', err);
      setError('root', {
        type: 'manual',
        message:
          err.response?.data?.message ||
          err.response?.data?.error ||
          'The upload did not complete. Check your connection and try again.',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <AppShell>
      <PageBody width="max-w-xl">
        <PageHeader
          title="Attach a walkthrough"
          detail="Upload the video solution for this problem. It becomes Premium content, also unlockable with credits."
          actions={
            <Button size="sm" tone="quiet" onClick={() => navigate('/admin/video')}>
              <ArrowLeft className="h-3 w-3" strokeWidth={2} />
              Back
            </Button>
          }
        />

        <Module ticks>
          <ModuleHead
            label="Walkthrough source"
            right={
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  tone={mode === 'file' ? 'line' : 'quiet'}
                  onClick={() => switchMode('file')}
                  disabled={uploading}
                >
                  <FileVideo className="h-3 w-3" strokeWidth={1.75} />
                  Upload
                </Button>
                <Button
                  size="sm"
                  tone={mode === 'youtube' ? 'line' : 'quiet'}
                  onClick={() => switchMode('youtube')}
                  disabled={uploading}
                >
                  <Link2 className="h-3 w-3" strokeWidth={1.75} />
                  YouTube
                </Button>
              </div>
            }
          />

          {mode === 'youtube' ? (
            <form onSubmit={handleSubmit(onLinkYoutube)} className="flex flex-col gap-4 p-4">
              <FormRow
                label="YouTube link"
                required
                error={errors.youtubeUrl?.message}
                hint="uses no storage"
              >
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={uploading}
                  invalid={!!errors.youtubeUrl}
                  {...register('youtubeUrl', {
                    required: 'Paste the YouTube link for this walkthrough',
                    validate: (v) =>
                      /(?:youtube\.com|youtu\.be)/.test(v || '') ||
                      'That does not look like a YouTube link',
                  })}
                />
              </FormRow>

              {errors.root && <Note tone="redline">{errors.root.message}</Note>}

              {uploadedVideo && (
                <div className="flex flex-col items-center gap-3 border border-approved/40 bg-[color-mix(in_srgb,var(--c-approved)_7%,transparent)] px-4 py-5">
                  <Stamp verdict="approved" label="Linked" sub="Walkthrough saved" />
                  <div className="flex flex-col items-center gap-0.5 text-center">
                    {uploadedVideo.title && (
                      <span className="t-body text-ink">{uploadedVideo.title}</span>
                    )}
                    {uploadedVideo.author && (
                      <span className="t-data text-ink-3">{uploadedVideo.author}</span>
                    )}
                  </div>
                  <Button size="sm" onClick={() => navigate('/admin/video')}>
                    Back to problems
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                tone="line"
                size="lg"
                className="w-full"
                loading={uploading}
                disabled={!youtubeUrl}
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                Verify and link
              </Button>
            </form>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <FormRow label="Choose a file" required error={errors.videoFile?.message}>
              <label
                className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-rule-strong bg-sheet-sunk px-4 py-8 text-center transition-colors hover:border-line hover:bg-sheet-hover"
              >
                <FileVideo className="h-6 w-6 text-ink-3" strokeWidth={1.5} aria-hidden />
                <span className="t-field text-ink-2">
                  {selectedFile ? 'Choose a different file' : 'Select a video file'}
                </span>
                <span className="t-micro text-ink-3">MP4, MOV or WebM</span>
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  disabled={uploading}
                  {...register('videoFile', {
                    required: 'Select a video file to upload',
                    validate: {
                      isVideo: (files) =>
                        !files?.[0]
                          ? 'Select a video file to upload'
                          : files[0].type.startsWith('video/') || 'That file is not a video',
                      fileSize: (files) =>
                        !files?.[0] ||
                        files[0].size <= 100 * 1024 * 1024 ||
                        'That file is over 100 MB. Compress it and try again.',
                    },
                  })}
                />
              </label>
            </FormRow>

            {selectedFile && (
              <div className="flex items-center gap-2.5 border border-rule bg-sheet-sunk px-3 py-2">
                <FileVideo className="h-3.5 w-3.5 shrink-0 text-line" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0">
                  <p className="t-body truncate text-ink">{selectedFile.name}</p>
                  <p className="t-data text-ink-3">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="t-label text-ink-2">Uploading</span>
                  <span className="t-data-lg font-semibold text-line">{uploadProgress}%</span>
                </div>
                <div
                  className="h-2 w-full border border-rule bg-sheet-sunk"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-line transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {errors.root && <Note tone="redline">{errors.root.message}</Note>}

            {uploadedVideo && (
              <div className="flex flex-col items-center gap-3 border border-approved/40 bg-[color-mix(in_srgb,var(--c-approved)_7%,transparent)] px-4 py-5">
                <Stamp verdict="approved" label="Attached" sub="Walkthrough saved" />
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  <span className="t-data text-ink-2">
                    Duration <span className="text-ink">{formatDuration(uploadedVideo.duration)}</span>
                  </span>
                  <span className="t-data text-ink-2">
                    {new Date(uploadedVideo.uploadedAt).toLocaleString()}
                  </span>
                </div>
                <Button size="sm" onClick={() => navigate('/admin/video')}>
                  Back to problems
                </Button>
              </div>
            )}

            <Button
              type="submit"
              tone="line"
              size="lg"
              className="w-full"
              loading={uploading}
              disabled={!selectedFile}
            >
              <Upload className="h-3.5 w-3.5" strokeWidth={2} />
              Upload walkthrough
            </Button>
          </form>
          )}
        </Module>
      </PageBody>
    </AppShell>
  );
}

export default AdminUpload;
