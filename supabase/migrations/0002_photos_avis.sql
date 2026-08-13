-- Plages Accessibles — photo jointe à un avis
--
-- 13 des 268 fiches n'ont aucune photo : ces baignades (lacs, bases de loisirs)
-- sont absentes de Wikimedia Commons, et aucune stratégie automatique ne les y
-- fera apparaître. La seule source réaliste, ce sont les visiteurs sur place.
--
-- La photo suit exactement le même régime que le commentaire : elle n'est
-- visible qu'une fois la ligne passée à `statut = 'publie'`. Une image envoyée
-- par un inconnu est au moins aussi sensible qu'un texte.
--
-- À exécuter dans le SQL Editor du projet Supabase, après 0001.

alter table public.votes
  add column if not exists photo_url text
    check (photo_url is null or photo_url like 'https://%');

-- ── Bucket de stockage ──────────────────────────────────────────────────────
-- `public = true` ne rend lisibles que les objets dont on connaît l'URL exacte,
-- laquelle contient un UUID ingérable : rien n'est énumérable, et le site sert
-- les images directement depuis le CDN Supabase sans proxy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avis-photos',
  'avis-photos',
  true,
  5242880,                                    -- 5 Mo, l'app compresse bien en dessous
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Écriture réservée à la service role key, côté serveur : ni le navigateur ni
-- l'application mobile ne parlent jamais directement à Supabase.
revoke all on storage.objects from anon, authenticated;

-- Les commentaires publiés exposent désormais leur photo.
-- (Vue de confort pour la modération : lister ce qui attend une relecture.)
create or replace view public.avis_a_moderer as
select id, plage_slug, note, auteur, commentaire, photo_url, created_at
from public.votes
where statut = 'en_attente'
  and (commentaire is not null or photo_url is not null)
order by created_at desc;

revoke all on public.avis_a_moderer from anon, authenticated;
