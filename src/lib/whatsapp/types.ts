// Minimal types for the WhatsApp Cloud API webhook payload we actually use.
// Full reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  field: string;
  value: {
    messaging_product: "whatsapp";
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: { profile: { name: string }; wa_id: string }[];
    messages?: WhatsAppInboundMessage[];
    statuses?: WhatsAppStatus[];
  };
}

export interface WhatsAppInboundMessage {
  id: string;
  from: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video" | "location" | "interactive" | "button" | string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  button?: { text: string; payload: string };
}

export interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string }[];
}

export interface OutboundTextMessage {
  to: string;
  body: string;
  previewUrl?: boolean;
}

export interface OutboundButton {
  id: string;
  title: string;
}

export interface OutboundInteractiveButtons {
  to: string;
  bodyText: string;
  buttons: OutboundButton[];
  footerText?: string;
}

export interface OutboundListRow {
  id: string;
  title: string;
  description?: string;
}

export interface OutboundInteractiveList {
  to: string;
  bodyText: string;
  buttonText: string;
  sections: { title: string; rows: OutboundListRow[] }[];
}
