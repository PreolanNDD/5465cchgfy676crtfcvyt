export interface TrackableItem {
  id: string;
  user_id: string;
  name: string;
  category: 'INPUT' | 'OUTPUT';
  type: 'SCALE_1_10' | 'NUMERIC' | 'BOOLEAN' | 'TEXT';
  is_active: boolean;
  created_at: string;
}

export interface LoggedEntry {
  id: string;
  user_id: string;
  trackable_item_id: string;
  entry_date: string;
  numeric_value?: number;
  text_value?: string;
  boolean_value?: boolean;
  notes?: string;
  created_at: string;
}

export interface LoggedEntryWithItem extends LoggedEntry {
  trackable_item: TrackableItem;
}

export type DataType = 'SCALE_1_10' | 'NUMERIC' | 'BOOLEAN' | 'TEXT';
export type Category = 'INPUT' | 'OUTPUT';