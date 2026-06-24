export interface Chart {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
  missingForRx?: string[];
}
