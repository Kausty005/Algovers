import { useRef, useCallback, useEffect, useState } from 'react';

export interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  isReady: boolean;
}

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isReady: false,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState({ stream, error: null, isReady: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message === 'Permission denied'
            ? 'Camera permission denied. Please allow camera access and try again.'
            : err.message
          : 'Unable to access camera.';
      setState({ stream: null, error: msg, isReady: false });
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setState({ stream: null, error: null, isReady: false });
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, [videoRef]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return { ...state, startCamera, stopCamera, captureFrame };
}
