"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function OAuthMockPage() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") || "google";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      // Send message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "OAUTH_SUCCESS",
            provider: provider,
            email: email || "user@saadstudio.app",
          },
          "*"
        );
      }
      // Close popup
      window.close();
    }, 1200);
  };

  // Provider Styling configurations
  const getProviderConfig = () => {
    switch (provider) {
      case "linkedin":
        return {
          bg: "bg-[#f3f6f9]",
          cardBg: "bg-white border-0",
          textColor: "text-[#000000e6]",
          btnBg: "bg-[#0a66c2] hover:bg-[#004182]",
          btnText: "text-white",
          cancelBtn: "border border-[#0a66c2] text-[#0a66c2] hover:bg-[#f3f6f9]",
          roundedClass: "rounded-full",
          logo: (
            <svg className="w-10 h-10 text-[#0a66c2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5.2v8.37H8z" />
            </svg>
          ),
          title: "Welcome Back",
          subTitle: "Don't miss your next opportunity. Sign in to stay updated on your professional world.",
        };
      case "x":
        return {
          bg: "bg-[#15202b]",
          cardBg: "bg-black border border-zinc-800",
          textColor: "text-white",
          btnBg: "bg-white hover:bg-zinc-200",
          btnText: "text-black",
          cancelBtn: "border border-zinc-700 text-zinc-300 hover:bg-zinc-900",
          roundedClass: "rounded-full",
          logo: (
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ),
          title: "Sign in to X",
          subTitle: "Enter your credentials to authorize Saad Studio.",
        };
      case "github":
        return {
          bg: "bg-[#0d1117]",
          cardBg: "bg-[#161b22] border border-[#30363d]",
          textColor: "text-white",
          btnBg: "bg-[#238636] hover:bg-[#2ea44f]",
          btnText: "text-white",
          cancelBtn: "border border-[#30363d] text-zinc-400 hover:bg-[#21262d]",
          roundedClass: "rounded-lg",
          logo: (
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          ),
          title: "Sign in to GitHub",
          subTitle: "Authorize Saad Studio to access repositories.",
        };
      case "slack":
        return {
          bg: "bg-[#f8f8f8]",
          cardBg: "bg-white border border-zinc-200",
          textColor: "text-[#1d1c1d]",
          btnBg: "bg-[#4a154b] hover:bg-[#5b1c5c]",
          btnText: "text-white",
          cancelBtn: "border border-zinc-300 text-zinc-600 hover:bg-zinc-50",
          roundedClass: "rounded-lg",
          logo: (
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.522 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 3.78a2.528 2.528 0 0 1 2.522-2.52 2.528 2.528 0 0 1 2.52 2.52v2.52h-2.52a2.528 2.528 0 0 1-2.522-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52H10.13a2.528 2.528 0 0 1-2.52-2.52V3.78a2.528 2.528 0 0 1 2.52-2.522h5.043a2.528 2.528 0 0 1 2.522 2.522v5.043zm-3.78 10.135a2.528 2.528 0 0 1-2.522 2.522 2.528 2.528 0 0 1-2.52-2.522v-2.52h2.52a2.528 2.528 0 0 1 2.522 2.52zm0-1.262a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043a2.528 2.528 0 0 1-2.52-2.52v-5.043z" fill="#E01E5A"/>
            </svg>
          ),
          title: "Sign in to Slack",
          subTitle: "Connect your team chat space.",
        };
      default:
        // Google styled as default
        return {
          bg: "bg-[#f8f9fa]",
          cardBg: "bg-white border border-zinc-200",
          textColor: "text-[#202124]",
          btnBg: "bg-[#1a73e8] hover:bg-[#1557b0]",
          btnText: "text-white",
          cancelBtn: "border border-zinc-300 text-zinc-600 hover:bg-zinc-50",
          roundedClass: "rounded-lg",
          logo: (
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          ),
          title: "Sign in with Google",
          subTitle: "to continue to Saad Studio",
        };
    }
  };

  const config = getProviderConfig();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-between p-6 font-sans ${config.bg}`}>
      
      {/* Spacer to push card center */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[400px]">
        {/* Sign-in Card */}
        <div className={`w-full rounded-lg p-8 shadow-sm ${config.textColor} ${config.cardBg}`}>
          
          {/* Logo and title */}
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="p-1 rounded bg-transparent flex items-center justify-center">
              {config.logo}
            </div>
            <h1 className="text-xl font-bold tracking-tight">{config.title}</h1>
            <p className="text-xs text-zinc-500 max-w-[280px]">{config.subTitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-left">
            <div className="flex flex-col gap-1.5 font-sans">
              <label className="text-zinc-500 font-semibold">Email or Phone</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black outline-none focus:border-zinc-500 font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5 font-sans">
              <div className="flex items-center justify-between">
                <label className="text-zinc-500 font-semibold">Password</label>
                <span className="text-[10px] text-[#0a66c2] font-semibold cursor-pointer">Show</span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black outline-none focus:border-zinc-500"
              />
            </div>

            {/* Cancel & Sign-In buttons side-by-side - matching Screenshot 4 */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.close()}
                className={`flex-1 py-2 text-xs font-bold text-center border border-zinc-300 bg-white hover:bg-zinc-50 transition cursor-pointer text-zinc-700 ${config.roundedClass}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center cursor-pointer ${config.btnBg} ${config.btnText} ${config.roundedClass}`}
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 pt-3">
              <span className="text-[11px] text-[#0a66c2] font-bold cursor-pointer hover:underline">Forgot password?</span>
              {provider === "linkedin" && (
                <div className="text-[11px] text-zinc-500">
                  New to LinkedIn? <span className="text-[#0a66c2] font-bold cursor-pointer hover:underline font-semibold">Join now</span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* LinkedIn styled footer - matching Screenshot 4 */}
      <div className="w-full max-w-[800px] border-t border-zinc-200 pt-4 pb-2 mt-auto text-center flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10.5px] text-zinc-500 font-sans">
        <div className="flex items-center gap-1 font-semibold text-zinc-600">
          {provider === "linkedin" ? (
            <>
              <span className="font-bold text-[#0a66c2]">Linked</span>
              <span className="bg-[#0a66c2] text-white px-0.5 rounded-sm text-[9.5px]">in</span>
            </>
          ) : (
            <span>Saad Studio</span>
          )}
          <span>© 2026</span>
        </div>
        <span className="hover:underline cursor-pointer">User Agreement</span>
        <span className="hover:underline cursor-pointer">Privacy Policy</span>
        <span className="hover:underline cursor-pointer">Community Guidelines</span>
        <span className="hover:underline cursor-pointer">Cookie Policy</span>
        <span className="hover:underline cursor-pointer">Copyright Policy</span>
        <span className="hover:underline cursor-pointer">Send Feedback</span>
        <span className="hover:underline cursor-pointer flex items-center gap-0.5 font-semibold text-zinc-600">
          Language ▾
        </span>
      </div>
    </div>
  );
}
