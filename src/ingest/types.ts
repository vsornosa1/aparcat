export type IngestStatus = 'success' | 'partial' | 'failed';

export interface IngestResult {
  source: string;
  status: IngestStatus;
  records: number;
  details?: Record<string, number>;
  errors?: string[];
}
