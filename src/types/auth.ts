export type AuthUserDto = {
  id: string;
  email: string;
  name: string | null;
  accountStatus: string;
  primaryRole: string;
  isAdmin: boolean;
};

export type AuthErrorDto = {
  error: string;
  details?: Record<string, string[] | undefined>;
};
