export type AdminDashboardUserRowDto = {
  id: string;
  email: string;
  name: string | null;
  accountStatus: string;
  primaryRole: string;
  isAdmin: boolean;
  createdAt: number;
  planKey: string;
  generationCount: number;
  lastGenerationAt: number | null;
};

export type AdminDashboardResponseDto = {
  filters: {
    days: number;
    generationKind: string;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalAdmins: number;
    generationCount: number;
    tokenCount: number;
  };
  generationByKind: Record<string, number>;
  tokensByKind: Record<string, number>;
  recentUsers: AdminDashboardUserRowDto[];
};

export type AdminUpdateUserStatusInputDto = {
  accountStatus: "active" | "suspended";
};

export type AdminUpdateUserPlanInputDto = {
  planKey: "basic" | "pro" | "enterprise";
};

export type AdminErrorDto = {
  error: string;
  details?: Record<string, string[] | undefined>;
};
