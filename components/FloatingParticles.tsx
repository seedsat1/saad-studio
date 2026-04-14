"use client";

const PARTICLES = Array.from({ length: 20 }, (_, i) => i + 1);

export function FloatingParticles() {
  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes saad-float {
            0%   { transform: translateY(100vh) translateX(0px);   opacity: 0; }
            8%   { opacity: 0.7; }
            92%  { opacity: 0.4; }
            100% { transform: translateY(-120px) translateX(var(--drift)); opacity: 0; }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .saad-particle { animation: none !important; opacity: 0 !important; }
        }

        .saad-particle {
          position: absolute;
          border-radius: 50%;
          background: #06b6d4;
          animation: saad-float linear infinite;
        }
        .saad-particle:nth-child(1)  { width:2px;height:2px;left:5%;  --drift:12px;  animation-duration:28s;animation-delay:0s;   opacity:0.08; }
        .saad-particle:nth-child(2)  { width:3px;height:3px;left:12%; --drift:-8px;  animation-duration:35s;animation-delay:3s;   opacity:0.06; }
        .saad-particle:nth-child(3)  { width:2px;height:2px;left:20%; --drift:20px;  animation-duration:22s;animation-delay:7s;   opacity:0.10; }
        .saad-particle:nth-child(4)  { width:4px;height:4px;left:28%; --drift:-15px; animation-duration:40s;animation-delay:1s;   opacity:0.05; }
        .saad-particle:nth-child(5)  { width:2px;height:2px;left:35%; --drift:8px;   animation-duration:31s;animation-delay:12s;  opacity:0.08; }
        .saad-particle:nth-child(6)  { width:3px;height:3px;left:42%; --drift:-20px; animation-duration:26s;animation-delay:5s;   opacity:0.07; }
        .saad-particle:nth-child(7)  { width:2px;height:2px;left:50%; --drift:14px;  animation-duration:38s;animation-delay:9s;   opacity:0.09; }
        .saad-particle:nth-child(8)  { width:4px;height:4px;left:57%; --drift:-10px; animation-duration:24s;animation-delay:15s;  opacity:0.05; }
        .saad-particle:nth-child(9)  { width:2px;height:2px;left:63%; --drift:18px;  animation-duration:33s;animation-delay:2s;   opacity:0.08; }
        .saad-particle:nth-child(10) { width:3px;height:3px;left:70%; --drift:-12px; animation-duration:29s;animation-delay:8s;   opacity:0.06; }
        .saad-particle:nth-child(11) { width:2px;height:2px;left:75%; --drift:9px;   animation-duration:36s;animation-delay:11s;  opacity:0.10; }
        .saad-particle:nth-child(12) { width:4px;height:4px;left:80%; --drift:-18px; animation-duration:21s;animation-delay:4s;   opacity:0.05; }
        .saad-particle:nth-child(13) { width:2px;height:2px;left:85%; --drift:22px;  animation-duration:39s;animation-delay:14s;  opacity:0.07; }
        .saad-particle:nth-child(14) { width:3px;height:3px;left:90%; --drift:-7px;  animation-duration:27s;animation-delay:6s;   opacity:0.09; }
        .saad-particle:nth-child(15) { width:2px;height:2px;left:8%;  --drift:16px;  animation-duration:32s;animation-delay:18s;  opacity:0.06; }
        .saad-particle:nth-child(16) { width:3px;height:3px;left:22%; --drift:-22px; animation-duration:23s;animation-delay:10s;  opacity:0.08; }
        .saad-particle:nth-child(17) { width:2px;height:2px;left:45%; --drift:11px;  animation-duration:37s;animation-delay:16s;  opacity:0.07; }
        .saad-particle:nth-child(18) { width:4px;height:4px;left:60%; --drift:-16px; animation-duration:25s;animation-delay:20s;  opacity:0.05; }
        .saad-particle:nth-child(19) { width:2px;height:2px;left:72%; --drift:19px;  animation-duration:34s;animation-delay:13s;  opacity:0.09; }
        .saad-particle:nth-child(20) { width:3px;height:3px;left:95%; --drift:-9px;  animation-duration:30s;animation-delay:17s;  opacity:0.06; }
      `}</style>
      <div
        aria-hidden="true"
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 0 }}
      >
        {PARTICLES.map((i) => (
          <div key={i} className="saad-particle" />
        ))}
      </div>
    </>
  );
}
