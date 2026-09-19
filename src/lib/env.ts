/**
 * Centralized, validated access to environment variables.
 * Throws a clear error at the point of use (not at import time) so that,
 * e.g., an admin dashboard build doesn't fail just because WhatsApp
 * credentials aren't configured yet.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example for setup instructions.`
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  supabase: {
    get url() {
      return required("NEXT_PUBLIC_SUPABASE_URL");
    },
    get anonKey() {
      return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    },
    get serviceRoleKey() {
      return required("SUPABASE_SERVICE_ROLE_KEY");
    },
  },
  whatsapp: {
    get accessToken() {
      return required("WHATSAPP_ACCESS_TOKEN");
    },
    get phoneNumberId() {
      return required("WHATSAPP_PHONE_NUMBER_ID");
    },
    get businessAccountId() {
      return required("WHATSAPP_BUSINESS_ACCOUNT_ID");
    },
    get verifyToken() {
      return required("WHATSAPP_VERIFY_TOKEN");
    },
    get appSecret() {
      return optional("WHATSAPP_APP_SECRET");
    },
  },
  ai: {
    get apiKey() {
      return required("AI_API_KEY");
    },
    get provider() {
      return optional("AI_PROVIDER") || "anthropic";
    },
    get model() {
      return optional("AI_MODEL") || "claude-sonnet-5";
    },
  },
  app: {
    get url() {
      return optional("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
    },
  },
  isConfigured: {
    supabase: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    whatsapp: () =>
      Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN &&
          process.env.WHATSAPP_PHONE_NUMBER_ID &&
          process.env.WHATSAPP_VERIFY_TOKEN
      ),
    ai: () => Boolean(process.env.AI_API_KEY),
  },
};
