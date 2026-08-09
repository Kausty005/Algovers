import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

export interface WorkoutCameraHandle {
  captureFrame: () => string | null;
}

interface Props {
  onFrame?: (dataUrl: string) => void;
  frameInterval?: number; // ms between frame captures
  active?: boolean;
}

export const WorkoutCamera = forwardRef<WorkoutCameraHandle, Props>(
  ({ onFrame, frameInterval = 500, active = true }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { isReady, error, startCamera, stopCamera, captureFrame } =
      useCamera(videoRef);

    useImperativeHandle(ref, () => ({ captureFrame }), [captureFrame]);

    useEffect(() => {
      if (active) {
        startCamera();
      } else {
        stopCamera();
      }
      return () => stopCamera();
    }, [active, startCamera, stopCamera]);

    // Periodic frame capture
    useEffect(() => {
      if (!isReady || !onFrame) return;
      const id = setInterval(() => {
        const frame = captureFrame();
        if (frame) onFrame(frame);
      }, frameInterval);
      return () => clearInterval(id);
    }, [isReady, onFrame, captureFrame, frameInterval]);

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'var(--neu-bg)',
          boxShadow: 'var(--shadow-raised-lg)',
        }}
      >
        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // mirror
            opacity: isReady ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />

        {/* Camera loading state */}
        {!isReady && !error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <div className="neu-circle" style={{ width: 72, height: 72 }}>
              <Camera size={32} color="var(--accent)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="neu-spinner" />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Starting camera…
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '24px',
            }}
          >
            <div
              className="neu-circle"
              style={{ width: 72, height: 72 }}
            >
              <CameraOff size={32} color="var(--danger)" />
            </div>
            <div
              className="neu-inset"
              style={{
                padding: '16px 20px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                maxWidth: '300px',
              }}
            >
              <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Active indicator overlay */}
        {isReady && (
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              borderRadius: '20px',
              padding: '4px 12px',
            }}
          >
            <span className="status-dot active" />
            <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>LIVE</span>
          </div>
        )}
      </div>
    );
  }
);

WorkoutCamera.displayName = 'WorkoutCamera';
