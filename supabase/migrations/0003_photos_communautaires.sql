-- Plages Accessibles — galerie communautaire
--
-- Pourquoi cette table plutôt qu'un champ de plus sur `votes` : une photo n'est
-- pas un avis. On peut vouloir illustrer une plage sans la noter, en proposer
-- plusieurs, et surtout les départager — ce qu'un champ unique interdit.
--
-- L'enjeu est concret : le pipeline d'import va chercher les photos sur
-- Wikimedia Commons, qui pour beaucoup de communes ne propose que la mairie,
-- l'église ou un plan de ville. Les visiteurs sont les seuls à pouvoir corriger
-- ça, et le compteur de « j'aime » fait remonter la meilleure image sans qu'un
-- modérateur ait à trancher du goût de chacun.
--
-- À exécuter dans le SQL Editor du projet Supabase, après 0002.

create table if not exists public.photos_plage (
  id uuid primary key default gen_random_uuid(),
  plage_slug text not null,
  url text not null check (url like 'https://%'),
  auteur text check (auteur is null or char_length(auteur) <= 100),

  -- Même régime que les commentaires : rien n'est visible avant relecture.
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'publie', 'rejete')),

  -- Empreintes anonymes, mêmes sel et méthode que la table `votes`.
  proposant_hash text not null,
  ip_hash text not null,

  created_at timestamptz not null default now()
);

create index if not exists photos_plage_slug_idx
  on public.photos_plage (plage_slug) where statut = 'publie';
create index if not exists photos_plage_ip_idx on public.photos_plage (ip_hash);

-- « J'aime » d'une photo. La clé primaire composite fait tout le travail de
-- déduplication : un même appareil ne peut pas gonfler un compteur.
create table if not exists public.photos_likes (
  photo_id uuid not null references public.photos_plage (id) on delete cascade,
  votant_hash text not null,
  created_at timestamptz not null default now(),
  primary key (photo_id, votant_hash)
);

-- Photos visibles, avec leur décompte. La plus aimée sert d'image principale à
-- la plage, côté application.
create or replace view public.photos_publiees as
select
  p.id,
  p.plage_slug,
  p.url,
  p.auteur,
  p.created_at,
  count(l.votant_hash)::int as likes
from public.photos_plage p
left join public.photos_likes l on l.photo_id = p.id
where p.statut = 'publie'
group by p.id, p.plage_slug, p.url, p.auteur, p.created_at;

-- File de modération, symétrique de `avis_a_moderer`.
create or replace view public.photos_a_moderer as
select id, plage_slug, url, auteur, created_at
from public.photos_plage
where statut = 'en_attente'
order by created_at desc;

-- Tout passe par le serveur avec la service role key : aucun rôle public n'a
-- besoin d'accéder à ces tables.
alter table public.photos_plage enable row level security;
alter table public.photos_likes enable row level security;
revoke all on public.photos_plage      from anon, authenticated;
revoke all on public.photos_likes      from anon, authenticated;
revoke all on public.photos_publiees   from anon, authenticated;
revoke all on public.photos_a_moderer  from anon, authenticated;
