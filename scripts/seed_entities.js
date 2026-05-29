'use strict';

/**
 * Generates data/entities.json from hardcoded seed data (~195 countries).
 * Run import_wikidata.js locally afterwards for full Wikidata aliases.
 *
 * Usage:  node scripts/seed_entities.js
 */

const fs   = require('fs');
const path = require('path');

const ENTITIES_PATH = path.join(__dirname, '../data/entities.json');
const LOCALES = ['en', 'es', 'fr', 'ja', 'pt'];

function toEntityId(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// [ISO2, enCountry, enCapital, ?overrideCapitalId]
const COUNTRIES = [
  // Africa
  ['DZ','Algeria','Algiers'],
  ['AO','Angola','Luanda'],
  ['BJ','Benin','Porto-Novo'],
  ['BW','Botswana','Gaborone'],
  ['BF','Burkina Faso','Ouagadougou'],
  ['BI','Burundi','Gitega'],
  ['CV','Cape Verde','Praia'],
  ['CM','Cameroon','Yaoundé'],
  ['CF','Central African Republic','Bangui'],
  ['TD','Chad',"N'Djamena"],
  ['KM','Comoros','Moroni'],
  ['CG','Republic of the Congo','Brazzaville'],
  ['CD','Democratic Republic of the Congo','Kinshasa'],
  ['DJ','Djibouti','Djibouti'],
  ['EG','Egypt','Cairo'],
  ['GQ','Equatorial Guinea','Malabo'],
  ['ER','Eritrea','Asmara'],
  ['SZ','Eswatini','Mbabane'],
  ['ET','Ethiopia','Addis Ababa'],
  ['GA','Gabon','Libreville'],
  ['GM','Gambia','Banjul'],
  ['GH','Ghana','Accra'],
  ['GN','Guinea','Conakry'],
  ['GW','Guinea-Bissau','Bissau'],
  ['CI','Ivory Coast','Yamoussoukro'],
  ['KE','Kenya','Nairobi'],
  ['LS','Lesotho','Maseru'],
  ['LR','Liberia','Monrovia'],
  ['LY','Libya','Tripoli'],
  ['MG','Madagascar','Antananarivo'],
  ['MW','Malawi','Lilongwe'],
  ['ML','Mali','Bamako'],
  ['MR','Mauritania','Nouakchott'],
  ['MU','Mauritius','Port Louis'],
  ['MA','Morocco','Rabat'],
  ['MZ','Mozambique','Maputo'],
  ['NA','Namibia','Windhoek'],
  ['NE','Niger','Niamey'],
  ['NG','Nigeria','Abuja'],
  ['RW','Rwanda','Kigali'],
  ['ST','São Tomé and Príncipe','São Tomé'],
  ['SN','Senegal','Dakar'],
  ['SC','Seychelles','Victoria'],
  ['SL','Sierra Leone','Freetown'],
  ['SO','Somalia','Mogadishu'],
  ['ZA','South Africa','Pretoria'],
  ['SS','South Sudan','Juba'],
  ['SD','Sudan','Khartoum'],
  ['TZ','Tanzania','Dodoma'],
  ['TG','Togo','Lomé'],
  ['TN','Tunisia','Tunis'],
  ['UG','Uganda','Kampala'],
  ['ZM','Zambia','Lusaka'],
  ['ZW','Zimbabwe','Harare'],
  // Asia
  ['AF','Afghanistan','Kabul'],
  ['AM','Armenia','Yerevan'],
  ['AZ','Azerbaijan','Baku'],
  ['BH','Bahrain','Manama'],
  ['BD','Bangladesh','Dhaka'],
  ['BT','Bhutan','Thimphu'],
  ['BN','Brunei','Bandar Seri Begawan'],
  ['KH','Cambodia','Phnom Penh'],
  ['CN','China','Beijing'],
  ['CY','Cyprus','Nicosia'],
  ['GE','Georgia','Tbilisi'],
  ['IN','India','New Delhi'],
  ['ID','Indonesia','Jakarta'],
  ['IR','Iran','Tehran'],
  ['IQ','Iraq','Baghdad'],
  ['IL','Israel','Jerusalem'],
  ['JP','Japan','Tokyo'],
  ['JO','Jordan','Amman'],
  ['KZ','Kazakhstan','Astana'],
  ['KW','Kuwait','Kuwait City'],
  ['KG','Kyrgyzstan','Bishkek'],
  ['LA','Laos','Vientiane'],
  ['LB','Lebanon','Beirut'],
  ['MY','Malaysia','Kuala Lumpur'],
  ['MV','Maldives','Malé'],
  ['MN','Mongolia','Ulaanbaatar'],
  ['MM','Myanmar','Naypyidaw'],
  ['NP','Nepal','Kathmandu'],
  ['KP','North Korea','Pyongyang'],
  ['OM','Oman','Muscat'],
  ['PK','Pakistan','Islamabad'],
  ['PH','Philippines','Manila'],
  ['QA','Qatar','Doha'],
  ['SA','Saudi Arabia','Riyadh'],
  ['SG','Singapore','Singapore','SINGAPORE_CITY'],
  ['KR','South Korea','Seoul'],
  ['LK','Sri Lanka','Sri Jayawardenepura Kotte'],
  ['SY','Syria','Damascus'],
  ['TJ','Tajikistan','Dushanbe'],
  ['TH','Thailand','Bangkok'],
  ['TL','Timor-Leste','Dili'],
  ['TR','Turkey','Ankara'],
  ['TM','Turkmenistan','Ashgabat'],
  ['AE','United Arab Emirates','Abu Dhabi'],
  ['UZ','Uzbekistan','Tashkent'],
  ['VN','Vietnam','Hanoi'],
  ['YE','Yemen',"Sana'a"],
  // Europe
  ['AL','Albania','Tirana'],
  ['AD','Andorra','Andorra la Vella'],
  ['AT','Austria','Vienna'],
  ['BY','Belarus','Minsk'],
  ['BE','Belgium','Brussels'],
  ['BA','Bosnia and Herzegovina','Sarajevo'],
  ['BG','Bulgaria','Sofia'],
  ['HR','Croatia','Zagreb'],
  ['CZ','Czech Republic','Prague'],
  ['DK','Denmark','Copenhagen'],
  ['EE','Estonia','Tallinn'],
  ['FI','Finland','Helsinki'],
  ['FR','France','Paris'],
  ['DE','Germany','Berlin'],
  ['GR','Greece','Athens'],
  ['HU','Hungary','Budapest'],
  ['IS','Iceland','Reykjavik'],
  ['IE','Ireland','Dublin'],
  ['IT','Italy','Rome'],
  ['LV','Latvia','Riga'],
  ['LI','Liechtenstein','Vaduz'],
  ['LT','Lithuania','Vilnius'],
  ['LU','Luxembourg','Luxembourg City'],
  ['MT','Malta','Valletta'],
  ['MD','Moldova','Chișinău'],
  ['MC','Monaco','Monaco','MONACO_CITY'],
  ['ME','Montenegro','Podgorica'],
  ['NL','Netherlands','Amsterdam'],
  ['MK','North Macedonia','Skopje'],
  ['NO','Norway','Oslo'],
  ['PL','Poland','Warsaw'],
  ['PT','Portugal','Lisbon'],
  ['RO','Romania','Bucharest'],
  ['RU','Russia','Moscow'],
  ['SM','San Marino','San Marino','SAN_MARINO_CITY'],
  ['RS','Serbia','Belgrade'],
  ['SK','Slovakia','Bratislava'],
  ['SI','Slovenia','Ljubljana'],
  ['ES','Spain','Madrid'],
  ['SE','Sweden','Stockholm'],
  ['CH','Switzerland','Bern'],
  ['UA','Ukraine','Kyiv'],
  ['GB','United Kingdom','London'],
  ['VA','Vatican City','Vatican City','VATICAN_CITY'],
  // North America
  ['AG','Antigua and Barbuda',"Saint John's"],
  ['BS','Bahamas','Nassau'],
  ['BB','Barbados','Bridgetown'],
  ['BZ','Belize','Belmopan'],
  ['CA','Canada','Ottawa'],
  ['CR','Costa Rica','San José'],
  ['CU','Cuba','Havana'],
  ['DM','Dominica','Roseau'],
  ['DO','Dominican Republic','Santo Domingo'],
  ['SV','El Salvador','San Salvador'],
  ['GD','Grenada',"Saint George's"],
  ['GT','Guatemala','Guatemala City'],
  ['HT','Haiti','Port-au-Prince'],
  ['HN','Honduras','Tegucigalpa'],
  ['JM','Jamaica','Kingston'],
  ['MX','Mexico','Mexico City'],
  ['NI','Nicaragua','Managua'],
  ['PA','Panama','Panama City'],
  ['KN','Saint Kitts and Nevis','Basseterre'],
  ['LC','Saint Lucia','Castries'],
  ['VC','Saint Vincent and the Grenadines','Kingstown'],
  ['TT','Trinidad and Tobago','Port of Spain'],
  ['US','United States','Washington D.C.'],
  // South America
  ['AR','Argentina','Buenos Aires'],
  ['BO','Bolivia','Sucre'],
  ['BR','Brazil','Brasília'],
  ['CL','Chile','Santiago'],
  ['CO','Colombia','Bogotá'],
  ['EC','Ecuador','Quito'],
  ['GY','Guyana','Georgetown'],
  ['PY','Paraguay','Asunción'],
  ['PE','Peru','Lima'],
  ['SR','Suriname','Paramaribo'],
  ['UY','Uruguay','Montevideo'],
  ['VE','Venezuela','Caracas'],
  // Oceania
  ['AU','Australia','Canberra'],
  ['FJ','Fiji','Suva'],
  ['KI','Kiribati','South Tarawa'],
  ['MH','Marshall Islands','Majuro'],
  ['FM','Micronesia','Palikir'],
  ['NR','Nauru','Yaren'],
  ['NZ','New Zealand','Wellington'],
  ['PW','Palau','Ngerulmud'],
  ['PG','Papua New Guinea','Port Moresby'],
  ['WS','Samoa','Apia'],
  ['SB','Solomon Islands','Honiara'],
  ['TO','Tonga',"Nuku'alofa"],
  ['TV','Tuvalu','Funafuti'],
  ['VU','Vanuatu','Port Vila'],
];

// Multilingual overrides. Keys not present fall back to English.
// {ISO2: {es,fr,ja,pt, capitalEs,capitalFr,capitalJa,capitalPt}}
const I18N = {
  // Africa
  'DZ':{ es:'Argelia',       fr:'Algérie',                      ja:'アルジェリア',        pt:'Argélia',
         capitalEs:'Argel',  capitalFr:'Alger',                  capitalJa:'アルジェ',     capitalPt:'Argel' },
  'CM':{ es:'Camerún',       fr:'Cameroun',                     ja:'カメルーン',           pt:'Camarões' },
  'CV':{ es:'Cabo Verde',    fr:'Cap-Vert',                     ja:'カーボベルデ',         pt:'Cabo Verde' },
  'CF':{ es:'República Centroafricana', fr:'République centrafricaine', ja:'中央アフリカ共和国', pt:'República Centro-Africana' },
  'TD':{ es:'Chad',          fr:'Tchad',                        ja:'チャド',               pt:'Chade' },
  'CD':{ es:'República Democrática del Congo', fr:'République démocratique du Congo', ja:'コンゴ民主共和国', pt:'República Democrática do Congo' },
  'CG':{ es:'República del Congo', fr:'République du Congo',   ja:'コンゴ共和国',         pt:'República do Congo' },
  'CI':{ es:'Costa de Marfil', fr:"Côte d'Ivoire",             ja:'コートジボワール',     pt:'Costa do Marfim' },
  'EG':{ es:'Egipto',        fr:'Égypte',                       ja:'エジプト',             pt:'Egito',
         capitalEs:'El Cairo', capitalFr:'Le Caire',            capitalJa:'カイロ',        capitalPt:'Cairo' },
  'ET':{ es:'Etiopía',       fr:'Éthiopie',                     ja:'エチオピア',           pt:'Etiópia',
         capitalEs:'Adís Abeba', capitalFr:'Addis-Abeba',       capitalJa:'アディスアベバ', capitalPt:'Adis Abeba' },
  'GH':{ es:'Ghana',         fr:'Ghana',                        ja:'ガーナ',               pt:'Gana' },
  'GN':{ es:'Guinea',        fr:'Guinée',                       ja:'ギニア',               pt:'Guiné' },
  'GQ':{ es:'Guinea Ecuatorial', fr:'Guinée équatoriale',       ja:'赤道ギニア',           pt:'Guiné Equatorial' },
  'KE':{ es:'Kenia',         fr:'Kenya',                        ja:'ケニア',               pt:'Quénia' },
  'LY':{ es:'Libia',         fr:'Libye',                        ja:'リビア',               pt:'Líbia',
         capitalEs:'Trípoli', capitalJa:'トリポリ',              capitalPt:'Trípoli' },
  'MG':{ es:'Madagascar',    fr:'Madagascar',                   ja:'マダガスカル',         pt:'Madagáscar' },
  'ML':{ es:'Malí',          fr:'Mali',                         ja:'マリ',                 pt:'Mali' },
  'MA':{ es:'Marruecos',     fr:'Maroc',                        ja:'モロッコ',             pt:'Marrocos' },
  'MR':{ es:'Mauritania',    fr:'Mauritanie',                   ja:'モーリタニア',         pt:'Mauritânia' },
  'MU':{ es:'Mauricio',      fr:'Maurice',                      ja:'モーリシャス',         pt:'Maurícia' },
  'MZ':{ es:'Mozambique',    fr:'Mozambique',                   ja:'モザンビーク',         pt:'Moçambique' },
  'NE':{ es:'Níger',         fr:'Niger',                        ja:'ニジェール',           pt:'Níger' },
  'NG':{ es:'Nigeria',       fr:'Nigéria',                      ja:'ナイジェリア',         pt:'Nigéria' },
  'SN':{ es:'Senegal',       fr:'Sénégal',                      ja:'セネガル',             pt:'Senegal' },
  'SO':{ es:'Somalia',       fr:'Somalie',                      ja:'ソマリア',             pt:'Somália',
         capitalJa:'モガディシュ', capitalPt:'Mogadíscio' },
  'ZA':{ es:'Sudáfrica',     fr:'Afrique du Sud',               ja:'南アフリカ',           pt:'África do Sul' },
  'SS':{ es:'Sudán del Sur', fr:'Soudan du Sud',                ja:'南スーダン',           pt:'Sudão do Sul' },
  'SD':{ es:'Sudán',         fr:'Soudan',                       ja:'スーダン',             pt:'Sudão',
         capitalEs:'Jartum',  capitalFr:'Khartoum',             capitalJa:'ハルツーム',    capitalPt:'Cartum' },
  'TZ':{ es:'Tanzania',      fr:'Tanzanie',                     ja:'タンザニア',           pt:'Tanzânia' },
  'TN':{ es:'Túnez',         fr:'Tunisie',                      ja:'チュニジア',           pt:'Tunísia',
         capitalEs:'Túnez',   capitalFr:'Tunis',                 capitalJa:'チュニス' },
  'UG':{ es:'Uganda',        fr:'Ouganda',                      ja:'ウガンダ',             pt:'Uganda' },
  // Asia
  'AF':{ es:'Afganistán',    fr:'Afghanistan',                  ja:'アフガニスタン',       pt:'Afeganistão' },
  'AM':{ es:'Armenia',       fr:'Arménie',                      ja:'アルメニア',           pt:'Arménia' },
  'AZ':{ es:'Azerbaiyán',    fr:'Azerbaïdjan',                  ja:'アゼルバイジャン',     pt:'Azerbaijão' },
  'BH':{ es:'Baréin',        fr:'Bahreïn',                      ja:'バーレーン',           pt:'Barém' },
  'BD':{ es:'Bangladés',     fr:'Bangladesh',                   ja:'バングラデシュ',       pt:'Bangladesh' },
  'KH':{ es:'Camboya',       fr:'Cambodge',                     ja:'カンボジア',           pt:'Camboja' },
  'CN':{ es:'China',         fr:'Chine',                        ja:'中国',                 pt:'China',
         capitalEs:'Pekín',   capitalFr:'Pékin',                 capitalJa:'北京',          capitalPt:'Pequim' },
  'CY':{ es:'Chipre',        fr:'Chypre',                       ja:'キプロス',             pt:'Chipre' },
  'GE':{ es:'Georgia',       fr:'Géorgie',                      ja:'ジョージア',           pt:'Geórgia' },
  'IN':{ es:'India',         fr:'Inde',                         ja:'インド',               pt:'Índia',
         capitalEs:'Nueva Delhi', capitalFr:'New Delhi',         capitalJa:'ニューデリー',  capitalPt:'Nova Deli' },
  'ID':{ es:'Indonesia',     fr:'Indonésie',                    ja:'インドネシア',         pt:'Indonésia' },
  'IR':{ es:'Irán',          fr:'Iran',                         ja:'イラン',               pt:'Irão' },
  'IQ':{ es:'Irak',          fr:'Irak',                         ja:'イラク',               pt:'Iraque' },
  'IL':{ es:'Israel',        fr:'Israël',                       ja:'イスラエル',           pt:'Israel' },
  'JP':{ es:'Japón',         fr:'Japon',                        ja:'日本',                 pt:'Japão',
         capitalEs:'Tokio',                                      capitalJa:'東京',          capitalPt:'Tóquio' },
  'JO':{ es:'Jordania',      fr:'Jordanie',                     ja:'ヨルダン',             pt:'Jordânia' },
  'KZ':{ es:'Kazajistán',    fr:'Kazakhstan',                   ja:'カザフスタン',         pt:'Cazaquistão' },
  'KP':{ es:'Corea del Norte', fr:'Corée du Nord',              ja:'北朝鮮',               pt:'Coreia do Norte',
         capitalJa:'平壌' },
  'KR':{ es:'Corea del Sur', fr:'Corée du Sud',                 ja:'韓国',                 pt:'Coreia do Sul' },
  'KW':{ es:'Kuwait',        fr:'Koweït',                       ja:'クウェート',           pt:'Kuwait' },
  'LA':{ es:'Laos',          fr:'Laos',                         ja:'ラオス',               pt:'Laos' },
  'LB':{ es:'Líbano',        fr:'Liban',                        ja:'レバノン',             pt:'Líbano' },
  'MY':{ es:'Malasia',       fr:'Malaisie',                     ja:'マレーシア',           pt:'Malásia' },
  'MN':{ es:'Mongolia',      fr:'Mongolie',                     ja:'モンゴル',             pt:'Mongólia' },
  'MM':{ es:'Birmania',      fr:'Birmanie',                     ja:'ミャンマー',           pt:'Myanmar' },
  'NP':{ es:'Nepal',         fr:'Népal',                        ja:'ネパール',             pt:'Nepal' },
  'OM':{ es:'Omán',          fr:'Oman',                         ja:'オマーン',             pt:'Omã' },
  'PK':{ es:'Pakistán',      fr:'Pakistan',                     ja:'パキスタン',           pt:'Paquistão' },
  'PH':{ es:'Filipinas',     fr:'Philippines',                  ja:'フィリピン',           pt:'Filipinas' },
  'QA':{ es:'Catar',         fr:'Qatar',                        ja:'カタール',             pt:'Catar' },
  'SA':{ es:'Arabia Saudita', fr:'Arabie saoudite',             ja:'サウジアラビア',       pt:'Arábia Saudita' },
  'SG':{ es:'Singapur',      fr:'Singapour',                    ja:'シンガポール',         pt:'Singapura' },
  'LK':{ es:'Sri Lanka',     fr:'Sri Lanka',                    ja:'スリランカ',           pt:'Sri Lanka' },
  'SY':{ es:'Siria',         fr:'Syrie',                        ja:'シリア',               pt:'Síria' },
  'TJ':{ es:'Tayikistán',    fr:'Tadjikistan',                  ja:'タジキスタン',         pt:'Tajiquistão' },
  'TH':{ es:'Tailandia',     fr:'Thaïlande',                    ja:'タイ',                 pt:'Tailândia',
         capitalJa:'バンコク', capitalPt:'Banguecoque' },
  'TL':{ es:'Timor Oriental', fr:'Timor oriental',              ja:'東ティモール',         pt:'Timor-Leste' },
  'TR':{ es:'Turquía',       fr:'Turquie',                      ja:'トルコ',               pt:'Turquia' },
  'TM':{ es:'Turkmenistán',  fr:'Turkménistan',                 ja:'トルクメニスタン',     pt:'Turquemenistão' },
  'AE':{ es:'Emiratos Árabes Unidos', fr:'Émirats arabes unis', ja:'アラブ首長国連邦',    pt:'Emirados Árabes Unidos',
         capitalEs:'Abu Dabi', capitalFr:'Abou Dabi',           capitalJa:'アブダビ',      capitalPt:'Abu Dabi' },
  'UZ':{ es:'Uzbekistán',    fr:'Ouzbékistan',                  ja:'ウズベキスタン',       pt:'Uzbequistão' },
  'VN':{ es:'Vietnam',       fr:'Viêt Nam',                     ja:'ベトナム',             pt:'Vietnã' },
  'YE':{ es:'Yemen',         fr:'Yémen',                        ja:'イエメン',             pt:'Iémen' },
  // Europe
  'AL':{ es:'Albania',       fr:'Albanie',                      ja:'アルバニア',           pt:'Albânia' },
  'AT':{ es:'Austria',       fr:'Autriche',                     ja:'オーストリア',         pt:'Áustria',
         capitalEs:'Viena',   capitalFr:'Vienne',                capitalJa:'ウィーン',      capitalPt:'Viena' },
  'BY':{ es:'Bielorrusia',   fr:'Biélorussie',                  ja:'ベラルーシ',           pt:'Bielorrússia' },
  'BE':{ es:'Bélgica',       fr:'Belgique',                     ja:'ベルギー',             pt:'Bélgica',
         capitalEs:'Bruselas', capitalFr:'Bruxelles',            capitalJa:'ブリュッセル',  capitalPt:'Bruxelas' },
  'BA':{ es:'Bosnia y Herzegovina', fr:'Bosnie-Herzégovine',    ja:'ボスニア・ヘルツェゴビナ', pt:'Bósnia e Herzegovina' },
  'BG':{ es:'Bulgaria',      fr:'Bulgarie',                     ja:'ブルガリア',           pt:'Bulgária' },
  'HR':{ es:'Croacia',       fr:'Croatie',                      ja:'クロアチア',           pt:'Croácia' },
  'CZ':{ es:'República Checa', fr:'République tchèque',         ja:'チェコ',               pt:'República Checa' },
  'DK':{ es:'Dinamarca',     fr:'Danemark',                     ja:'デンマーク',           pt:'Dinamarca',
         capitalEs:'Copenhague', capitalFr:'Copenhague',         capitalJa:'コペンハーゲン', capitalPt:'Copenhague' },
  'EE':{ es:'Estonia',       fr:'Estonie',                      ja:'エストニア',           pt:'Estónia' },
  'FI':{ es:'Finlandia',     fr:'Finlande',                     ja:'フィンランド',         pt:'Finlândia' },
  'FR':{ es:'Francia',       fr:'France',                       ja:'フランス',             pt:'França',
         capitalEs:'París',                                      capitalJa:'パリ' },
  'DE':{ es:'Alemania',      fr:'Allemagne',                    ja:'ドイツ',               pt:'Alemanha',
         capitalEs:'Berlín',                                     capitalJa:'ベルリン',      capitalPt:'Berlim' },
  'GR':{ es:'Grecia',        fr:'Grèce',                        ja:'ギリシャ',             pt:'Grécia',
         capitalEs:'Atenas',  capitalFr:'Athènes',               capitalJa:'アテネ',        capitalPt:'Atenas' },
  'HU':{ es:'Hungría',       fr:'Hongrie',                      ja:'ハンガリー',           pt:'Hungria' },
  'IS':{ es:'Islandia',      fr:'Islande',                      ja:'アイスランド',         pt:'Islândia' },
  'IE':{ es:'Irlanda',       fr:'Irlande',                      ja:'アイルランド',         pt:'Irlanda' },
  'IT':{ es:'Italia',        fr:'Italie',                       ja:'イタリア',             pt:'Itália',
         capitalEs:'Roma',    capitalFr:'Rome',                  capitalJa:'ローマ',        capitalPt:'Roma' },
  'LV':{ es:'Letonia',       fr:'Lettonie',                     ja:'ラトビア',             pt:'Letónia' },
  'LT':{ es:'Lituania',      fr:'Lituanie',                     ja:'リトアニア',           pt:'Lituânia' },
  'LU':{ es:'Luxemburgo',    fr:'Luxembourg',                   ja:'ルクセンブルク',       pt:'Luxemburgo',
         capitalEs:'Luxemburgo', capitalFr:'Luxembourg',         capitalJa:'ルクセンブルク', capitalPt:'Luxemburgo' },
  'MD':{ es:'Moldavia',      fr:'Moldavie',                     ja:'モルドバ',             pt:'Moldávia' },
  'ME':{ es:'Montenegro',    fr:'Monténégro',                   ja:'モンテネグロ',         pt:'Montenegro' },
  'MK':{ es:'Macedonia del Norte', fr:'Macédoine du Nord',      ja:'北マケドニア',         pt:'Macedônia do Norte' },
  'NL':{ es:'Países Bajos',  fr:'Pays-Bas',                     ja:'オランダ',             pt:'Países Baixos',
         capitalEs:'Ámsterdam', capitalJa:'アムステルダム',      capitalPt:'Amsterdã' },
  'NO':{ es:'Noruega',       fr:'Norvège',                      ja:'ノルウェー',           pt:'Noruega' },
  'PL':{ es:'Polonia',       fr:'Pologne',                      ja:'ポーランド',           pt:'Polónia',
         capitalEs:'Varsovia', capitalFr:'Varsovie',             capitalJa:'ワルシャワ',    capitalPt:'Varsóvia' },
  'PT':{ es:'Portugal',      fr:'Portugal',                     ja:'ポルトガル',           pt:'Portugal',
         capitalEs:'Lisboa',  capitalFr:'Lisbonne',              capitalJa:'リスボン',      capitalPt:'Lisboa' },
  'RO':{ es:'Rumanía',       fr:'Roumanie',                     ja:'ルーマニア',           pt:'Roménia',
         capitalEs:'Bucarest', capitalFr:'Bucarest',             capitalJa:'ブカレスト',    capitalPt:'Bucareste' },
  'RU':{ es:'Rusia',         fr:'Russie',                       ja:'ロシア',               pt:'Rússia',
         capitalEs:'Moscú',   capitalFr:'Moscou',                capitalJa:'モスクワ',      capitalPt:'Moscou' },
  'RS':{ es:'Serbia',        fr:'Serbie',                       ja:'セルビア',             pt:'Sérvia' },
  'SK':{ es:'Eslovaquia',    fr:'Slovaquie',                    ja:'スロバキア',           pt:'Eslováquia' },
  'SI':{ es:'Eslovenia',     fr:'Slovénie',                     ja:'スロベニア',           pt:'Eslovénia' },
  'ES':{ es:'España',        fr:'Espagne',                      ja:'スペイン',             pt:'Espanha',
         capitalEs:'Madrid',  capitalFr:'Madrid',                capitalJa:'マドリード',    capitalPt:'Madrid' },
  'SE':{ es:'Suecia',        fr:'Suède',                        ja:'スウェーデン',         pt:'Suécia',
         capitalEs:'Estocolmo', capitalFr:'Stockholm',           capitalJa:'ストックホルム', capitalPt:'Estocolmo' },
  'CH':{ es:'Suiza',         fr:'Suisse',                       ja:'スイス',               pt:'Suíça' },
  'UA':{ es:'Ucrania',       fr:'Ukraine',                      ja:'ウクライナ',           pt:'Ucrânia',
         capitalEs:'Kiev',    capitalFr:'Kiev',                  capitalJa:'キーウ',        capitalPt:'Kiev' },
  'GB':{ es:'Reino Unido',   fr:'Royaume-Uni',                  ja:'イギリス',             pt:'Reino Unido',
         capitalEs:'Londres', capitalFr:'Londres',               capitalJa:'ロンドン',      capitalPt:'Londres' },
  // Americas
  'AR':{ es:'Argentina',     fr:'Argentine',                    ja:'アルゼンチン',         pt:'Argentina',
         capitalJa:'ブエノスアイレス' },
  'BO':{ es:'Bolivia',       fr:'Bolivie',                      ja:'ボリビア',             pt:'Bolívia' },
  'BR':{ es:'Brasil',        fr:'Brésil',                       ja:'ブラジル',             pt:'Brasil',
         capitalJa:'ブラジリア', capitalPt:'Brasília' },
  'CA':{ es:'Canadá',        fr:'Canada',                       ja:'カナダ',               pt:'Canadá' },
  'CL':{ es:'Chile',         fr:'Chili',                        ja:'チリ',                 pt:'Chile' },
  'CO':{ es:'Colombia',      fr:'Colombie',                     ja:'コロンビア',           pt:'Colômbia' },
  'CR':{ es:'Costa Rica',    fr:'Costa Rica',                   ja:'コスタリカ',           pt:'Costa Rica' },
  'CU':{ es:'Cuba',          fr:'Cuba',                         ja:'キューバ',             pt:'Cuba',
         capitalEs:'La Habana', capitalFr:'La Havane',           capitalJa:'ハバナ',        capitalPt:'Havana' },
  'DO':{ es:'República Dominicana', fr:'République dominicaine', ja:'ドミニカ共和国',      pt:'República Dominicana' },
  'EC':{ es:'Ecuador',       fr:'Équateur',                     ja:'エクアドル',           pt:'Equador' },
  'SV':{ es:'El Salvador',   fr:'Salvador',                     ja:'エルサルバドル',       pt:'El Salvador' },
  'GT':{ es:'Guatemala',     fr:'Guatemala',                    ja:'グアテマラ',           pt:'Guatemala' },
  'HT':{ es:'Haití',         fr:'Haïti',                        ja:'ハイチ',               pt:'Haiti',
         capitalEs:'Puerto Príncipe', capitalFr:'Port-au-Prince', capitalJa:'ポルトープランス', capitalPt:'Porto Príncipe' },
  'HN':{ es:'Honduras',      fr:'Honduras',                     ja:'ホンジュラス',         pt:'Honduras' },
  'JM':{ es:'Jamaica',       fr:'Jamaïque',                     ja:'ジャマイカ',           pt:'Jamaica' },
  'MX':{ es:'México',        fr:'Mexique',                      ja:'メキシコ',             pt:'México',
         capitalEs:'Ciudad de México', capitalFr:'Mexico',       capitalJa:'メキシコシティ', capitalPt:'Cidade do México' },
  'NI':{ es:'Nicaragua',     fr:'Nicaragua',                    ja:'ニカラグア',           pt:'Nicarágua' },
  'PA':{ es:'Panamá',        fr:'Panama',                       ja:'パナマ',               pt:'Panamá' },
  'PE':{ es:'Perú',          fr:'Pérou',                        ja:'ペルー',               pt:'Peru' },
  'PY':{ es:'Paraguay',      fr:'Paraguay',                     ja:'パラグアイ',           pt:'Paraguai' },
  'TT':{ es:'Trinidad y Tobago', fr:'Trinité-et-Tobago',        ja:'トリニダード・トバゴ', pt:'Trinidad e Tobago' },
  'US':{ es:'Estados Unidos', fr:'États-Unis',                  ja:'アメリカ合衆国',       pt:'Estados Unidos',
         capitalEs:'Washington D.C.', capitalFr:'Washington D.C.', capitalJa:'ワシントンD.C.', capitalPt:'Washington D.C.' },
  'UY':{ es:'Uruguay',       fr:'Uruguay',                      ja:'ウルグアイ',           pt:'Uruguai' },
  'VE':{ es:'Venezuela',     fr:'Venezuela',                    ja:'ベネズエラ',           pt:'Venezuela' },
  // Oceania
  'AU':{ es:'Australia',     fr:'Australie',                    ja:'オーストラリア',       pt:'Austrália' },
  'NZ':{ es:'Nueva Zelanda', fr:'Nouvelle-Zélande',             ja:'ニュージーランド',     pt:'Nova Zelândia' },
};

// Extra aliases (added on top of the label itself)
const EXTRA_ALIASES = {
  // Countries
  'US':  { en:['USA','United States of America','America'] },
  'GB':  { en:['UK','Britain','Great Britain','England'] },
  'CZ':  { en:['Czechia'] },
  'MM':  { en:['Burma'] },
  'SZ':  { en:['Swaziland'] },
  'MK':  { en:['Macedonia'] },
  'TL':  { en:['East Timor'] },
  'CI':  { en:["Côte d'Ivoire",'Cote d\'Ivoire'] },
  'CD':  { en:['DRC','Congo-Kinshasa'] },
  'CG':  { en:['Congo-Brazzaville'] },
  'KP':  { en:['DPRK'] },
  'KR':  { en:['Korea'] },
  'RU':  { en:['Russian Federation'] },
  'VA':  { en:['Holy See'] },
  'IR':  { en:['Persia'] },
  'TR':  { en:['Türkiye'] },
  // Capitals
  'WASHINGTON_D_C':         { en:['Washington','D.C.','Washington DC','Washington, D.C.'] },
  'KYIV':                   { en:['Kiev','Kiyv'] },
  'ULAANBAATAR':            { en:['Ulan Bator','Ulaanbaatar'] },
  'NAYPYIDAW':              { en:['Nay Pyi Taw','Naypyitaw'] },
  'ASTANA':                 { en:['Nur-Sultan','Nursultan'] },
  'CHISINAU':               { en:['Chișinău','Kishinev'] },
  'SRI_JAYAWARDENEPURA_KOTTE': { en:['Colombo','Sri Jayawardenepura Kotte','Kotte'] },
  'TOKYO':                  { en:['Tokio','Tōkyō'] },
  'BEIJING':                { en:['Peking','Peiping'] },
  'MUMBAI':                 { en:['Bombay'] },
  'KOLKATA':                { en:['Calcutta'] },
  'MEXICO_CITY':            { es:['Ciudad de México','México D.F.'], en:['Mexico City','Ciudad de Mexico'] },
  'SUCRE':                  { en:['Sucre','La Paz'], es:['Sucre','La Paz'] },
};

// ── Build ────────────────────────────────────────────────────────────────────

function buildLabels(enName, i18n, capitalKey) {
  const out = {};
  for (const locale of LOCALES) {
    if (locale === 'en') { out.en = enName; continue; }
    out[locale] = (capitalKey ? i18n?.[`capital${locale[0].toUpperCase()+locale.slice(1)}`] : i18n?.[locale]) ?? enName;
  }
  return out;
}

function buildAliases(labels, extraMap) {
  const out = {};
  for (const locale of LOCALES) {
    const label = labels[locale];
    const extras = extraMap?.[locale] ?? [];
    const seen = new Set([label.toLowerCase()]);
    const list = [label];
    // also fold in English extras for cross-locale matching
    const enExtras = locale !== 'en' ? (extraMap?.en ?? []) : [];
    for (const a of [...extras, ...enExtras]) {
      const k = a.toLowerCase();
      if (!seen.has(k)) { seen.add(k); list.push(a); }
    }
    out[locale] = list;
  }
  return out;
}

const entities = {};

for (const row of COUNTRIES) {
  const [iso2, enCountry, enCapital, overrideCapId] = row;
  const i18n = I18N[iso2] ?? {};
  const capitalId = overrideCapId ?? toEntityId(enCapital);

  // Country entity
  const countryLabels  = buildLabels(enCountry, i18n, false);
  const countryAliases = buildAliases(countryLabels, EXTRA_ALIASES[iso2]);
  entities[iso2] = { type:'country', labels:countryLabels, aliases:countryAliases };

  // Capital entity (skip if same as existing to handle shared capitals like DJIBOUTI)
  if (!entities[capitalId]) {
    const capLabels  = buildLabels(enCapital, i18n, true);
    const capAliases = buildAliases(capLabels, EXTRA_ALIASES[capitalId]);
    entities[capitalId] = { type:'city', country:iso2, labels:capLabels, aliases:capAliases };
  }
}

if (fs.existsSync(ENTITIES_PATH)) {
  fs.copyFileSync(ENTITIES_PATH, ENTITIES_PATH + '.bak');
}
fs.writeFileSync(ENTITIES_PATH, JSON.stringify(entities, null, 2) + '\n');

const countries = Object.values(entities).filter(e => e.type === 'country').length;
const cities    = Object.values(entities).filter(e => e.type === 'city').length;
console.log(`Wrote ${countries} countries + ${cities} capitals → ${ENTITIES_PATH}`);
console.log('Run  node scripts/generate_questions.js  to rebuild questions.json.');
