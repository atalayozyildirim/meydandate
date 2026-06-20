-- Gemini Edge Function handles starter/AI bot replies now.
-- Keep the old function for rollback, but disable the automatic DB trigger
-- so users do not receive both canned and Gemini-generated responses.
drop trigger if exists send_starter_guide_reply_after_message_insert on public.messages;
