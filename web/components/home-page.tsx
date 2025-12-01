'use client';

import { AlertCircle, CircleHelp, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AlbumInfo {
  album_title: string;
  author_name: string;
  post_count: number;
  has_unlock_all: boolean;
}

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CloudDownloadIcon } from '@/components/icons/cloud-download';
import { AutoScrollText } from '@/components/ui/auto-scroll-text';
import type { Dictionary } from '@/lib/get-dictionary';
import { parseAlbumId, parseAuthToken } from '@/lib/utils';

interface HomePageProps {
  dict: Dictionary;
}

export default function HomePage({ dict }: HomePageProps) {
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'zh';
  const [albumId, setAlbumId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState<'retrieving' | 'downloading' | null>(null);
  const [error, setError] = useState('');
  const [tocFormat, setTocFormat] = useState('chapter_number');

  const handleFetchInfo = async () => {
    const cleanAlbumId = parseAlbumId(albumId);
    if (!cleanAlbumId || !authToken.trim()) {
      setError(dict.form.error.validation);
      return;
    }

    setLoading(true);
    setError('');
    setAlbumInfo(null);

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          album_id: cleanAlbumId,
          auth_token: authToken.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch album info');
      }

      setAlbumInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.form.error.default);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const cleanAlbumId = parseAlbumId(albumId);
    if (!cleanAlbumId || !authToken.trim()) {
      setError(dict.form.error.validation);
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('retrieving');
    setError('');

    // First, track progress via SSE
    const progressParams = new URLSearchParams({
      album_id: cleanAlbumId,
      auth_token: authToken.trim(),
      toc_format: tocFormat,
      progress: 'true',
    });

    const eventSource = new EventSource(`/api/download?${progressParams}`);

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setDownloadProgress(data.posts_processed);
      setDownloadStage('retrieving');
    });

    eventSource.addEventListener('complete', async (e) => {
      const data = JSON.parse(e.data);
      setDownloadProgress(data.posts_processed);
      setDownloadStage('downloading');
      eventSource.close();

      // Now trigger the actual download
      const downloadParams = new URLSearchParams({
        album_id: cleanAlbumId,
        auth_token: authToken.trim(),
        toc_format: tocFormat,
      });

      try {
        const response = await fetch(`/api/download?${downloadParams}`);
        const blob = await response.blob();

        // Get filename from Content-Disposition header or use the one from progress
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = data.filename || 'download.txt';

        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches?.[1]) {
            filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
          }
        }

        // Create object URL and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        setError(err instanceof Error ? err.message : dict.form.error.default);
      }

      // Reset state after a short delay
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
        setDownloadStage(null);
      }, 1000);
    });

    eventSource.addEventListener('error', (e: Event) => {
      const msgEvent = e as MessageEvent;
      if (msgEvent.data) {
        try {
          const data = JSON.parse(msgEvent.data);
          setError(data.message || dict.form.error.default);
        } catch {
          setError(dict.form.error.default);
        }
      } else {
        setError(dict.form.error.default);
      }
      eventSource.close();
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadStage(null);
    });

    eventSource.onerror = () => {
      eventSource.close();
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadStage(null);
    };
  };

  return (
    <div className='min-h-screen flex items-start justify-center bg-slate-50 dark:bg-slate-950 p-4 pt-20 relative'>
      <div className='absolute top-4 right-4'>
        <Button variant='ghost' asChild>
          <Link href={lang === 'en' ? '/?lang=zh' : '/?lang=en'} replace>
            {lang === 'en' ? '中文' : 'English'}
          </Link>
        </Button>
      </div>
      <Card className='w-full max-w-md shadow-xl'>
        <CardHeader>
          <CardTitle className='text-2xl flex items-center gap-2'>
            <CloudDownloadIcon className='h-6 w-6' />
            {dict.title}
          </CardTitle>
          <CardDescription>{dict.description}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='albumId'>{dict.form.albumId.label}</Label>
              <Input
                id='albumId'
                placeholder={dict.form.albumId.placeholder}
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Label htmlFor='authToken'>{dict.form.authToken.label}</Label>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleHelp className='h-4 w-4 text-muted-foreground cursor-help' />
                    </TooltipTrigger>
                    <TooltipContent className='max-w-[300px] whitespace-pre-line text-xs'>
                      <p>{dict.form.authToken.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id='authToken'
                type='password'
                placeholder={dict.form.authToken.placeholder}
                value={authToken}
                onChange={(e) => setAuthToken(parseAuthToken(e.target.value))}
                disabled={loading}
              />
            </div>
          </div>

          <Button onClick={handleFetchInfo} className='w-full' disabled={loading}>
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                {dict.form.submit.loading}
              </>
            ) : (
              dict.form.submit.default
            )}
          </Button>

          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>{dict.form.error.title}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {albumInfo && (
            <div className='rounded-lg border bg-muted/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2'>
              {/* Content Metadata */}
              <div className='space-y-4'>
                <div className='grid gap-1'>
                  <span className='text-sm font-medium text-muted-foreground'>
                    {dict.result.title}
                  </span>
                  <p className='text-sm font-medium'>{albumInfo.album_title}</p>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='grid gap-1'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      {dict.result.author}
                    </span>
                    <p className='text-sm font-medium'>{albumInfo.author_name}</p>
                  </div>
                  <div className='grid gap-1'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      {dict.result.totalChapters}
                    </span>
                    <p className='text-sm font-medium'>{albumInfo.post_count}</p>
                  </div>
                </div>
              </div>

              <div className='border-t border-border my-4' />

              {/* Download Options */}
              {albumInfo.has_unlock_all ? (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='tocFormat'>{dict.result.toc.label}</Label>
                    <Select value={tocFormat} onValueChange={setTocFormat}>
                      <SelectTrigger id='tocFormat'>
                        <SelectValue placeholder={dict.result.toc.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='chapter_number'>{dict.result.toc.number}</SelectItem>
                        <SelectItem value='markdown'>{dict.result.toc.markdown}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleDownload}
                    className='w-full'
                    variant='default'
                    disabled={downloading}
                    title={`${albumInfo.album_title}-${albumInfo.author_name}.txt`}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin shrink-0' />
                        <span className='text-sm'>
                          {downloadStage === 'retrieving' ? (
                            <>
                              {dict.result.retrievingChapters || 'Retrieving chapters'}{' '}
                              {downloadProgress} / {albumInfo.post_count}
                            </>
                          ) : (
                            dict.result.downloadingFile || 'Downloading...'
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className='mr-2 h-4 w-4 shrink-0' />
                        <div className='flex-1 min-w-0 overflow-hidden'>
                          <AutoScrollText className='text-center'>
                            {`${albumInfo.album_title}-${albumInfo.author_name}.txt`}
                          </AutoScrollText>
                        </div>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className='w-full rounded-lg bg-yellow-50 dark:bg-yellow-950/30 p-4 text-yellow-900 dark:text-yellow-200 text-sm border border-yellow-100 dark:border-yellow-900 flex items-center justify-center gap-2'>
                  <AlertCircle className='h-4 w-4' />
                  <span className='font-medium'>{dict.result.notAvailable}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
