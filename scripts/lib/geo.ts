// Shared geo utilities for source adapters.

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function makeSlug(nom: string, commune: string): string {
  return slugify(`${nom}-${commune}`)
}

// Maps département code (first 2–3 digits of code postal) to region name.
const DEPT_TO_REGION: Record<string, string> = {
  '01': 'Auvergne-Rhône-Alpes',
  '02': 'Hauts-de-France',
  '03': 'Auvergne-Rhône-Alpes',
  '04': "Provence-Alpes-Côte d'Azur",
  '05': "Provence-Alpes-Côte d'Azur",
  '06': "Provence-Alpes-Côte d'Azur",
  '07': 'Auvergne-Rhône-Alpes',
  '08': 'Grand Est',
  '09': 'Occitanie',
  '10': 'Grand Est',
  '11': 'Occitanie',
  '12': 'Occitanie',
  '13': "Provence-Alpes-Côte d'Azur",
  '14': 'Normandie',
  '15': 'Auvergne-Rhône-Alpes',
  '16': 'Nouvelle-Aquitaine',
  '17': 'Nouvelle-Aquitaine',
  '18': 'Centre-Val de Loire',
  '19': 'Nouvelle-Aquitaine',
  '2A': 'Corse',
  '2B': 'Corse',
  '21': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne',
  '23': 'Nouvelle-Aquitaine',
  '24': 'Nouvelle-Aquitaine',
  '25': 'Bourgogne-Franche-Comté',
  '26': 'Auvergne-Rhône-Alpes',
  '27': 'Normandie',
  '28': 'Centre-Val de Loire',
  '29': 'Bretagne',
  '30': 'Occitanie',
  '31': 'Occitanie',
  '32': 'Occitanie',
  '33': 'Nouvelle-Aquitaine',
  '34': 'Occitanie',
  '35': 'Bretagne',
  '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire',
  '38': 'Auvergne-Rhône-Alpes',
  '39': 'Bourgogne-Franche-Comté',
  '40': 'Nouvelle-Aquitaine',
  '41': 'Centre-Val de Loire',
  '42': 'Auvergne-Rhône-Alpes',
  '43': 'Auvergne-Rhône-Alpes',
  '44': 'Pays de la Loire',
  '45': 'Centre-Val de Loire',
  '46': 'Occitanie',
  '47': 'Nouvelle-Aquitaine',
  '48': 'Occitanie',
  '49': 'Pays de la Loire',
  '50': 'Normandie',
  '51': 'Grand Est',
  '52': 'Grand Est',
  '53': 'Pays de la Loire',
  '54': 'Grand Est',
  '55': 'Grand Est',
  '56': 'Bretagne',
  '57': 'Grand Est',
  '58': 'Bourgogne-Franche-Comté',
  '59': 'Hauts-de-France',
  '60': 'Hauts-de-France',
  '61': 'Normandie',
  '62': 'Hauts-de-France',
  '63': 'Auvergne-Rhône-Alpes',
  '64': 'Nouvelle-Aquitaine',
  '65': 'Occitanie',
  '66': 'Occitanie',
  '67': 'Grand Est',
  '68': 'Grand Est',
  '69': 'Auvergne-Rhône-Alpes',
  '70': 'Bourgogne-Franche-Comté',
  '71': 'Bourgogne-Franche-Comté',
  '72': 'Pays de la Loire',
  '73': 'Auvergne-Rhône-Alpes',
  '74': 'Auvergne-Rhône-Alpes',
  '75': 'Île-de-France',
  '76': 'Normandie',
  '77': 'Île-de-France',
  '78': 'Île-de-France',
  '79': 'Nouvelle-Aquitaine',
  '80': 'Hauts-de-France',
  '81': 'Occitanie',
  '82': 'Occitanie',
  '83': "Provence-Alpes-Côte d'Azur",
  '84': "Provence-Alpes-Côte d'Azur",
  '85': 'Pays de la Loire',
  '86': 'Nouvelle-Aquitaine',
  '87': 'Nouvelle-Aquitaine',
  '88': 'Grand Est',
  '89': 'Bourgogne-Franche-Comté',
  '90': 'Bourgogne-Franche-Comté',
  '91': 'Île-de-France',
  '92': 'Île-de-France',
  '93': 'Île-de-France',
  '94': 'Île-de-France',
  '95': 'Île-de-France',
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'Guyane',
  '974': 'La Réunion',
  '976': 'Mayotte',
}

// Maps département code (first 2–3 digits of code postal) to department name.
const DEPT_TO_NAME: Record<string, string> = {
  '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes',
  '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
  '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
  '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze',
  '2A': 'Corse-du-Sud', '2B': 'Haute-Corse',
  '21': "Côte-d'Or", '22': "Côtes-d'Armor", '23': 'Creuse', '24': 'Dordogne',
  '25': 'Doubs', '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir',
  '29': 'Finistère', '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers',
  '33': 'Gironde', '34': 'Hérault', '35': 'Ille-et-Vilaine', '36': 'Indre',
  '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura', '40': 'Landes',
  '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique',
  '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère',
  '49': 'Maine-et-Loire', '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne',
  '53': 'Mayenne', '54': 'Meurthe-et-Moselle', '55': 'Meuse', '56': 'Morbihan',
  '57': 'Moselle', '58': 'Nièvre', '59': 'Nord', '60': 'Oise',
  '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques',
  '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin', '68': 'Haut-Rhin',
  '69': 'Rhône', '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe',
  '73': 'Savoie', '74': 'Haute-Savoie', '75': 'Paris', '76': 'Seine-Maritime',
  '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres', '80': 'Somme',
  '81': 'Tarn', '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse',
  '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges',
  '89': 'Yonne', '90': 'Territoire de Belfort', '91': 'Essonne',
  '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne',
  '95': "Val-d'Oise",
  '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane',
  '974': 'La Réunion', '976': 'Mayotte',
}

function deptCode(codePostal: string): string {
  const cp = codePostal.replace(/\s/g, '').padStart(5, '0')
  // DOM-TOM (3-digit prefix 971–976)
  const dom = cp.slice(0, 3)
  if (dom >= '971' && dom <= '976') return dom
  // Corse (20xxx → look at 4th digit)
  if (cp.startsWith('20')) return cp[2] < '5' ? '2A' : '2B'
  return cp.slice(0, 2)
}

export function regionFromCodePostal(codePostal: string): string {
  return DEPT_TO_REGION[deptCode(codePostal)] ?? 'France'
}

export function departementFromCodePostal(codePostal: string): string {
  return DEPT_TO_NAME[deptCode(codePostal)] ?? codePostal
}
