/**
 * Job data interface for tracker registration queue jobs
 */
export interface TrackerRegistrationJobData {
  registrationId: string;
  userId: string;
  guildId: string;
  url: string;
  submittedAt: Date;
  jobId?: string;
}

/**
 * Job result interface for tracker registration queue jobs
 */
export interface TrackerRegistrationJobResult {
  success: boolean;
  registrationId: string;
  message?: string;
  error?: string;
}






