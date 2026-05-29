-- Multi-image par livre
--
-- Avant : books.image_url (text) = 1 seule image (la couverture).
-- publish.tsx uploadait déjà jusqu'à 6 photos mais ne persistait que
-- la première.
--
-- Après : books.image_urls (text[]) = toutes les photos d'un livre,
-- la première étant toujours la couverture. books.image_url reste
-- comme champ dénormalisé "cover" maintenu en sync par trigger,
-- pour que BookCard / previews chat / OpenGraph / etc. continuent
-- de fonctionner sans toucher au code consommateur.

alter table public.books
  add column if not exists image_urls text[] not null default '{}'::text[];

-- Backfill : convertit l'image_url existante en array[image_url]
update public.books
set image_urls = array[image_url]
where image_urls = '{}'::text[]
  and image_url is not null
  and image_url <> '';

-- Trigger : maintient image_url (cover) en sync avec image_urls[1]
create or replace function public.books_sync_cover_image()
returns trigger
language plpgsql
as $$
begin
  if new.image_urls is null or array_length(new.image_urls, 1) is null then
    new.image_url := null;
  else
    new.image_url := new.image_urls[1];
  end if;
  return new;
end;
$$;

drop trigger if exists books_sync_cover_image on public.books;
create trigger books_sync_cover_image
  before insert or update of image_urls on public.books
  for each row execute function public.books_sync_cover_image();

-- Contrainte : max 8 images par livre (limite raisonnable, évite l'abus)
alter table public.books
  drop constraint if exists books_image_urls_max;
alter table public.books
  add constraint books_image_urls_max
  check (image_urls is null or array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 8);
