import { E_Team } from '../constants/kanban';

export type IssueData = {
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

  // 메타 정보 추가됨 (fetch 후 가공 시 삽입)
  project: { name: string };
  team: { name: string };
};

export type KanbanStatus = 'TODO' | 'DOING' | 'DONE' | 'CHECKED';

export type GroupedIssues = {
  [projectName: string]: {
    [teamName: string]: {
      [status in KanbanStatus]: IssueData[];
    };
  };
};

export type KanbanData = {
  TODO: IssueData[];
  DOING: IssueData[];
  DONE: IssueData[];
  CHECKED: IssueData[];
};

export type kanbanItem = Partial<IssueData> & { team: E_Team };
