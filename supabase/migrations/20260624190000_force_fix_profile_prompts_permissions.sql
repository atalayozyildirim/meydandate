-- Force fix permission error for is_safe_profile_prompts function
-- This function is used in a check constraint on the users table,
-- so authenticated users need execute permission to update their profiles

grant execute on function public.is_safe_profile_prompts(jsonb) to authenticated;

notify pgrst, 'reload schema';
