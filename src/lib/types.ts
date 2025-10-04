// Event type for event dialogs and cards
export type Event = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  time: string;
  location?: string | null;
  type?: string | null;
  university_name?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  imageUrl?: string;
};
