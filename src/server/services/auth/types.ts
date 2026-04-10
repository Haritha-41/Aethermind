export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  accountStatus: string;
  primaryRole: string;
  isAdmin: boolean;
};

export type SessionPayload = {
  userId: string;
  email: string;
};
