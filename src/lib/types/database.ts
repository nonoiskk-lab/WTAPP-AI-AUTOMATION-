/**
 * Hand-written mirror of supabase/migrations/*.sql.
 *
 * Once a live Supabase project exists, replace this file with generated
 * types: `npm run db:types` (see package.json). Keep it in sync manually
 * until then.
 */

export type LeadStage =
  | "new"
  | "qualifying"
  | "qualified"
  | "hot"
  | "proposal"
  | "negotiation"
  | "converted"
  | "lost";

export type MessageDirection = "inbound" | "outbound";
export type SenderType = "customer" | "ai" | "agent" | "system";
export type AiConfidence = "high" | "medium" | "low";
export type HandoffStatus = "open" | "in_progress" | "resolved" | "cancelled";
export type FollowupStatus = "scheduled" | "sent" | "cancelled" | "skipped_opt_out";
export type MeetingStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";
export type AdminRole = "owner" | "admin" | "sales" | "support" | "viewer";

interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

// Relationships must be declared (even if empty) for @supabase/postgrest-js
// to type-check embedded selects like `.select("*, customers(*)")` — without
// it, the whole row type collapses to `never` rather than just the embed.
interface Table<Row, Insert, Relationships extends Relationship[] = [], Update = Partial<Insert>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
}

export interface Database {
  public: {
    Tables: {
      admins: Table<
        {
          id: string;
          full_name: string;
          email: string;
          role: AdminRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        { id: string; full_name: string; email: string; role?: AdminRole; is_active?: boolean }
      >;
      customers: Table<
        {
          id: string;
          wa_id: string;
          display_name: string | null;
          language_preference: string | null;
          marketing_opt_out: boolean;
          opted_out_at: string | null;
          first_seen_at: string;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        },
        { wa_id: string; display_name?: string | null; language_preference?: string | null } & Record<
          string,
          unknown
        >
      >;
      customer_profiles: Table<
        {
          id: string;
          customer_id: string;
          business_name: string | null;
          business_category: string | null;
          current_process: string | null;
          problem_statement: string | null;
          desired_solution: string | null;
          required_features: string[] | null;
          user_count: number | null;
          monthly_volume_estimate: string | null;
          existing_software: string | null;
          integration_requirements: string | null;
          budget_range: string | null;
          timeline: string | null;
          location: string | null;
          is_decision_maker: boolean | null;
          preferred_contact_method: string | null;
          notes: string | null;
          updated_at: string;
        },
        { customer_id: string } & Record<string, unknown>
      >;
      conversations: Table<
        {
          id: string;
          customer_id: string;
          channel: string;
          current_intent: string | null;
          ai_confidence: AiConfidence | null;
          is_active: boolean;
          assigned_admin_id: string | null;
          last_message_at: string;
          last_message_preview: string | null;
          summary: string | null;
          created_at: string;
          updated_at: string;
        },
        { customer_id: string; channel?: string } & Record<string, unknown>,
        [
          {
            foreignKeyName: "conversations_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ]
      >;
      messages: Table<
        {
          id: string;
          conversation_id: string;
          customer_id: string;
          wa_message_id: string | null;
          direction: MessageDirection;
          sender_type: SenderType;
          sender_admin_id: string | null;
          content_type: string;
          body: string | null;
          media_url: string | null;
          interactive_payload: Record<string, unknown> | null;
          intent: string | null;
          ai_confidence: AiConfidence | null;
          status: string;
          error_detail: string | null;
          created_at: string;
        },
        {
          conversation_id: string;
          customer_id: string;
          wa_message_id?: string | null;
          direction: MessageDirection;
          sender_type: SenderType;
          content_type?: string;
          body?: string | null;
          intent?: string | null;
          ai_confidence?: AiConfidence | null;
          status?: string;
        } & Record<string, unknown>
      >;
      services: Table<
        {
          id: string;
          category: string;
          name: string;
          slug: string;
          short_description: string | null;
          full_description: string | null;
          starting_price: number | null;
          price_is_fixed: boolean;
          price_notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        { category: string; name: string; slug: string } & Record<string, unknown>
      >;
      service_features: Table<
        { id: string; service_id: string; feature: string; sort_order: number },
        { service_id: string; feature: string; sort_order?: number }
      >;
      faqs: Table<
        {
          id: string;
          category: string | null;
          question: string;
          answer: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        { question: string; answer: string; category?: string | null }
      >;
      knowledge_documents: Table<
        {
          id: string;
          title: string;
          category: string;
          source_type: string;
          storage_path: string | null;
          raw_text: string | null;
          status: string;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          title: string;
          category: string;
          source_type?: string;
          storage_path?: string | null;
          raw_text?: string | null;
          status?: string;
          uploaded_by?: string | null;
        }
      >;
      knowledge_chunks: Table<
        {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          embedding: number[] | null;
          created_at: string;
        },
        { document_id: string; chunk_index: number; content: string; embedding?: number[] | null }
      >;
      leads: Table<
        {
          id: string;
          customer_id: string;
          conversation_id: string | null;
          stage: LeadStage;
          score: number;
          service_interest: string[] | null;
          requirement_summary: string | null;
          budget_range: string | null;
          timeline: string | null;
          urgency: string | null;
          decision_maker: boolean | null;
          assigned_admin_id: string | null;
          next_action: string | null;
          next_action_due: string | null;
          last_contacted_at: string | null;
          followup_date: string | null;
          is_lost: boolean;
          lost_reason: string | null;
          created_at: string;
          updated_at: string;
        },
        { customer_id: string; conversation_id?: string | null } & Record<string, unknown>,
        [
          {
            foreignKeyName: "leads_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ]
      >;
      lead_events: Table<
        {
          id: string;
          lead_id: string;
          event_type: string;
          score_delta: number;
          metadata: Record<string, unknown> | null;
          created_at: string;
        },
        { lead_id: string; event_type: string; score_delta: number; metadata?: Record<string, unknown> }
      >;
      quotes: Table<
        {
          id: string;
          lead_id: string;
          services: string[] | null;
          scope_summary: string | null;
          amount: number | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        { lead_id: string } & Record<string, unknown>
      >;
      meetings: Table<
        {
          id: string;
          lead_id: string | null;
          customer_id: string;
          requested_date: string | null;
          requested_time: string | null;
          confirmed_at: string | null;
          status: MeetingStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        { customer_id: string } & Record<string, unknown>
      >;
      handoffs: Table<
        {
          id: string;
          conversation_id: string;
          lead_id: string | null;
          reason: string;
          summary: Record<string, unknown>;
          status: HandoffStatus;
          assigned_admin_id: string | null;
          resolved_at: string | null;
          created_at: string;
        },
        {
          conversation_id: string;
          lead_id?: string | null;
          reason: string;
          summary: Record<string, unknown>;
          status?: HandoffStatus;
        }
      >;
      message_templates: Table<
        {
          id: string;
          name: string;
          category: string;
          language: string;
          body: string;
          whatsapp_template_name: string | null;
          is_active: boolean;
          created_at: string;
        },
        { name: string; category: string; body: string } & Record<string, unknown>
      >;
      followups: Table<
        {
          id: string;
          lead_id: string | null;
          customer_id: string;
          template_id: string | null;
          trigger_reason: string;
          scheduled_at: string;
          sent_at: string | null;
          status: FollowupStatus;
          created_at: string;
        },
        {
          lead_id?: string | null;
          customer_id: string;
          trigger_reason: string;
          scheduled_at: string;
        } & Record<string, unknown>,
        [
          {
            foreignKeyName: "followups_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ]
      >;
      opt_outs: Table<
        { id: string; customer_id: string; reason: string | null; opted_out_at: string },
        { customer_id: string; reason?: string | null }
      >;
      notifications: Table<
        {
          id: string;
          type: string;
          title: string;
          body: string | null;
          target_admin_id: string | null;
          related_lead_id: string | null;
          related_conversation_id: string | null;
          is_read: boolean;
          created_at: string;
        },
        { type: string; title: string } & Record<string, unknown>
      >;
      analytics_daily: Table<
        {
          id: string;
          day: string;
          total_conversations: number;
          new_leads: number;
          qualified_leads: number;
          hot_leads: number;
          meetings_booked: number;
          quotes_sent: number;
          conversions: number;
          ai_resolutions: number;
          human_handoffs: number;
          avg_response_seconds: number | null;
          created_at: string;
        },
        { day: string } & Record<string, unknown>
      >;
      settings: Table<
        { key: string; value: Record<string, unknown>; updated_by: string | null; updated_at: string },
        { key: string; value: Record<string, unknown>; updated_by?: string | null }
      >;
      audit_logs: Table<
        {
          id: string;
          actor_admin_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        },
        { action: string } & Record<string, unknown>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      match_knowledge_chunks: {
        Args: { query_embedding: number[]; match_count?: number; min_similarity?: number };
        Returns: { id: string; document_id: string; content: string; similarity: number }[];
      };
      recompute_lead_score: {
        Args: { p_lead_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
