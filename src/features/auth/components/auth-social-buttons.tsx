"use client";

export function AuthSocialButtons() {
  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#ECECE8]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-[#9A9A92]">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E6E6E1] bg-white px-4 py-2.5 text-sm font-medium text-[#3A3A36] transition hover:bg-[#F6F6F3]"
          title="Google login will be added in a future phase"
        >
          <span className="text-sm font-semibold">G</span>
          <span>Google</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E6E6E1] bg-white px-4 py-2.5 text-sm font-medium text-[#3A3A36] transition hover:bg-[#F6F6F3]"
          title="GitHub login will be added in a future phase"
        >
          <span className="text-sm font-semibold">◔</span>
          <span>GitHub</span>
        </button>
      </div>
    </div>
  );
}
