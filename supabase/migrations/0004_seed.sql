-- Seed the services catalog directly from KRTECH.SPACE's published service
-- categories (build spec section 3). No prices are seeded — per the
-- anti-hallucination rule (spec section 15/16), pricing must be entered by
-- an admin in the Knowledge Base before the AI will ever quote a number.

insert into services (category, name, slug, short_description, price_is_fixed) values
  ('AI_AUTOMATION', 'AI Agents', 'ai-agents', 'Custom AI agents for business workflows.', false),
  ('AI_AUTOMATION', 'WhatsApp AI Automation', 'whatsapp-ai-automation', 'AI-driven WhatsApp sales and support automation.', false),
  ('AI_AUTOMATION', 'Customer Support Automation', 'customer-support-automation', 'Automate repetitive support conversations.', false),
  ('AI_AUTOMATION', 'Sales Automation', 'sales-automation', 'Automate lead follow-up and sales workflows.', false),
  ('AI_AUTOMATION', 'Lead Automation', 'lead-automation', 'Capture, score and route leads automatically.', false),
  ('AI_AUTOMATION', 'Business Process Automation', 'business-process-automation', 'Automate repetitive internal operations.', false),
  ('AI_AUTOMATION', 'AI Workflow Automation', 'ai-workflow-automation', 'Connect AI into multi-step business workflows.', false),
  ('AI_AUTOMATION', 'AI-powered Business Systems', 'ai-powered-business-systems', 'End-to-end AI-driven business systems.', false),

  ('WEBSITE', 'Business Websites', 'business-websites', 'Professional websites for small and growing businesses.', false),
  ('WEBSITE', 'Corporate Websites', 'corporate-websites', 'Websites for corporate/enterprise presence.', false),
  ('WEBSITE', 'Landing Pages', 'landing-pages', 'High-conversion landing pages for campaigns.', false),
  ('WEBSITE', 'E-commerce Websites', 'ecommerce-websites', 'Online stores with catalog, cart and checkout.', false),
  ('WEBSITE', 'Custom Web Applications', 'custom-web-applications', 'Bespoke web apps for specific business needs.', false),
  ('WEBSITE', 'SaaS Applications', 'saas-applications', 'Multi-tenant SaaS product development.', false),
  ('WEBSITE', 'CRM Applications', 'crm-applications', 'Custom CRM systems built for your process.', false),
  ('WEBSITE', 'AI-powered Websites', 'ai-powered-websites', 'Websites embedded with AI features.', false),

  ('DIGITAL_MARKETING', 'Social Media Marketing', 'social-media-marketing', 'Organic and paid social media management.', false),
  ('DIGITAL_MARKETING', 'Lead Generation', 'lead-generation', 'Campaigns designed to generate qualified leads.', false),
  ('DIGITAL_MARKETING', 'Performance Marketing', 'performance-marketing', 'ROI-driven paid marketing campaigns.', false),
  ('DIGITAL_MARKETING', 'Meta Ads', 'meta-ads', 'Facebook and Instagram advertising.', false),
  ('DIGITAL_MARKETING', 'Google Ads', 'google-ads', 'Search and display advertising on Google.', false),
  ('DIGITAL_MARKETING', 'Content Strategy', 'content-strategy', 'Content planning aligned to business goals.', false),
  ('DIGITAL_MARKETING', 'Marketing Automation', 'marketing-automation', 'Automated nurture and campaign workflows.', false),

  ('CRM_AUTOMATION', 'CRM Development', 'crm-development', 'Custom CRM build and implementation.', false),
  ('CRM_AUTOMATION', 'Lead Management', 'lead-management', 'Structured lead tracking and management.', false),
  ('CRM_AUTOMATION', 'Sales Pipeline Automation', 'sales-pipeline-automation', 'Automate stages of your sales pipeline.', false),
  ('CRM_AUTOMATION', 'Customer Follow-up Automation', 'customer-followup-automation', 'Automated, policy-respecting follow-up sequences.', false),
  ('CRM_AUTOMATION', 'WhatsApp CRM', 'whatsapp-crm', 'CRM built around WhatsApp as the primary channel.', false),
  ('CRM_AUTOMATION', 'Workflow Automation', 'workflow-automation', 'Automate multi-step business workflows.', false),
  ('CRM_AUTOMATION', 'Notifications', 'notifications', 'Automated internal/external notification systems.', false),
  ('CRM_AUTOMATION', 'Reporting Systems', 'reporting-systems', 'Automated business reporting and dashboards.', false),

  ('IT_SOLUTIONS', 'Business IT Solutions', 'business-it-solutions', 'General business technology solutions.', false),
  ('IT_SOLUTIONS', 'Custom Software', 'custom-software', 'Bespoke software built for your operations.', false),
  ('IT_SOLUTIONS', 'Cloud Solutions', 'cloud-solutions', 'Cloud infrastructure and migration.', false),
  ('IT_SOLUTIONS', 'Technology Consulting', 'technology-consulting', 'Strategic technology advisory.', false),
  ('IT_SOLUTIONS', 'Digital Transformation', 'digital-transformation', 'End-to-end digital transformation programs.', false),
  ('IT_SOLUTIONS', 'Business Process Digitization', 'business-process-digitization', 'Digitize manual/paper-based processes.', false)
on conflict (slug) do nothing;

insert into settings (key, value) values
  ('company_profile', jsonb_build_object(
    'name', 'KRTECH.SPACE',
    'tagline', 'AI Automation & Digital Technology Solutions',
    'categories', jsonb_build_array('AI_AUTOMATION','WEBSITE','DIGITAL_MARKETING','CRM_AUTOMATION','IT_SOLUTIONS')
  )),
  ('lead_scoring_weights', jsonb_build_object(
    'clear_requirement', 10,
    'business_identified', 10,
    'budget_provided', 10,
    'timeline_provided', 10,
    'decision_maker_identified', 10,
    'demo_requested', 15,
    'quotation_requested', 15,
    'implementation_discussion', 10,
    'urgent_requirement', 10
  )),
  ('ai_provider', jsonb_build_object(
    'provider', 'anthropic',
    'model', 'claude-sonnet-5',
    'temperature', 0.4
  ))
on conflict (key) do nothing;
