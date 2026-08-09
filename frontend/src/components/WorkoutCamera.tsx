import { useEffect, useRef, useState, forwardRef } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

export interface WorkoutCameraHandle {
  // Not needed if we push frames directly, but keeping for compatibility if required
}

interface Props {
  onFrame?: (landmarks: unknown[]) => void;
  frameInterval?: number; // Target interval in ms
  active?: boolean;
}

export const WorkoutCamera = forwardRef<WorkoutCameraHandle, Props>(
  ({ onFrame, frameInterval = 200, active = true }, _ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const landmarkerRef = useRef<PoseLandmarker | null>(null);
    const requestRef = useRef<number>(null);
    const lastVideoTimeRef = useRef<number>(-1);
    const lastSendTimeRef = useRef<number>(0);

    // 1. Initialize Camera
    useEffect(() => {
      let stream: MediaStream | null = null;
      if (active) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 640, height: 480 } })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              videoRef.current.play();
            }
          })
          .catch((err) => {
            setError(err.message || 'Camera access denied');
          });
      }

      return () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, [active]);

    // 2. Initialize MediaPipe
    useEffect(() => {
      let active = true;
      async function initMediaPipe() {
        try {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );
          
          const landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          
          if (active) {
            landmarkerRef.current = landmarker;
            setIsReady(true);
          }
        } catch (err) {
          console.error("MediaPipe Init Error:", err);
          if (active) setError('Failed to load AI model');
        }
      }
      initMediaPipe();
      return () => { active = false; };
    }, []);

    // 3. Process loop
    useEffect(() => {
      if (!isReady || !active || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      let drawingUtils = new DrawingUtils(ctx);

      const loop = () => {
        if (
          video.currentTime !== lastVideoTimeRef.current && 
          video.videoWidth > 0 && 
          landmarkerRef.current
        ) {
          lastVideoTimeRef.current = video.currentTime;
          
          // Match canvas size to video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // Run inference
          const results = landmarkerRef.current.detectForVideo(video, performance.now());
          
          // Draw skeleton
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Mirror canvas to match video
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          
          if (results.landmarks && results.landmarks.length > 0) {
            for (const landmark of results.landmarks) {
              drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
                color: '#00FF00', lineWidth: 4
              });
              drawingUtils.drawLandmarks(landmark, {
                color: '#FF0000', lineWidth: 2, radius: 3
              });
            }
          }
          ctx.restore();

          // Send landmarks to backend at controlled interval
          const now = performance.now();
          if (now - lastSendTimeRef.current >= frameInterval) {
            lastSendTimeRef.current = now;
            if (onFrame && results.landmarks && results.landmarks.length > 0) {
              // Convert to backend expected format
              const formatted = results.landmarks[0].map(lm => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility ?? 1.0
              }));
              onFrame(formatted);
            }
          }
        }
        
        requestRef.current = requestAnimationFrame(loop);
      };
      
      requestRef.current = requestAnimationFrame(loop);
      
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }, [isReady, active, onFrame, frameInterval]);

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
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // mirror
            opacity: isReady ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />
        
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            opacity: isReady ? 1 : 0,
          }}
        />

        {!isReady && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div className="neu-circle" style={{ width: 72, height: 72 }}>
              <Camera size={32} color="var(--accent)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="neu-spinner" />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Loading AI Vision Model...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
            <div className="neu-circle" style={{ width: 72, height: 72 }}>
              <CameraOff size={32} color="var(--danger)" />
            </div>
            <div className="neu-inset" style={{ padding: '16px 20px', display: 'flex', gap: '10px', alignItems: 'flex-start', maxWidth: '300px' }}>
              <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {isReady && (
          <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: '20px', padding: '4px 12px' }}>
            <span className="status-dot active" />
            <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>LIVE</span>
          </div>
        )}
      </div>
    );
  }
);

WorkoutCamera.displayName = 'WorkoutCamera';
