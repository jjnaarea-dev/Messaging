export interface Contact {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  contact_id: string;
}

export interface Message {
  id: string;
  body: string;
  created_at: string;
  message_recipients: MessageRecipient[];
}

export interface MessageRecipient {
  id: string;
  name: string;
  phone: string;
  status: "pending" | "sent" | "failed";
  error: string | null;
}
