revoke execute on function public.count_recent_messages_for_user(uuid, timestamptz) from anon;
revoke execute on function public.count_recent_messages_for_user(uuid, timestamptz) from public;
grant execute on function public.count_recent_messages_for_user(uuid, timestamptz) to authenticated;
grant execute on function public.count_recent_messages_for_user(uuid, timestamptz) to service_role;