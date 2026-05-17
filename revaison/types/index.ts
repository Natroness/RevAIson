export type IntervalLabel =
  | "1 hour"
  | "8 hours"
  | "1 day"
  | "1 week"
  | "1 month";

export interface Topic {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  studied_at: string;
  created_at: string;
}

export interface Review {
  id: string;
  topic_id: string;
  user_id: string;
  interval_label: IntervalLabel;
  review_time: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface ReviewWithTopic extends Review {
  topic: Pick<Topic, "id" | "title"> | null;
}

export interface ReviewScheduleItem {
  interval_label: IntervalLabel;
  review_time: Date;
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
