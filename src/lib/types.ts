import type { Role, Status, Priority } from "./constants";

export type Ticket = {
  id: string;
  org_id: string;
  subject: string;
  body: string;
  status: Status;
  priority: Priority;
  assignee_id: string | null;
  created_by: string | null;
  sla_due_at: string | null;
  created_at: string;
  rank?: number; // только из RPC search_tickets
};

export type Comment = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

export type Attachment = {
  id: string;
  ticket_id: string;
  comment_id: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type OrgMember = {
  user_id: string;
  role: Role;
  email: string | null;
  created_at: string;
};
