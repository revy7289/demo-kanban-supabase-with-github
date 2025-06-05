import { E_Team } from '../constants/kanban';

export type supaDB = {
  sb_id: string;
  html_url: string;
  id: number;
  number: number;
  state: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  progress: string;
  sta_dt: string;
  end_dt: string;
  assignees: string[];
  labels: string[];
};

export type kanbanItem = Partial<supaDB> & { team: E_Team };
