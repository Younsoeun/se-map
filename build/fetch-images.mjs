// Fetches a representative photo for each attraction from Wikipedia's REST
// summary API and writes js/images.js (window.SE_MAP_IMAGES = { id: url }).
// Thumbnail URLs are upscaled to ~640px. Re-run to refresh.
//
// Usage: node build/fetch-images.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "js", "images.js");

// Attraction id → explicit Wikipedia (en) title, where the English name
// doesn't resolve directly. Filled in as misses are found.
const WIKI = {
  // Portugal
  "torre-de-belem": "Belém Tower",
  "mosteiro-dos-jeronimos": "Jerónimos Monastery",
  "castelo-de-sao-jorge": "São Jorge Castle",
  "palacio-nacional-da-ajuda": "Ajuda National Palace",
  "se-de-lisboa": "Lisbon Cathedral",
  "palacio-da-pena": "Pena Palace",
  "castelo-dos-mouros": "Castle of the Moors",
  "castelo-de-obidos": "Castle of Óbidos",
  "rua-direita-obidos": "Óbidos, Portugal",
  "praia-do-norte": "Praia do Norte (Nazaré)",
  "sitio-da-nazare": "Nazaré, Portugal",
  "universidade-de-coimbra": "University of Coimbra",
  "se-velha-de-coimbra": "Old Cathedral of Coimbra",
  "convento-de-cristo": "Convent of Christ (Tomar)",
  "ria-de-aveiro": "Aveiro, Portugal",
  "livraria-lello": "Livraria Lello",
  "torre-dos-clerigos": "Clérigos Church",
  "ribeira": "Praça da Ribeira",
  "bom-jesus-do-monte": "Bom Jesus do Monte",
  "se-de-braga": "Braga Cathedral",
  "castelo-de-guimaraes": "Castle of Guimarães",
  "paco-dos-duques-de-braganca": "Palace of the Dukes of Braganza",
  "templo-romano-de-evora": "Roman Temple of Évora",
  "capela-dos-ossos": "Capela dos Ossos",
  "praia-dona-ana": "Praia da Dona Ana",
  // France
  "notre-dame-paris": "Notre-Dame de Paris",
  "musee-orsay": "Musée d'Orsay",
  "sacre-coeur": "Sacré-Cœur, Paris",
  "versailles": "Palace of Versailles",
  "mont-st-michel-abbey": "Mont-Saint-Michel Abbey",
  "monet-giverny": "Giverny",
  "etretat-cliffs": "Étretat",
  "chambord": "Château de Chambord",
  "chenonceau": "Château de Chenonceau",
  "petite-france": "Petite France, Strasbourg",
  "petite-venise": "Colmar",
  "fourviere": "Basilica of Notre-Dame de Fourvière",
  "vieux-lyon": "Vieux Lyon",
  "annecy-lake": "Lake Annecy",
  "palais-des-papes": "Palais des Papes",
  "pont-avignon": "Pont Saint-Bénézet",
  "arles-arena": "Arles Amphitheatre",
  "promenade-anglais": "Promenade des Anglais",
  "vieux-nice": "Nice",
  "cite-carcassonne": "Cité de Carcassonne",
  "place-bourse": "Place de la Bourse",
  // Spain
  "palacio-real-madrid": "Royal Palace of Madrid",
  "plaza-mayor-madrid": "Plaza Mayor, Madrid",
  "parque-del-retiro": "Buen Retiro Park",
  "la-rambla": "La Rambla, Barcelona",
  "catedral-sevilla": "Seville Cathedral",
  "real-alcazar-sevilla": "Alcázar of Seville",
  "plaza-espana-sevilla": "Plaza de España, Seville",
  "alhambra": "Alhambra",
  "albaicin": "Albaicín",
  "mezquita-cordoba": "Mosque–Cathedral of Córdoba",
  "patios-cordoba": "Córdoba, Spain",
  "catedral-toledo": "Toledo Cathedral",
  "casco-historico-toledo": "Toledo, Spain",
  "acueducto-segovia": "Aqueduct of Segovia",
  "alcazar-segovia": "Alcázar of Segovia",
  "ciudad-artes-ciencias": "City of Arts and Sciences",
  "lonja-seda-valencia": "Llotja de la Seda",
  "guggenheim-bilbao": "Guggenheim Museum Bilbao",
  "playa-concha": "San Sebastián",
  "catedral-santiago": "Santiago de Compostela Cathedral",
  "puente-nuevo-ronda": "Puente Nuevo",
  "plaza-mayor-salamanca": "Plaza Mayor, Salamanca",
  "casas-colgadas-cuenca": "Casas Colgadas",
  "alcazaba-malaga": "Alcazaba of Málaga",
  "basilica-pilar-zaragoza": "Basilica of Our Lady of the Pillar",
  "teatro-romano-merida": "Roman Theatre (Mérida)",
  "murallas-avila": "Walls of Ávila",
  // Greece
  "acropolis-athens": "Acropolis of Athens",
  "ancient-agora-athens": "Ancient Agora of Athens",
  "temple-olympian-zeus": "Temple of Olympian Zeus, Athens",
  "plaka-athens": "Plaka",
  "temple-poseidon-sounion": "Cape Sounion",
  "delphi-sanctuary": "Delphi",
  "meteora-monasteries": "Meteora",
  "palamidi-nafplio": "Palamidi",
  "epidaurus-theatre": "Ancient Theatre of Epidaurus",
  "mycenae-lions-gate": "Mycenae",
  "ancient-olympia": "Olympia, Greece",
  "white-tower-thessaloniki": "White Tower of Thessaloniki",
  "rotunda-thessaloniki": "Rotunda (Thessaloniki)",
  "oia-santorini": "Oia, Greece",
  "akrotiri-santorini": "Akrotiri (prehistoric city)",
  "mykonos-town": "Mykonos",
  "knossos-palace": "Knossos",
  "heraklion-museum": "Heraklion Archaeological Museum",
  "chania-old-town": "Chania",
  "balos-lagoon": "Balos",
  "rhodes-old-town": "Medieval City of Rhodes",
  "corfu-old-town": "Corfu (city)",
  "navagio-zakynthos": "Navagio Beach",
  // Italy
  "colosseo": "Colosseum",
  "foro-romano": "Roman Forum",
  "pantheon-rome": "Pantheon, Rome",
  "trevi-fountain": "Trevi Fountain",
  "vatican-museums": "Vatican Museums",
  "st-peters-basilica": "St. Peter's Basilica",
  "piazza-navona": "Piazza Navona",
  "florence-duomo": "Florence Cathedral",
  "uffizi": "Uffizi",
  "ponte-vecchio": "Ponte Vecchio",
  "accademia-david": "David (Michelangelo)",
  "san-marco-basilica": "St Mark's Basilica",
  "doges-palace": "Doge's Palace",
  "rialto-bridge": "Rialto Bridge",
  "grand-canal": "Grand Canal (Venice)",
  "naples-centro-storico": "Naples",
  "naples-archaeological-museum": "National Archaeological Museum, Naples",
  "pompeii-ruins": "Pompeii",
  "amalfi-coast": "Amalfi Coast",
  "capri-blue-grotto": "Blue Grotto (Capri)",
  "milan-duomo": "Milan Cathedral",
  "last-supper": "The Last Supper (Leonardo)",
  "pisa-leaning-tower": "Leaning Tower of Pisa",
  "piazza-del-campo": "Piazza del Campo",
  "cinque-terre-villages": "Cinque Terre",
  "verona-arena": "Verona Arena",
  "bologna-piazza-maggiore": "Piazza Maggiore",
  "mole-antonelliana": "Mole Antonelliana",
  "basilica-san-francesco": "Basilica of San Francesco d'Assisi",
  "sassi-matera": "Sassi di Matera",
  // Morocco
  "jemaa-el-fnaa": "Jemaa el-Fnaa",
  "koutoubia-mosque": "Kutubiyya Mosque",
  "bahia-palace": "Bahia Palace",
  "saadian-tombs": "Saadian Tombs",
  "majorelle-garden": "Jardin Majorelle",
  "fes-el-bali": "Fes el Bali",
  "al-qarawiyyin": "University of al-Qarawiyyin",
  "bou-inania-madrasa": "Bou Inania Madrasa",
  "chouara-tannery": "Chouara Tannery",
  "chefchaouen-medina": "Chefchaouen",
  "erg-chebbi": "Erg Chebbi",
  "todra-gorge": "Todgha Gorge",
  "ait-benhaddou-ksar": "Aït Benhaddou",
  "taourirt-kasbah": "Taourirt Kasbah",
  "essaouira-medina": "Essaouira",
  "bab-mansour-meknes": "Bab Mansour",
  "volubilis-ruins": "Volubilis",
  "hassan-tower-rabat": "Hassan Tower",
  "kasbah-udayas": "Kasbah of the Udayas",
  "hassan-ii-mosque": "Hassan II Mosque",
  "tangier-medina": "Tangier",
  // Malta
  "st-johns-co-cathedral": "St John's Co-Cathedral",
  "grandmasters-palace": "Grandmaster's Palace, Valletta",
  "upper-barrakka-gardens": "Upper Barrakka Gardens",
  "fort-st-elmo": "Fort Saint Elmo",
  "mdina-old-city": "Mdina",
  "birgu-vittoriosa": "Birgu",
  "marsaxlokk-harbour": "Marsaxlokk",
  "blue-grotto-malta": "Blue Grotto (Malta)",
  "hagar-qim-temples": "Ħaġar Qim",
  "ggantija-temples": "Ġgantija",
  "gozo-citadel": "Cittadella (Gozo)",
  "blue-lagoon-comino": "Comino",
  // Canary Islands
  "teide-national-park": "Teide National Park",
  "la-laguna-oldtown": "San Cristóbal de La Laguna",
  "los-gigantes-cliffs": "Los Gigantes",
  "maspalomas-dunes": "Maspalomas",
  "roque-nublo": "Roque Nublo",
  "vegueta-las-palmas": "Las Palmas",
  "timanfaya-national-park": "Timanfaya National Park",
  "jameos-del-agua": "Jameos del Agua",
  "corralejo-dunes": "Corralejo",
  "roque-de-los-muchachos": "Roque de los Muchachos",
  "garajonay-national-park": "Garajonay National Park",
  // Croatia
  "dubrovnik-walls": "Walls of Dubrovnik",
  "dubrovnik-stradun": "Old City of Dubrovnik",
  "mount-srd-dubrovnik": "Srđ",
  "diocletian-palace": "Diocletian's Palace",
  "marjan-split": "Marjan, Split",
  "plitvice-lakes": "Plitvice Lakes National Park",
  "krka-waterfalls": "Krka National Park",
  "sea-organ-zadar": "Sea organ",
  "st-donatus-zadar": "Church of St. Donatus",
  "st-james-sibenik": "Cathedral of St. James, Šibenik",
  "trogir-old-town": "Trogir",
  "hvar-town-fortress": "Hvar",
  "korcula-old-town": "Korčula (town)",
  "zagreb-gornji-grad": "St. Mark's Church, Zagreb",
  "rovinj-old-town": "Rovinj",
  "pula-arena": "Pula Arena",
  // Netherlands
  "amsterdam-canal-ring": "Canals of Amsterdam",
  "rijksmuseum": "Rijksmuseum",
  "van-gogh-museum": "Van Gogh Museum",
  "anne-frank-house": "Anne Frank House",
  "cube-houses": "Cube house",
  "erasmus-bridge": "Erasmus Bridge",
  "mauritshuis": "Mauritshuis",
  "binnenhof": "Binnenhof",
  "dom-tower-utrecht": "Dom Tower of Utrecht",
  "delft-old-town": "Delft",
  "kinderdijk-windmills": "Kinderdijk",
  "giethoorn-village": "Giethoorn",
  "zaanse-schans-windmills": "Zaanse Schans",
  // Germany
  "brandenburg-gate": "Brandenburg Gate",
  "reichstag": "Reichstag building",
  "east-side-gallery": "East Side Gallery",
  "museum-island": "Museum Island",
  "gendarmenmarkt": "Gendarmenmarkt",
  "sanssouci-palace": "Sanssouci",
  "marienplatz": "Marienplatz",
  "nymphenburg-palace": "Nymphenburg Palace",
  "english-garden": "English Garden (Munich)",
  "neuschwanstein-castle": "Neuschwanstein Castle",
  "cologne-cathedral": "Cologne Cathedral",
  "elbphilharmonie": "Elbphilharmonie",
  "frauenkirche-dresden": "Dresden Frauenkirche",
  "zwinger-dresden": "Zwinger",
  "heidelberg-castle": "Heidelberg Castle",
  "rothenburg-old-town": "Rothenburg ob der Tauber",
  "middle-rhine": "Rhine Gorge",
  "nuremberg-old-town": "Nuremberg Castle",
  "konigssee": "Königssee",
  "romerberg-frankfurt": "Römerberg",
  // Switzerland
  "zurich-old-town": "Zürich",
  "grossmunster": "Grossmünster",
  "chapel-bridge": "Kapellbrücke",
  "mount-pilatus": "Pilatus (mountain)",
  "lion-monument": "Lion Monument",
  "jungfraujoch": "Jungfraujoch",
  "harder-kulm": "Harder Kulm",
  "lauterbrunnen-valley": "Lauterbrunnen",
  "matterhorn": "Matterhorn",
  "gornergrat": "Gornergrat",
  "bern-old-town": "Old City of Bern",
  "jet-deau-geneva": "Jet d'Eau",
  "chillon-castle": "Château de Chillon",
  "lake-lugano": "Lake Lugano",
  // Norway
  "vigeland-park": "Vigeland Park",
  "oslo-opera-house": "Norwegian National Opera and Ballet",
  "munch-museum": "Munch Museum",
  "bryggen": "Bryggen",
  "floyen-bergen": "Fløyen",
  "flam-railway": "Flåm Line",
  "geirangerfjord": "Geirangerfjord",
  "trollstigen": "Trollstigen",
  "alesund-town": "Ålesund",
  "preikestolen": "Preikestolen",
  "nidaros-cathedral": "Nidaros Cathedral",
  "lofoten-islands": "Lofoten",
  "tromso-aurora": "Tromsø",
  "north-cape": "North Cape (Norway)",
  // Sweden
  "gamla-stan": "Gamla stan",
  "vasa-museum": "Vasa Museum",
  "stockholm-city-hall": "Stockholm City Hall",
  "skansen": "Skansen",
  "drottningholm": "Drottningholm Palace",
  "haga-gothenburg": "Haga, Gothenburg",
  "turning-torso": "Turning Torso",
  "uppsala-cathedral": "Uppsala Cathedral",
  "visby-town": "Visby",
  "dalarna-siljan": "Lake Siljan",
  "icehotel-kiruna": "Icehotel",
  "abisko-aurora": "Abisko National Park",
  // Denmark
  "nyhavn": "Nyhavn",
  "tivoli-gardens": "Tivoli Gardens",
  "little-mermaid": "The Little Mermaid (statue)",
  "kronborg-castle": "Kronborg",
  "roskilde-viking": "Roskilde Cathedral",
  "andersen-odense": "Odense",
  "aros-aarhus": "ARoS Aarhus Kunstmuseum",
  "grenen-skagen": "Grenen",
  "legoland-billund": "Legoland Billund",
  // Finland
  "helsinki-cathedral": "Helsinki Cathedral",
  "temppeliaukio": "Temppeliaukio Church",
  "suomenlinna": "Suomenlinna",
  "porvoo-oldtown": "Porvoo",
  "turku-castle": "Turku Castle",
  "tampere-moomin": "Tampere",
  "olavinlinna": "Olavinlinna",
  "santa-claus-village": "Santa Claus Village",
  "saariselka-aurora": "Saariselkä",
  // Iceland
  "hallgrimskirkja": "Hallgrímskirkja",
  "blue-lagoon-iceland": "Blue Lagoon (geothermal spa)",
  "thingvellir-park": "Þingvellir",
  "geysir-strokkur": "Strokkur",
  "gullfoss-falls": "Gullfoss",
  "reynisfjara": "Reynisfjara",
  "jokulsarlon-lagoon": "Jökulsárlón",
  "myvatn-akureyri": "Mývatn",
  // Czechia
  "charles-bridge": "Charles Bridge",
  "prague-castle": "Prague Castle",
  "old-town-square-prague": "Prague astronomical clock",
  "jewish-quarter-prague": "Josefov",
  "wenceslas-square": "Wenceslas Square",
  "cesky-krumlov-town": "Český Krumlov",
  "sedlec-ossuary": "Sedlec Ossuary",
  "karlovy-vary-spa": "Karlovy Vary",
  "villa-tugendhat": "Villa Tugendhat",
  "pilsner-urquell": "Pilsner Urquell",
  "holy-trinity-olomouc": "Holy Trinity Column, Olomouc",
  "telc-town": "Telč",
  // Austria
  "schonbrunn": "Schönbrunn Palace",
  "vienna-hofburg-ring": "Hofburg",
  "belvedere-klimt": "Belvedere, Vienna",
  "hohensalzburg": "Hohensalzburg Fortress",
  "hallstatt-village": "Hallstatt",
  "innsbruck-golden-roof": "Golden Roof",
  "graz-oldtown": "Graz",
  "wachau-melk": "Melk Abbey",
  // Hungary
  "hungarian-parliament": "Hungarian Parliament Building",
  "buda-castle": "Fisherman's Bastion",
  "szechenyi-baths": "Széchenyi thermal bath",
  "eger-castle": "Eger Castle",
  "pecs-oldtown": "Pécs",
  "szentendre-town": "Szentendre",
  "balaton-tihany": "Tihany",
  // Poland
  "krakow-rynek": "Main Square, Kraków",
  "wawel-castle": "Wawel Castle",
  "warsaw-oldtown": "Warsaw Old Town",
  "wroclaw-rynek": "Wrocław",
  "gdansk-oldtown": "Gdańsk",
  "wieliczka-mine": "Wieliczka Salt Mine",
  "zakopane-tatra": "Zakopane",
  "auschwitz": "Auschwitz concentration camp",
  // Slovenia
  "ljubljana-oldtown": "Ljubljana",
  "lake-bled": "Lake Bled",
  "lake-bohinj": "Lake Bohinj",
  "postojna-predjama": "Postojna Cave",
  "piran-town": "Piran",
  // Slovakia
  "bratislava-castle": "Bratislava Castle",
  "spis-castle": "Spiš Castle",
  "high-tatras-park": "High Tatras",
  "bojnice-castle": "Bojnice Castle",
  "banska-stiavnica-town": "Banská Štiavnica",
  "kosice-cathedral": "St. Elisabeth Cathedral, Košice",
  "vlkolinec-village": "Vlkolínec",
  // Romania
  "palace-parliament": "Palace of the Parliament",
  "brasov-oldtown": "Brașov",
  "bran-castle": "Bran Castle",
  "peles-castle": "Peleș Castle",
  "sibiu-oldtown": "Sibiu",
  "sighisoara-citadel": "Sighișoara",
  "voronet-monastery": "Voroneț Monastery",
  "transfagarasan-road": "Transfăgărășan",
  // Bulgaria
  "alexander-nevsky": "Alexander Nevsky Cathedral, Sofia",
  "plovdiv-oldtown": "Plovdiv",
  "rila-monastery": "Rila Monastery",
  "tsarevets": "Tsarevets (fortress)",
  "nessebar-oldtown": "Nesebar",
  "koprivshtitsa-town": "Koprivshtitsa",
  // Estonia
  "tallinn-oldtown": "Tallinn",
  "kadriorg-tallinn": "Kadriorg Palace",
  "tartu-town": "Tartu",
  "kuressaare-castle": "Kuressaare Castle",
  "lahemaa-park": "Lahemaa National Park",
  // Latvia
  "riga-oldtown": "Riga",
  "riga-art-nouveau": "Art Nouveau architecture in Riga",
  "jurmala-beach": "Jūrmala",
  "turaida-sigulda": "Turaida Castle",
  "rundale-palace": "Rundāle Palace",
  // Lithuania
  "vilnius-oldtown": "Vilnius Old Town",
  "trakai-castle": "Trakai Island Castle",
  "kaunas-oldtown": "Kaunas",
  "hill-of-crosses": "Hill of Crosses",
  "curonian-spit": "Curonian Spit",
  // Ireland
  "trinity-book-of-kells": "Book of Kells",
  "guinness-temple-bar": "Guinness Storehouse",
  "newgrange-tomb": "Newgrange",
  "galway-connemara": "Galway",
  "cliffs-of-moher": "Cliffs of Moher",
  "dingle-peninsula": "Dingle Peninsula",
  "ring-of-kerry": "Ring of Kerry",
  "blarney-castle": "Blarney Castle",
  "rock-of-cashel": "Rock of Cashel",
  // United Kingdom
  "westminster-bigben": "Big Ben",
  "tower-of-london": "Tower of London",
  "british-museum": "British Museum",
  "buckingham-palace": "Buckingham Palace",
  "windsor-castle": "Windsor Castle",
  "stonehenge-circle": "Stonehenge",
  "roman-baths-bath": "Roman Baths (Bath)",
  "oxford-university": "Radcliffe Camera",
  "cotswolds-villages": "Cotswolds",
  "york-minster": "York Minster",
  "lake-district-park": "Lake District",
  "edinburgh-castle": "Edinburgh Castle",
  "isle-of-skye": "Old Man of Storr",
  "snowdonia-park": "Snowdonia",
  "giants-causeway-basalt": "Giant's Causeway",
  // Belgium
  "grand-place": "Grand-Place",
  "atomium": "Atomium",
  "bruges-centre": "Bruges",
  "ghent-oldtown": "Ghent",
  "antwerp-cathedral": "Cathedral of Our Lady (Antwerp)",
  "dinant-citadel": "Dinant",
  // Luxembourg
  "luxembourg-old-quarters": "Luxembourg City",
  "bock-casemates": "Bock (Luxembourg)",
  "vianden-castle": "Vianden Castle",
  "mullerthal-trail": "Mullerthal",
};

// Explicit image URLs for attractions the pageimages API can't resolve
// (no lead image, or no English article). Sourced via Commons search.
// Special:FilePath?width= reliably generates any width for a given file.
const MANUAL_IMAGES = {
  "universidade-de-coimbra":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Joanina_Library_-_Coimbra_University.jpg?width=640",
  "musee-orsay":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Mus%C3%A9e_d%27Orsay%2C_North-West_view%2C_Paris_7e_140402.jpg?width=640",
  "praia-dona-ana":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Vista_Centro_Hist%C3%B3rico_de_Lagos_%28cropped%29.jpg?width=640",
  "rotunda-thessaloniki":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Thessaloniki_Saint_George_Rotunda_from_the_Arch_of_Galerius.jpg?width=640",
  "corralejo-dunes":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Azul%2C_Dunas_de_Corralejo%2C_Fuerteventura%2C_Espa%C3%B1a%2C_2015.JPG?width=640",
  "spis-castle":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Spissky_hrad_west.jpg?width=640",
  "kosice-cathedral":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Cathedral_of_St._Elizabeth_in_Ko%C5%A1ice.jpg?width=640",
  "transfagarasan-road":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Transfagarasan_road_with_Bilea_Lake.jpg?width=640",
};

function loadData(rel) {
  const win = { SE_MAP_DATA: {} };
  // eslint-disable-next-line no-new-func
  new Function("window", readFileSyncCache(path.join(ROOT, rel)))(win);
  return win.SE_MAP_DATA;
}

import { readFileSync } from "node:fs";
function readFileSyncCache(p) {
  return readFileSync(p, "utf8");
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const UA = "SE-Map/1.0 (personal travel map; github.com/Younsoeun)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MediaWiki pageimages API — follows redirects and returns a thumbnail.
// Node's fetch is throttled in this environment, so shell out to curl.
async function thumbFor(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
    "&prop=pageimages&piprop=thumbnail&pithumbsize=640&redirects=1&titles=" +
    encodeURIComponent(title);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { stdout } = await execFileP("curl", ["-s", "-A", UA, "--max-time", "20", url]);
      const json = JSON.parse(stdout);
      const pages = (json.query && json.query.pages) || [];
      for (const p of pages) {
        if (p.thumbnail && p.thumbnail.source) return p.thumbnail.source;
      }
      return null;
    } catch (e) {
      await sleep(500);
    }
  }
  return null;
}

// Convert a pageimages thumbnail URL to a Special:FilePath?width= URL, which
// reliably generates a 640px thumbnail (arbitrary regenerated sizes can 400).
function toFilePath(src) {
  if (!src.includes("/commons/")) return src; // non-commons file: use as-is
  const m = src.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\/\d+px-/);
  const file = m ? m[1] : src.split("/").pop();
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + file + "?width=640";
}

async function main() {
  const data = {};
  Object.assign(data, loadData("js/data-portugal.js"));
  Object.assign(data, loadData("js/data-france.js"));
  Object.assign(data, loadData("js/data-spain.js"));
  Object.assign(data, loadData("js/data-greece.js"));
  Object.assign(data, loadData("js/data-italy.js"));
  Object.assign(data, loadData("js/data-morocco.js"));
  Object.assign(data, loadData("js/data-malta.js"));
  Object.assign(data, loadData("js/data-canary.js"));
  Object.assign(data, loadData("js/data-croatia.js"));
  Object.assign(data, loadData("js/data-netherlands.js"));
  Object.assign(data, loadData("js/data-germany.js"));
  Object.assign(data, loadData("js/data-switzerland.js"));
  Object.assign(data, loadData("js/data-norway.js"));
  Object.assign(data, loadData("js/data-sweden.js"));
  Object.assign(data, loadData("js/data-denmark.js"));
  Object.assign(data, loadData("js/data-finland.js"));
  Object.assign(data, loadData("js/data-iceland.js"));
  Object.assign(data, loadData("js/data-czechia.js"));
  Object.assign(data, loadData("js/data-austria.js"));
  Object.assign(data, loadData("js/data-hungary.js"));
  Object.assign(data, loadData("js/data-poland.js"));
  Object.assign(data, loadData("js/data-slovenia.js"));
  Object.assign(data, loadData("js/data-slovakia.js"));
  Object.assign(data, loadData("js/data-romania.js"));
  Object.assign(data, loadData("js/data-bulgaria.js"));
  Object.assign(data, loadData("js/data-estonia.js"));
  Object.assign(data, loadData("js/data-latvia.js"));
  Object.assign(data, loadData("js/data-lithuania.js"));
  Object.assign(data, loadData("js/data-ireland.js"));
  Object.assign(data, loadData("js/data-uk.js"));
  Object.assign(data, loadData("js/data-belgium.js"));
  Object.assign(data, loadData("js/data-luxembourg.js"));

  const attractions = [];
  for (const country of Object.values(data)) {
    for (const a of country.attractions) attractions.push(a);
  }

  // Resume from any previously fetched images (transient network failures in
  // this sandbox mean it may take a few runs to fill everything in).
  const images = {};
  try {
    const prev = readFileSyncCache(OUT).match(/window\.SE_MAP_IMAGES = (\{[\s\S]*\});/);
    if (prev) Object.assign(images, JSON.parse(prev[1]));
  } catch (e) { /* first run */ }

  Object.assign(images, MANUAL_IMAGES); // explicit overrides always win

  const misses = [];
  for (const a of attractions) {
    if (images[a.id]) continue; // already have it
    const title = WIKI[a.id] || a.nameEn;
    const src = await thumbFor(title);
    if (src) {
      images[a.id] = toFilePath(src);
      console.log(`[ok] ${a.id} ← ${title}`);
    } else {
      misses.push(`${a.id} (tried "${title}")`);
      console.log(`[MISS] ${a.id} ← ${title}`);
    }
    await sleep(150);
  }

  const js =
    "// Generated by build/fetch-images.mjs — landmark photos via Wikipedia.\n" +
    "window.SE_MAP_IMAGES = " + JSON.stringify(images, null, 0) + ";\n";
  await writeFile(OUT, js, "utf8");

  console.log(`\nWrote ${OUT} — ${Object.keys(images).length}/${attractions.length} images.`);
  if (misses.length) console.log("Misses:\n  " + misses.join("\n  "));
}

main().catch((e) => { console.error(e); process.exit(1); });
