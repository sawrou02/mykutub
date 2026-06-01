create or replace function public.count_recent_messages_for_user(_user_id uuid, _since timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.messages
  where sender_id = _user_id
    and created_at > _since;
$$;

revoke all on function public.count_recent_messages_for_user(uuid, timestamptz) from public;
grant execute on function public.count_recent_messages_for_user(uuid, timestamptz) to authenticated;
grant execute on function public.count_recent_messages_for_user(uuid, timestamptz) to service_role;

drop policy if exists "Messages rate limit per user" on public.messages;

create policy "Messages rate limit per user"
on public.messages
as restrictive
for insert
to authenticated
with check (
  public.count_recent_messages_for_user(auth.uid(), now() - interval '1 minute') < 30
);