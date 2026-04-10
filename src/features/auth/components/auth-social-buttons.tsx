"use client";

export function AuthSocialButtons() {
  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#2d333b]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[#16181d] px-2 text-[#9ca3af]">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#2d333b] px-4 py-2.5 text-sm font-medium text-[#d1d5db] transition hover:border-slate-500"
          title="Google login will be added in a future phase"
        >
          <span className="text-sm font-semibold">G</span>
          <span>Google</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#2d333b] px-4 py-2.5 text-sm font-medium text-[#d1d5db] transition hover:border-slate-500"
          title="GitHub login will be added in a future phase"
        >
          <span className="text-sm font-semibold">◔</span>
          <span>GitHub</span>
        </button>
      </div>
    </div>
  );
}
