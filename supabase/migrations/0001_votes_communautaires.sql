-- Plages Accessibles — passage en mode communautaire
--
-- Les notes ne sont plus importées par le pipeline : elles proviennent
-- exclusivement des votes de visiteurs stockés dans cette table. Une note
-- moyenne n'est publiée (carte, fiche, cartes de résultats, JSON-LD) qu'à
-- partir du seuil défini par SEUIL_VOTES dans src/lib/votes.ts (5 votes).
--
-- À exécuter une seule fois dans le SQL Editor du projet Supabase.

create extension if not exists pgcrypto;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  plage_slug text not null,
  note smallint not null check (note between 1 and 5),

  -- Équipements du référentiel (TYPES_ACCESSIBILITE, src/lib/content-schema.ts)
  -- que le visiteur déclare avoir vus sur place / constatés absents.
  -- La valeur est validée par l'API avant insertion, d'où l'absence de FK ici.
  equipements_vus text[] not null default '{}',
  equipements_absents text[] not null default '{}',

  auteur text check (auteur is null or char_length(auteur) <= 100),
  commentaire text check (commentaire is null or char_length(commentaire) <= 2000),

  -- Le texte libre est modéré avant publication ; la note et les confirmations
  -- d'équipement, elles, comptent immédiatement (surface d'abus quasi nulle).
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'publie', 'rejete')),

  -- Empreintes anonymes : ni IP ni identifiant de session en clair (RGPD).
  -- votant_hash = sha256(VOTE_SALT:cookie) · ip_hash = sha256(VOTE_SALT:ip)
  votant_hash text not null,
  ip_hash text not null,

  created_at timestamptz not null default now()
);

-- Un votant (cookie signé) ne peut voter qu'une fois par plage : l'API traduit
-- la violation de cet index en « vous avez déjà voté pour cette plage ».
create unique index if not exists votes_plage_votant_uniq
  on public.votes (plage_slug, votant_hash);
create index if not exists votes_plage_idx on public.votes (plage_slug);
-- Sert le plafond souple par IP (familles / réseaux partagés → plusieurs votes tolérés).
create index if not exists votes_plage_ip_idx on public.votes (plage_slug, ip_hash);
create index if not exists votes_statut_idx on public.votes (statut) where statut = 'publie';

-- Agrégat par plage : seule source de la note affichée sur le site.
-- Le seuil de publication est appliqué côté application, pas ici, afin que
-- l'administrateur puisse consulter les moyennes en cours de constitution.
create or replace view public.plage_stats as
select
  plage_slug,
  count(*)::int                        as nombre_votes,
  round(avg(note)::numeric, 1)::float8 as note_moyenne
from public.votes
group by plage_slug;

-- Confirmations / infirmations par équipement, pour afficher
-- « Tiralo — confirmé par 4 visiteurs » sur la fiche plage.
create or replace view public.plage_equipements as
select
  plage_slug,
  equipement,
  count(*) filter (where vu)::int     as confirmations,
  count(*) filter (where not vu)::int as infirmations
from (
  select plage_slug, unnest(equipements_vus)     as equipement, true  as vu from public.votes
  union all
  select plage_slug, unnest(equipements_absents) as equipement, false as vu from public.votes
) t
group by plage_slug, equipement;

-- Le site n'accède à ces données que côté serveur, avec la service role key.
-- Rien n'est donc exposé aux rôles publics : RLS active + privilèges révoqués
-- (défense en profondeur — la clé anon n'est jamais envoyée au navigateur).
alter table public.votes enable row level security;
revoke all on public.votes             from anon, authenticated;
revoke all on public.plage_stats       from anon, authenticated;
revoke all on public.plage_equipements from anon, authenticated;

-- ── Reprise des 2 avis réels publiés avant le passage en mode communautaire ──
-- Ils étaient stockés dans le champ `avis` des fiches JSON, désormais supprimé.
-- `votant_hash` synthétique : ces avis sont antérieurs au cookie de votant.
insert into public.votes (plage_slug, note, auteur, commentaire, statut, votant_hash, ip_hash, created_at)
values
  ('plage-la-baule',           5, 'Mathieu', 'Parfait !!!', 'publie', 'legacy:plage-la-baule:1',           'legacy', '2026-06-10T12:00:00Z'),
  ('plage-du-prado-marseille', 4, 'Mathieu', 'Top !!',      'publie', 'legacy:plage-du-prado-marseille:1', 'legacy', '2026-06-27T12:00:00Z')
on conflict (plage_slug, votant_hash) do nothing;
