/**
 * Keyword lexicons used by the rule-based classifier. These are transparent and editable:
 * sector keywords are also stored in the `sectors` table so new sectors can be added without code.
 * Matching runs on normalized text (Arabic letter variants unified, lowercase, no diacritics).
 */
export type Keywords = { ar: string[]; en: string[]; fr: string[] };
export type SectorDef = { key: string; name_ar: string; name_en: string; keywords: Keywords; sort_order: number };

export const SECTORS: SectorDef[] = [
  { key: "banking", name_ar: "المصارف والخدمات المالية", name_en: "Banking & financial services", sort_order: 1,
    keywords: { ar: ["مصرف", "مصارف", "بنك", "بنوك", "ودائع", "المودعين", "مصرف لبنان", "اعاده هيكله المصارف", "سيوله", "قروض", "تمويل", "تامين"],
      en: ["bank", "banks", "banking", "deposit", "depositors", "central bank", "liquidity", "lending", "loan", "insurance", "fintech", "bank restructuring"],
      fr: ["banque", "banques", "bancaire", "deposants", "depots", "liquidite", "credit", "assurance"] } },
  { key: "real_estate", name_ar: "العقارات والبناء", name_en: "Real estate & construction", sort_order: 2,
    keywords: { ar: ["عقار", "عقارات", "عقاري", "شقق", "ايجار", "ايجارات", "بناء", "مقاولات", "اسمنت", "رخص البناء", "اعاده الاعمار"],
      en: ["real estate", "property", "properties", "apartment", "rent", "rental", "construction", "cement", "building permits", "reconstruction", "housing"],
      fr: ["immobilier", "appartement", "loyer", "construction", "ciment", "reconstruction", "logement"] } },
  { key: "tourism", name_ar: "السياحة والضيافة", name_en: "Tourism & hospitality", sort_order: 3,
    keywords: { ar: ["سياحه", "سياحي", "سياح", "فنادق", "فندق", "مطاعم", "المطار", "حجوزات", "موسم الاصطياف", "المغتربين"],
      en: ["tourism", "tourist", "tourists", "hotel", "hotels", "restaurant", "hospitality", "airport", "bookings", "arrivals", "expats"],
      fr: ["tourisme", "touristes", "hotel", "hotels", "restaurant", "aeroport", "reservations", "expatries"] } },
  { key: "retail", name_ar: "التجزئة والسلع الاستهلاكية", name_en: "Retail & consumer goods", sort_order: 4,
    keywords: { ar: ["تجزئه", "سوبرماركت", "مستهلك", "المستهلكين", "اسعار السلع", "متاجر", "تسوق", "سلع استهلاكيه"],
      en: ["retail", "supermarket", "consumer", "consumers", "shopping", "stores", "consumer goods", "e-commerce"],
      fr: ["commerce de detail", "supermarche", "consommateurs", "magasins", "consommation"] } },
  { key: "agriculture", name_ar: "الزراعة والصناعات الغذائية", name_en: "Agriculture & food production", sort_order: 5,
    keywords: { ar: ["زراعه", "زراعي", "مزارعين", "محاصيل", "القمح", "صناعات غذائيه", "اغذيه", "الامن الغذائي", "الري"],
      en: ["agriculture", "agricultural", "farmers", "crops", "wheat", "food industry", "food security", "agrifood", "irrigation"],
      fr: ["agriculture", "agricole", "agriculteurs", "recoltes", "ble", "agroalimentaire", "securite alimentaire"] } },
  { key: "energy", name_ar: "الطاقة والطاقة الشمسية", name_en: "Energy & solar power", sort_order: 6,
    keywords: { ar: ["كهرباء", "كهرباء لبنان", "طاقه", "طاقه شمسيه", "الواح شمسيه", "مولدات", "فيول", "محروقات", "مازوت", "بنزين", "الغاز", "النفط", "التنقيب"],
      en: ["electricity", "energy", "solar", "power plant", "generators", "fuel", "diesel", "gasoline", "gas", "oil", "offshore", "edl", "renewable"],
      fr: ["electricite", "energie", "solaire", "generateurs", "carburant", "mazout", "gaz", "petrole", "renouvelable"] } },
  { key: "telecom", name_ar: "الاتصالات والتكنولوجيا", name_en: "Telecommunications & technology", sort_order: 7,
    keywords: { ar: ["اتصالات", "انترنت", "الياف ضوئيه", "اوجيرو", "خلوي", "الخلوي", "تكنولوجيا"],
      en: ["telecom", "telecommunications", "internet", "fiber", "ogero", "mobile network", "broadband", "technology", "starlink"],
      fr: ["telecoms", "telecommunications", "internet", "fibre", "ogero", "reseau mobile", "technologie"] } },
  { key: "software_ai", name_ar: "البرمجيات والذكاء الاصطناعي", name_en: "Software & AI", sort_order: 8,
    keywords: { ar: ["برمجيات", "ذكاء اصطناعي", "شركات ناشئه", "تطبيق", "رقمي", "رقمنه", "تحول رقمي"],
      en: ["software", "artificial intelligence", "ai", "startup", "startups", "mobile app", "digital transformation", "saas", "tech hub", "outsourcing"],
      fr: ["logiciel", "intelligence artificielle", "start-up", "startup", "transformation numerique"] } },
  { key: "healthcare", name_ar: "الرعايه الصحيه", name_en: "Healthcare", sort_order: 9,
    keywords: { ar: ["صحه", "مستشفى", "مستشفيات", "ادويه", "دواء", "اطباء", "وزاره الصحه", "صيدليات"],
      en: ["health", "healthcare", "hospital", "hospitals", "medicine", "medicines", "pharmaceutical", "doctors", "pharmacy"],
      fr: ["sante", "hopital", "hopitaux", "medicaments", "medecins", "pharmacie"] } },
  { key: "education", name_ar: "التعليم", name_en: "Education", sort_order: 10,
    keywords: { ar: ["تعليم", "مدارس", "جامعه", "جامعات", "الجامعه اللبنانيه", "طلاب", "اساتذه", "اقساط"],
      en: ["education", "school", "schools", "university", "universities", "students", "teachers", "tuition"],
      fr: ["education", "ecole", "ecoles", "universite", "etudiants", "enseignants", "scolarite"] } },
  { key: "transport", name_ar: "النقل والخدمات اللوجستية", name_en: "Transport & logistics", sort_order: 11,
    keywords: { ar: ["نقل", "مرفا", "مرفا بيروت", "مرفا طرابلس", "شحن", "لوجستيه", "طيران", "الميدل ايست", "حاويات"],
      en: ["transport", "port", "port of beirut", "shipping", "logistics", "freight", "airline", "middle east airlines", "containers", "aviation"],
      fr: ["transport", "port", "port de beyrouth", "logistique", "fret", "compagnie aerienne", "conteneurs"] } },
  { key: "trade", name_ar: "الاستيراد والتصدير", name_en: "Import & export", sort_order: 12,
    keywords: { ar: ["استيراد", "تصدير", "الصادرات", "الواردات", "الميزان التجاري", "جمارك", "الرسوم الجمركيه"],
      en: ["import", "imports", "export", "exports", "trade deficit", "trade balance", "customs", "tariffs"],
      fr: ["importations", "exportations", "balance commerciale", "douane", "douanes", "tarifs"] } },
  { key: "manufacturing", name_ar: "الصناعة التحويلية", name_en: "Manufacturing", sort_order: 13,
    keywords: { ar: ["صناعه", "صناعي", "مصانع", "مصنع", "الصناعيين", "انتاج محلي"],
      en: ["manufacturing", "industrial", "factory", "factories", "industrialists", "local production"],
      fr: ["industrie", "industriel", "usine", "usines", "industriels", "production locale"] } },
  { key: "professional_services", name_ar: "الخدمات المهنية", name_en: "Professional services", sort_order: 14,
    keywords: { ar: ["استشارات", "محاسبه", "تدقيق", "خدمات مهنيه", "محاماه", "هندسه"],
      en: ["consulting", "accounting", "audit", "professional services", "law firm", "engineering services"],
      fr: ["conseil", "comptabilite", "audit", "services professionnels", "cabinet"] } },
  { key: "marketing", name_ar: "الإعلان والتسويق", name_en: "Advertising & marketing", sort_order: 15,
    keywords: { ar: ["اعلان", "اعلانات", "تسويق", "اعلام", "حملات اعلانيه", "وسائل التواصل"],
      en: ["advertising", "marketing", "media", "ad campaign", "social media", "brand"],
      fr: ["publicite", "marketing", "medias", "campagne", "reseaux sociaux"] } },
  { key: "employment", name_ar: "التوظيف وسوق العمل", name_en: "Employment & recruitment", sort_order: 16,
    keywords: { ar: ["وظائف", "توظيف", "بطاله", "سوق العمل", "رواتب", "اجور", "الحد الادنى للاجور", "هجره الشباب", "عمال"],
      en: ["jobs", "employment", "unemployment", "hiring", "recruitment", "labor market", "labour market", "wages", "salaries", "minimum wage", "brain drain"],
      fr: ["emploi", "emplois", "chomage", "recrutement", "marche du travail", "salaires", "salaire minimum", "fuite des cerveaux"] } },
  { key: "public_procurement", name_ar: "المشتريات العامة والبنى التحتية", name_en: "Public procurement & infrastructure", sort_order: 17,
    keywords: { ar: ["مناقصه", "مناقصات", "الشراء العام", "بنى تحتيه", "بنيه تحتيه", "مشاريع عامه", "طرقات", "مياه", "صرف صحي", "البنك الدولي يمول"],
      en: ["tender", "tenders", "procurement", "infrastructure", "public works", "roads", "water", "wastewater", "public-private partnership"],
      fr: ["appel d offres", "marches publics", "infrastructure", "infrastructures", "travaux publics", "routes", "eau"] } },
];

export const TOPICS: { key: string; name_ar: string; keywords: Keywords }[] = [
  { key: "economy", name_ar: "الاقتصاد", keywords: { ar: ["اقتصاد", "اقتصادي", "الاقتصاديه", "النمو", "الركود", "الناتج المحلي", "الازمه الاقتصاديه"], en: ["economy", "economic", "gdp", "growth", "recession", "economic crisis"], fr: ["economie", "economique", "croissance", "recession", "pib", "crise economique"] } },
  { key: "currency", name_ar: "العملة وسعر الصرف", keywords: { ar: ["سعر الصرف", "الليره", "الدولار", "صيرفه", "العمله"], en: ["exchange rate", "lira", "pound", "currency", "dollar", "sayrafa", "devaluation"], fr: ["taux de change", "livre libanaise", "devise", "dollar", "devaluation"] } },
  { key: "inflation", name_ar: "التضخم والأسعار", keywords: { ar: ["تضخم", "غلاء", "ارتفاع الاسعار", "مؤشر الاسعار", "الاسعار"], en: ["inflation", "prices", "price hike", "cost of living", "cpi"], fr: ["inflation", "prix", "hausse des prix", "cout de la vie"] } },
  { key: "fiscal", name_ar: "المالية العامة", keywords: { ar: ["موازنه", "الموازنه", "ضرائب", "ضريبه", "الدين العام", "وزاره الماليه", "العجز", "رواتب القطاع العام", "اليوروبوندز"], en: ["budget", "taxes", "tax", "public debt", "ministry of finance", "deficit", "eurobonds", "public sector salaries"], fr: ["budget", "impots", "taxe", "dette publique", "ministere des finances", "deficit", "eurobonds"] } },
  { key: "reforms_imf", name_ar: "الإصلاحات وصندوق النقد", keywords: { ar: ["صندوق النقد", "اصلاحات", "الاصلاحات", "اتفاق على مستوى الموظفين", "خطه التعافي", "السريه المصرفيه", "الفجوه الماليه"], en: ["imf", "reforms", "staff-level agreement", "recovery plan", "banking secrecy", "financial gap"], fr: ["fmi", "reformes", "accord preliminaire", "plan de redressement", "secret bancaire"] } },
  { key: "politics", name_ar: "السياسة", keywords: { ar: ["الحكومه", "مجلس الوزراء", "مجلس النواب", "البرلمان", "رئيس الجمهوريه", "انتخابات", "الوزير", "سياسي"], en: ["government", "cabinet", "parliament", "president", "elections", "minister", "political"], fr: ["gouvernement", "conseil des ministres", "parlement", "president", "elections", "ministre", "politique"] } },
  { key: "security", name_ar: "الأمن والنزاعات", keywords: { ar: ["غاره", "غارات", "قصف", "اشتباكات", "الحرب", "تصعيد", "وقف اطلاق النار", "الجنوب", "امني", "اسرائيل", "حزب الله"], en: ["strike", "strikes", "airstrike", "shelling", "clashes", "war", "escalation", "ceasefire", "security", "israel", "hezbollah"], fr: ["frappe", "frappes", "bombardement", "affrontements", "guerre", "escalade", "cessez-le-feu", "securite", "israel", "hezbollah"] } },
  { key: "aid", name_ar: "المساعدات والتمويل الدولي", keywords: { ar: ["مساعدات", "منحه", "قرض", "مؤتمر دعم", "الجهات المانحه", "البنك الدولي", "الاتحاد الاوروبي"], en: ["aid", "grant", "donor", "donors", "world bank", "european union", "humanitarian", "funding"], fr: ["aide", "subvention", "donateurs", "banque mondiale", "union europeenne", "humanitaire", "financement"] } },
  { key: "regional", name_ar: "الإقليم والجيوسياسة", keywords: { ar: ["سوريا", "النازحين", "الخليج", "السعوديه", "ايران", "المنطقه"], en: ["syria", "refugees", "gulf", "saudi", "iran", "regional"], fr: ["syrie", "refugies", "golfe", "arabie saoudite", "iran", "regional"] } },
  { key: "business", name_ar: "الأعمال والشركات", keywords: { ar: ["شركه", "شركات", "استثمار", "مستثمرين", "افتتاح", "توسع", "اطلاق"], en: ["company", "companies", "investment", "investors", "launch", "expansion", "opens", "acquisition"], fr: ["entreprise", "entreprises", "investissement", "investisseurs", "lancement", "expansion", "ouverture"] } },
];

export const LEBANON_TERMS: Keywords = {
  ar: ["لبنان", "لبناني", "لبنانيه", "اللبناني", "اللبنانيه", "اللبنانيين", "بيروت"],
  en: ["lebanon", "lebanese", "beirut"],
  fr: ["liban", "libanais", "libanaise", "beyrouth"],
};

export const POSITIVE_TERMS: Keywords = {
  ar: ["نمو", "ارتفاع الصادرات", "تحسن", "انتعاش", "استثمار جديد", "افتتاح", "توسع", "اتفاق", "دعم", "استقرار", "تعافي", "زياده الطلب", "منحه"],
  en: ["growth", "improve", "improvement", "recovery", "rebound", "new investment", "opens", "expansion", "agreement", "support", "stability", "surge in demand", "grant", "boost"],
  fr: ["croissance", "amelioration", "reprise", "rebond", "nouvel investissement", "ouverture", "expansion", "accord", "soutien", "stabilite"],
};

export const NEGATIVE_TERMS: Keywords = {
  ar: ["انهيار", "تراجع", "ازمه", "اقفال", "افلاس", "خساره", "عجز", "تضخم", "غاره", "قصف", "حرب", "تصعيد", "انقطاع", "اضراب", "عقوبات", "هجره", "نقص"],
  en: ["collapse", "decline", "crisis", "closure", "bankruptcy", "loss", "losses", "deficit", "inflation", "strike", "airstrike", "war", "escalation", "outage", "sanctions", "shortage", "default"],
  fr: ["effondrement", "baisse", "crise", "fermeture", "faillite", "pertes", "deficit", "inflation", "frappe", "guerre", "escalade", "coupure", "sanctions", "penurie"],
};

export const UNCERTAINTY_TERMS: Keywords = {
  ar: ["ربما", "محتمل", "يحتمل", "مخاوف", "تحذير", "غموض", "يدرس", "مقترح"],
  en: ["may", "could", "might", "possible", "fears", "warns", "uncertain", "proposed", "considering", "reportedly"],
  fr: ["pourrait", "possible", "craintes", "avertit", "incertain", "propose", "envisage"],
};

/** Governorates (8 established by law; Akkar and Baalbek-Hermel since 2003/2014, Keserwan-Jbeil created 2017). */
export const AREAS: { key: string; name_ar: string; name_en: string; level: "country" | "governorate" | "city"; parent?: string; aliases: string[] }[] = [
  { key: "lebanon", name_ar: "لبنان", name_en: "Lebanon", level: "country", aliases: [] },
  { key: "beirut", name_ar: "بيروت", name_en: "Beirut", level: "governorate", parent: "lebanon", aliases: ["بيروت", "beirut", "beyrouth", "الحمرا", "hamra", "الاشرفيه", "achrafieh", "ashrafieh"] },
  { key: "mount_lebanon", name_ar: "جبل لبنان", name_en: "Mount Lebanon", level: "governorate", parent: "lebanon", aliases: ["جبل لبنان", "mount lebanon", "mont-liban", "mont liban", "بعبدا", "baabda", "المتن", "metn", "الشوف", "chouf", "عاليه", "aley", "جونيه", "jounieh"] },
  { key: "keserwan_jbeil", name_ar: "كسروان-جبيل", name_en: "Keserwan-Jbeil", level: "governorate", parent: "lebanon", aliases: ["كسروان", "keserwan", "kesrouan", "جبيل", "jbeil", "byblos"] },
  { key: "north", name_ar: "الشمال", name_en: "North", level: "governorate", parent: "lebanon", aliases: ["طرابلس", "tripoli", "البترون", "batroun", "زغرتا", "zgharta", "الكوره", "koura", "شمال لبنان", "north lebanon", "liban-nord"] },
  { key: "akkar", name_ar: "عكار", name_en: "Akkar", level: "governorate", parent: "lebanon", aliases: ["عكار", "akkar", "حلبا", "halba"] },
  { key: "beqaa", name_ar: "البقاع", name_en: "Beqaa", level: "governorate", parent: "lebanon", aliases: ["البقاع", "beqaa", "bekaa", "زحله", "zahle", "zahleh", "شتوره", "chtaura", "البقاع الغربي", "west bekaa"] },
  { key: "baalbek_hermel", name_ar: "بعلبك-الهرمل", name_en: "Baalbek-Hermel", level: "governorate", parent: "lebanon", aliases: ["بعلبك", "baalbek", "الهرمل", "hermel"] },
  { key: "south", name_ar: "الجنوب", name_en: "South", level: "governorate", parent: "lebanon", aliases: ["صيدا", "sidon", "saida", "صور", "tyre", "sour", "جنوب لبنان", "south lebanon", "sud-liban", "sud liban"] },
  { key: "nabatieh", name_ar: "النبطية", name_en: "Nabatieh", level: "governorate", parent: "lebanon", aliases: ["النبطيه", "nabatieh", "nabatiyeh", "بنت جبيل", "bint jbeil", "مرجعيون", "marjayoun", "حاصبيا", "hasbaya"] },
];

export const INSTITUTIONS: { key: string; name: string; aliases: string[] }[] = [
  { key: "bdl", name: "مصرف لبنان", aliases: ["مصرف لبنان", "banque du liban", "central bank of lebanon", "lebanon's central bank", "bdl"] },
  { key: "imf", name: "صندوق النقد الدولي", aliases: ["صندوق النقد الدولي", "صندوق النقد", "imf", "international monetary fund", "fmi"] },
  { key: "world_bank", name: "البنك الدولي", aliases: ["البنك الدولي", "world bank", "banque mondiale"] },
  { key: "eu", name: "الاتحاد الأوروبي", aliases: ["الاتحاد الاوروبي", "european union", "union europeenne"] },
  { key: "parliament", name: "مجلس النواب", aliases: ["مجلس النواب", "البرلمان", "parliament", "parlement"] },
  { key: "cabinet", name: "مجلس الوزراء", aliases: ["مجلس الوزراء", "الحكومه", "cabinet", "conseil des ministres"] },
  { key: "mof", name: "وزارة المالية", aliases: ["وزاره الماليه", "ministry of finance", "ministere des finances"] },
  { key: "moet", name: "وزارة الاقتصاد والتجارة", aliases: ["وزاره الاقتصاد", "ministry of economy", "ministere de l economie"] },
  { key: "edl", name: "كهرباء لبنان", aliases: ["كهرباء لبنان", "electricite du liban", "edl"] },
  { key: "abl", name: "جمعية المصارف", aliases: ["جمعيه المصارف", "association of banks in lebanon", "association des banques"] },
  { key: "cas", name: "إدارة الإحصاء المركزي", aliases: ["الاحصاء المركزي", "central administration of statistics"] },
  { key: "lebanese_army", name: "الجيش اللبناني", aliases: ["الجيش اللبناني", "lebanese army", "armee libanaise"] },
  { key: "unifil", name: "اليونيفيل", aliases: ["اليونيفيل", "unifil", "finul"] },
  { key: "port_beirut", name: "مرفأ بيروت", aliases: ["مرفا بيروت", "port of beirut", "port de beyrouth"] },
];

/** Seed list of well-known Lebanese companies for entity matching (not a coverage claim). */
export const KNOWN_COMPANIES: { key: string; name: string; name_ar: string; sector: string; aliases: string[]; domain?: string }[] = [
  { key: "bank_audi", name: "Bank Audi", name_ar: "بنك عوده", sector: "banking", aliases: ["bank audi", "بنك عوده"], domain: "bankaudi.com.lb" },
  { key: "blom", name: "BLOM Bank", name_ar: "بنك لبنان والمهجر", sector: "banking", aliases: ["blom bank", "بنك لبنان والمهجر"], domain: "blombank.com" },
  { key: "byblos_bank", name: "Byblos Bank", name_ar: "بنك بيبلوس", sector: "banking", aliases: ["byblos bank", "بنك بيبلوس"], domain: "byblosbank.com" },
  { key: "bankmed", name: "BankMed", name_ar: "بنك البحر المتوسط", sector: "banking", aliases: ["bankmed", "بنك البحر المتوسط"], domain: "bankmed.com.lb" },
  { key: "sgbl", name: "SGBL", name_ar: "سوسيتيه جنرال بنك في لبنان", sector: "banking", aliases: ["sgbl", "societe generale de banque au liban"], domain: "sgbl.com.lb" },
  { key: "fransabank", name: "Fransabank", name_ar: "فرنسبنك", sector: "banking", aliases: ["fransabank", "فرنسبنك"], domain: "fransabank.com" },
  { key: "mea", name: "Middle East Airlines", name_ar: "طيران الشرق الأوسط", sector: "transport", aliases: ["middle east airlines", "طيران الشرق الاوسط", "الميدل ايست", "mea"], domain: "mea.com.lb" },
  { key: "alfa", name: "Alfa", name_ar: "ألفا", sector: "telecom", aliases: ["alfa telecom", "شركه الفا"], domain: "alfa.com.lb" },
  { key: "touch", name: "touch", name_ar: "تاتش", sector: "telecom", aliases: ["touch lebanon", "شركه تاتش"], domain: "touch.com.lb" },
  { key: "ogero", name: "Ogero", name_ar: "أوجيرو", sector: "telecom", aliases: ["ogero", "اوجيرو"], domain: "ogero.gov.lb" },
  { key: "anghami", name: "Anghami", name_ar: "أنغامي", sector: "software_ai", aliases: ["anghami", "انغامي"], domain: "anghami.com" },
  { key: "murex", name: "Murex", name_ar: "موريكس", sector: "software_ai", aliases: ["murex"], domain: "murex.com" },
  { key: "totalenergies", name: "TotalEnergies", name_ar: "توتال إنرجيز", sector: "energy", aliases: ["totalenergies", "توتال"], domain: "totalenergies.com" },
];
