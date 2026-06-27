import type { AuthUser } from "@/server/services/auth/types";

type SettingsPanelProps = {
  user: AuthUser;
  planLabel: string;
};

function getInitials(user: AuthUser): string {
  if (user.name?.trim()) {
    return user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase())
      .join("");
  }
  return user.email.charAt(0).toUpperCase();
}

// ponytail: preference toggles are presentational only (no settings backend exists).
const PREFS = [
  { label: "Reduce motion", desc: "Pause ambient animations", on: false },
  { label: "Email notifications", desc: "Render-complete alerts", on: true },
  { label: "Save generation history", desc: "Keep prompts and outputs", on: true },
];

export function SettingsPanel({ user, planLabel }: SettingsPanelProps) {
  const initials = getInitials(user);

  return (
    <div className="mx-auto max-w-[1020px] px-9 pb-14 pt-[30px]">
      <h1 className="m-0 mb-1 text-[25px] font-semibold tracking-[-0.025em]">Settings</h1>
      <div className="mb-6 text-[13px] text-[#9A9A92]">
        Manage your account, plan, and preferences
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* profile */}
        <div className="rounded-[20px] border border-[#ECECE8] bg-white p-[22px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <h3 className="m-0 mb-[18px] text-[15px] font-semibold">Profile</h3>
          <div className="mb-[18px] flex items-center gap-[14px]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1B1B18] text-[19px] font-semibold text-white">
              {initials}
            </div>
            <div>
              <div className="text-[15px] font-semibold">{user.name || "Aethermind User"}</div>
              <div className="text-[13px] text-[#9A9A92]">{user.email}</div>
            </div>
          </div>
          <button className="w-full rounded-[10px] border border-[#E6E6E1] bg-[#F6F6F3] py-[9px] text-[13px] font-semibold text-[#3A3A36]">
            Edit profile
          </button>
        </div>

        {/* plan */}
        <div className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(150deg,#10A57C,#0B7A5E)] p-[22px] text-white shadow-[0_14px_30px_-16px_rgba(11,122,94,0.55)]">
          <div className="absolute -right-[30px] -top-[30px] h-[140px] w-[140px] rounded-full bg-white/[0.12]" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-semibold">Current plan</h3>
              <span className="rounded-[7px] bg-white/[0.22] px-[10px] py-1 text-[11px] font-semibold">Active</span>
            </div>
            <div className="mb-1 text-[26px] font-semibold tracking-[-0.02em]">{planLabel} · Unlimited</div>
            <div className="mb-[18px] text-[13px] text-white/[0.82]">
              All models · priority rendering · 10,000 credits / mo
            </div>
            <button className="rounded-[10px] bg-white px-4 py-[9px] text-[13px] font-semibold text-[#0B7A5E]">
              Manage subscription
            </button>
          </div>
        </div>

        {/* payment */}
        <div className="rounded-[20px] border border-[#ECECE8] bg-white p-[22px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <h3 className="m-0 mb-4 text-[15px] font-semibold">Payment method</h3>
          <div className="flex items-center gap-[13px] rounded-[13px] border border-[#EDEDE8] bg-[#FBFBF9] p-[14px]">
            <div className="flex h-[30px] w-[42px] items-center justify-center rounded-md bg-[linear-gradient(135deg,#3A3A40,#1B1B1E)]">
              <div className="h-[11px] w-[18px] rounded-[2px] bg-[linear-gradient(135deg,#E6B34A,#C98A2E)]" />
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold">Visa ending 4242</div>
              <div className="text-[12px] text-[#9A9A92]">Renews May 28, 2026</div>
            </div>
            <button className="rounded-md bg-[#E7F4EF] px-[11px] py-[6px] text-[12.5px] font-semibold text-[#0E9F77]">
              Update
            </button>
          </div>
        </div>

        {/* preferences */}
        <div className="rounded-[20px] border border-[#ECECE8] bg-white p-[22px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <h3 className="m-0 mb-2 text-[15px] font-semibold">Preferences</h3>
          {PREFS.map((pref) => (
            <div key={pref.label} className="flex items-center justify-between border-b border-[#F4F4F0] py-3">
              <div>
                <div className="text-[13.5px] font-medium">{pref.label}</div>
                <div className="mt-[1px] text-[12px] text-[#9A9A92]">{pref.desc}</div>
              </div>
              <div
                className="relative h-[25px] w-[42px] shrink-0 rounded-[13px]"
                style={{ background: pref.on ? "#0E9F77" : "#D6D6CF" }}
              >
                <div
                  className="absolute top-[2.5px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                  style={{ left: pref.on ? 20 : 2.5 }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* API keys */}
        <div className="col-span-2 rounded-[20px] border border-[#ECECE8] bg-white p-[22px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0 text-[15px] font-semibold">API keys</h3>
            <button className="rounded-[9px] bg-[#E7F4EF] px-[13px] py-[7px] text-[12.5px] font-semibold text-[#0E9F77]">
              + New key
            </button>
          </div>
          <div className="flex items-center gap-[14px] rounded-[13px] border border-[#EDEDE8] bg-[#FBFBF9] px-4 py-[14px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C8C84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="15" r="4" />
              <path d="m10.8 12.2 8-8 2 2-2.2 2.2 1.6 1.6-2.4 2.4-1.6-1.6" />
            </svg>
            <code className="flex-1 font-mono text-[13px] text-[#33332E]">
              æth_live_••••••••••••••••3f9a
            </code>
            <span className="text-[12px] text-[#9A9A92]">Created Apr 2</span>
            <button className="rounded-md border border-[#E6E6E1] bg-white px-[11px] py-[6px] text-[12.5px] font-semibold text-[#6E6E68]">
              Revoke
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
