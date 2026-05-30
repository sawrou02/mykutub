-- Bibliothèque digitale : livres PDF en accès libre
--
-- Page publique /bibliotheque où n'importe qui (connecté ou non)
-- peut télécharger des livres au format PDF, en cherchant par titre
-- ou par auteur.
--
-- Upload réservé aux admins (évite spam et contrefaçon). Les
-- métadonnées vivent dans public.digital_books, le binaire dans le
-- bucket Storage 'digital-books'.

create table if not exists public.digital_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  language text not null default 'Arabe',
  category text,
  description text,
  file_url text not null,
  cover_url text,
  external_url text,
  file_size_bytes bigint,
  page_count integer,
  download_count integer not null default 0,
  is_published boolean not null default true,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists digital_books_title_idx on public.digital_books using gin (to_tsvector('simple', title));
create index if not exists digital_books_author_idx on public.digital_books using gin (to_tsvector('simple', author));
create index if not exists digital_books_published_idx on public.digital_books (created_at desc) where is_published;

-- updated_at trigger
create or replace function public.digital_books_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists digital_books_touch_updated_at on public.digital_books;
create trigger digital_books_touch_updated_at
  before update on public.digital_books
  for each row execute function public.digital_books_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS : lecture publique des livres publiés, écriture admin uniquement
-- ---------------------------------------------------------------------------
alter table public.digital_books enable row level security;

drop policy if exists "Anyone can read published digital books" on public.digital_books;
create policy "Anyone can read published digital books"
  on public.digital_books
  for select
  to authenticated, anon
  using (is_published);

drop policy if exists "Admins can read all digital books" on public.digital_books;
create policy "Admins can read all digital books"
  on public.digital_books
  for select
  to authenticated
  using (internal.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can insert digital books" on public.digital_books;
create policy "Admins can insert digital books"
  on public.digital_books
  for insert
  to authenticated
  with check (internal.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can update digital books" on public.digital_books;
create policy "Admins can update digital books"
  on public.digital_books
  for update
  to authenticated
  using (internal.has_role(auth.uid(), 'admin'::app_role))
  with check (internal.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can delete digital books" on public.digital_books;
create policy "Admins can delete digital books"
  on public.digital_books
  for delete
  to authenticated
  using (internal.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- RPC : recherche full-text + filtre publication
-- ---------------------------------------------------------------------------
create or replace function public.search_digital_books(
  _query text default null,
  _language text default null,
  _category text default null,
  _limit integer default 50
)
returns setof public.digital_books
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.digital_books
  where is_published
    and (_language is null or language = _language)
    and (_category is null or category = _category)
    and (
      _query is null
      or _query = ''
      or title ilike '%' || _query || '%'
      or author ilike '%' || _query || '%'
    )
  order by created_at desc
  limit _limit;
$$;

grant execute on function public.search_digital_books(text, text, text, integer) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- RPC : incrémenter le compteur de téléchargement (sans bump updated_at)
-- ---------------------------------------------------------------------------
create or replace function public.increment_digital_book_download(_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Skip the touch trigger by updating only the counter, but our trigger
  -- runs on UPDATE so we just accept the side effect (updated_at refreshed).
  update public.digital_books
  set download_count = download_count + 1
  where id = _book_id and is_published;
end;
$$;

grant execute on function public.increment_digital_book_download(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Storage : bucket 'digital-books' (public read, admin write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('digital-books', 'digital-books', true)
on conflict (id) do nothing;

drop policy if exists "Public read on digital-books" on storage.objects;
create policy "Public read on digital-books"
  on storage.objects
  for select
  to authenticated, anon
  using (bucket_id = 'digital-books');

drop policy if exists "Admin write on digital-books" on storage.objects;
create policy "Admin write on digital-books"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'digital-books'
    and internal.has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "Admin update on digital-books" on storage.objects;
create policy "Admin update on digital-books"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'digital-books'
    and internal.has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "Admin delete on digital-books" on storage.objects;
create policy "Admin delete on digital-books"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'digital-books'
    and internal.has_role(auth.uid(), 'admin'::app_role)
  );
