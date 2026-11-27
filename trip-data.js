/* ==================================================================
   VILNIUS QUEST – AZ UTAZÁS ADATAI
   ------------------------------------------------------------------
   A tartalomhoz CSAK ezt a fájlt kell szerkeszteni.

   Egy állomás (stop) mezői:
     time    – időpont vagy napszak, pl. '14:30' vagy 'délután'
     icon    – emoji
     title   – rövid cím
     place   – helyszín neve
     maps    – Google Maps keresőszöveg (ebből lesz a kattintható link)
     desc    – mit csinálunk
     note    – (opcionális) gyakorlati megjegyzés, pl. foglalás
     fact    – „Tudtad?" érdekesség
     loot    – a gyűjthető tárgy: { icon, name }
     vehicle – (opcionális) ettől az állomástól ezzel megyünk: 'cat' | 'mx5'
     game    – (opcionális) minijáték: { type: 'catch' | 'pour' | 'code', title, help }

   A menetidők becslések (kb.), nem pontos útvonaltervezésből vannak.
   ================================================================== */

const TRIP = {
  title: 'VILNIUS QUEST',
  subtitle: '4 nap · 2 ország · 1 macska · 1 bérautó',
  footer: 'Te + Ádám · Litvánia & Lettország · 2027. április',
  mapSubtitle: 'Litvánia + Lettország',

  // Teaser: ez az oldal legelső képernyője (első látogatáskor)
  teaser: {
    kicker: '📨 ÚJ ÜZENET ÉRKEZETT',
    title: 'ÁDÁM, EZ NEKED SZÓL',
    sub: '2027. április · Litvánia · Lettország',
    speaker: 'KATINAS, A MACSKA',
    lines: [
      'Szia Ádám! 👋 Katinas vagyok, litván kandúr. Én leszek a túravezetőd.',
      'Azt már tudod, hogy áprilisban megyünk a Baltikumba. Azt viszont még nem, hogy mit csinálunk ott.',
      'Ez az oldal elárulja. De csak ha végigjátszod. 🐾',
      '4 nap, 2 ország, 1 bérautó. A macskát (és később az autót) te irányítod.',
      'Lesznek tengerparti erődök, egy föld alatti rakétasiló, Európa legszélesebb vízesése és pár nagyon jó sör. 🍺',
      'Minden állomáson kiderül egy program és egy érdekesség. Útközben halakat gyűjthetsz, de vigyázz a helyi állatokkal.',
      'A végén vár rád egy kérdés. Csak egy jó válasz van rá. 😼',
    ],
    ps: 'U.i.: Bocs, hogy miattam drágább a RAM. 🤖 – az AI, aki ezt az oldalt összerakta',
  },

  // Indulás időpontja a visszaszámlálóhoz, pl. '2027-04-15T06:00:00'
  startDate: null, // TODO: pontos dátum + repülési idő

  days: [
    // ============================================================
    {
      id: 'csut',
      weekday: 'Csütörtök',
      date: '', // TODO pl. 'ápr. 15.'
      title: 'Vilnius → Šiauliai',
      icon: '✝️',
      theme: 'fields',
      vehicle: 'cat',
      road: true,
      achievement: { icon: '✝️', name: 'Keresztek hegye', desc: 'Teljesítetted a csütörtököt.' },
      stops: [
        {
          time: 'napközben', icon: '🛬', title: 'Landolás Vilniusban', place: 'Vilniusi repülőtér (VNO)',
          maps: 'Vilnius International Airport',
          desc: 'Megérkeztünk Litvániába. Labas, Vilnius!',
          fact: 'Litvániában egy órával több az idő, mint otthon (UTC+2). Landolás után az óra +1-re ugrik.',
          loot: { icon: '🎫', name: 'Beszállókártya' },
        },
        {
          time: 'utána', icon: '🔑', title: 'Autóátvétel', place: 'Autókölcsönző a reptéren',
          maps: 'Vilnius Airport car rental',
          desc: 'Megkapjuk a négykerekű társunkat a hétvégére. Innentől autóval megyünk!',
          note: 'A kölcsönzőnél jelezni kell, hogy Lettországba is átmegyünk.',
          fact: 'Litvániában éjjel-nappal kötelező a tompított fényszóró (vagy a nappali menetfény). Egy első generációs (NA) MX-5-ön ez egész napra felnyitott pop-up lámpákat jelentene.',
          loot: { icon: '🔑', name: 'Autókulcs' },
          vehicle: 'mx5',
        },
        {
          time: 'délután', icon: '✝️', title: 'Keresztek hegye', place: 'Kryžių kalnas, Šiauliai mellett',
          maps: 'Hill of Crosses',
          desc: 'Kb. 2,5 óra autózás után az ország egyik legkülönösebb helye: egy domb, amin több mint százezer kereszt áll.',
          fact: 'A szovjet hatóságok többször is (1961-ben, 1973-ban és 1975-ben) eldózeroltatták a dombot, de a keresztek mindig visszakerültek, gyakran éjszaka. 1993-ban II. János Pál pápa is ellátogatott ide.',
          loot: { icon: '✝️', name: 'Mini kereszt' },
        },
        {
          time: 'délután', icon: '☀️', title: 'Šiauliai felfedezése', place: 'Šiauliai',
          maps: 'Šiauliai',
          desc: 'Litvánia negyedik legnagyobb városa. Séta, napóra-tér, és körülnézünk a környéken.',
          fact: 'Šiauliai az alapítását az 1236-os Saulė-csatához (Napcsata) köti. A Napóra-téren aranyozott íjász-szobor áll, és a városban macskamúzeum is van. 🐈',
          loot: { icon: '🏹', name: 'Aranyíjász' },
        },
        {
          time: 'késő délután', icon: '🍺', title: 'Gubernija sörfőzde', place: 'Gubernija, Šiauliai',
          maps: 'Gubernija brewery Šiauliai',
          game: { type: 'pour', title: 'Gubernija-csapolás' },
          desc: 'Történelmi sörfőzde, ha éppen látogatható.',
          note: 'A látogatást érdemes előre egyeztetni.',
          fact: 'A Gubernija 1665-ig vezeti vissza a történetét, így a Baltikum egyik legrégebbi sörfőzdéjének tartják.',
          loot: { icon: '🍺', name: 'Gubernija sör' },
        },
        {
          time: 'este', icon: '🥟', title: 'Vacsora, sör, szállás', place: 'Šiauliai',
          desc: 'Helyi vacsora és sörözés. Az autó már a szállásnál parkol, este nem vezetünk.',
          fact: 'A cepelinai, Litvánia nemzeti étele, a nevét a Zeppelin-léghajókról kapta, mert a krumpligombóc tényleg léghajó alakú.',
          loot: { icon: '🥟', name: 'Cepelinai' },
        },
      ],
    },

    // ============================================================
    {
      id: 'pent',
      weekday: 'Péntek',
      date: '', // TODO
      title: 'Riga → Liepāja',
      icon: '🌊',
      theme: 'coast',
      vehicle: 'mx5',
      road: true,
      achievement: { icon: '🐟', name: 'Repülő hal', desc: 'Végigautóztad a lett tengerpartot.' },
      stops: [
        {
          time: 'reggel', icon: '🛂', title: 'Át Lettországba', place: 'Litván–lett határ',
          desc: 'Reggeli indulás Šiauliaiból, kb. 2 óra Rigáig. Schengen, úgyhogy sorompó nincs.',
          fact: 'A lett és a litván az egyetlen két ma is élő balti nyelv, a két nép mégsem érti egymást. Lettül a köszönöm: paldies.',
          loot: { icon: '🛂', name: 'Pecsét nélküli útlevél' },
        },
        {
          time: 'délelőtt', icon: '🐟', title: 'Riga: piac és folyópart', place: 'Rigai Központi Piac, Spīķeri',
          maps: 'Riga Central Market',
          game: { type: 'catch', title: 'Halpiaci kapkodás', help: 'Repülnek a halak a piacon! Kapj el hatot, mielőtt leesnek.' },
          desc: 'A Központi Piac csarnokai, a Spīķeri raktárnegyed és a Daugava-part. A klasszikus óváros helyett az alternatív Riga.',
          fact: 'A rigai Központi Piac csarnokait első világháborús német Zeppelin-hangárokból építették. A piac 1930-ban nyílt meg, ma pedig a rigai UNESCO-világörökség része.',
          loot: { icon: '🐟', name: 'Füstölt hal' },
        },
        {
          time: 'dél', icon: '🥾', title: 'Ķemeri Nemzeti Park', place: 'Nagy Ķemeri-láp, pallósösvény',
          maps: 'Great Ķemeri Bog Boardwalk',
          desc: 'Kb. 45 perc Rigától. Hosszabb túra a mocsárvidéken, a lápon át vezető pallókon.',
          fact: 'Ķemeri a 19. századtól kénes forrásairól híres fürdőhely volt. A lápon egy kb. 3,4 km-es pallósösvény vezet végig, kilátótoronnyal.',
          loot: { icon: '🥾', name: 'Sáros bakancs' },
        },
        {
          time: 'délután', icon: '💧', title: 'Kuldīga és a Venta-vízesés', place: 'Ventas rumba, Kuldīga',
          maps: 'Ventas rumba Kuldīga',
          game: { type: 'catch', title: 'Repülő halak', help: 'Tavasszal a halak átugranak a vízesésen. Kapj el hatot!', emoji: '🐠' },
          desc: 'Kb. 1,5 óra autózás. Európa legszélesebb vízesése és egy UNESCO-kisváros.',
          fact: 'A Venta-vízesés kb. 250 méter széles, de csak kb. 2 méter magas. Tavasszal a halak felugrálnak rajta, hogy feljebb ívhassanak, ezért Kuldīga „az a város, ahol a halak repülnek". Az óváros 2023 óta UNESCO-világörökség.',
          loot: { icon: '🐠', name: 'Repülő hal' },
        },
        {
          time: 'késő délután', icon: '🌊', title: 'Jūrkalne partfala', place: 'Jūrkalne',
          maps: 'Jūrkalne cliffs',
          desc: 'Vadregényes, üres Balti-tenger part magas homokfallal. Ez a nap fotós csúcspontja.',
          fact: 'Jūrkalnénál a part helyenként közel 20 méter magas homokfalban szakad a tengerbe, és a hullámok évről évre tovább mossák alá.',
          loot: { icon: '🐚', name: 'Balti kagyló' },
        },
        {
          time: 'este', icon: '🍻', title: 'Liepāja: vacsora és sör', place: 'Miezis un kompānija, Liepāja',
          maps: 'Miezis un kompānija Liepāja',
          desc: 'Kb. 1 óra Liepājáig. Helyi vacsora, kézműves sör, szállás. Az autó estére parkol.',
          fact: 'Liepāja beceneve „a város, ahol a szél születik". A lett rockzene egyik fővárosa is.',
          loot: { icon: '🍻', name: 'Kézműves sör' },
        },
      ],
    },

    // ============================================================
    {
      id: 'szom',
      weekday: 'Szombat',
      date: '', // TODO
      title: 'Hidegháború → Vilnius',
      icon: '🚀',
      theme: 'forest',
      vehicle: 'mx5',
      road: true,
      achievement: { icon: '🚀', name: 'Hidegháborús veterán', desc: 'Bunkerek, erődök, rakétasilók.' },
      stops: [
        {
          time: 'reggel', icon: '⚓', title: 'Karosta', place: 'Karosta, Liepāja',
          maps: 'Karosta Liepāja',
          desc: 'Egykori cári, majd szovjet katonai negyed. Panelházak, haditengerészeti katedrális, nyers hangulat.',
          fact: 'Karostát III. Sándor cár haditengerészeti erődvárosként építtette a 19. század végén. A szovjet időkben zárt katonai terület volt, ahová még a liepājaiak sem mehettek be szabadon.',
          loot: { icon: '⚓', name: 'Horgony' },
        },
        {
          time: 'délelőtt', icon: '🧱', title: 'Északi erődök', place: 'Ziemeļu forti, Liepāja',
          maps: 'Northern Forts Liepāja',
          desc: 'Tengerparti erődromok, amiket a hullámok bontanak. Csak a biztonságosan bejárható részekre megyünk.',
          fact: 'Az erődrendszert nem sokkal az elkészülte után elavultnak ítélték, és 1908 körül maga a cári hadsereg próbálta felrobbantani. A romok azóta lassan a tengerbe csúsznak.',
          loot: { icon: '📸', name: 'Romfotó' },
        },
        {
          time: 'délelőtt', icon: '⛓️', title: 'Karostai katonai börtön', place: 'Karostas cietums',
          maps: 'Karosta Prison',
          desc: 'Opcionális: vezetett túra egy egykori katonai fogdában.',
          note: 'Opcionális program. A túrák időpontját érdemes előre ellenőrizni.',
          fact: 'A karostai börtön egészen 1997-ig katonai fogdaként működött. Ma vezetett túrákat tartanak benne, ahol a látogatókkal úgy bánnak, mintha rabok lennének.',
          loot: { icon: '🔢', name: 'Rabszám' },
        },
        {
          time: 'dél', icon: '🦆', title: 'Plateliai-tó', place: 'Žemaitija Nemzeti Park',
          maps: 'Plateliai Lake',
          desc: 'Kb. 1,5 óra vissza Litvániába. Tóparti pihenő a Žemaitija Nemzeti Parkban.',
          fact: 'A Plateliai-tó Litvánia egyik legmélyebb tava (kb. 46 m), és hét sziget van rajta.',
          loot: { icon: '🦆', name: 'Tavi kacsa' },
        },
        {
          time: 'kora délután', icon: '🚀', title: 'Plokštinė rakétabázis', place: 'Hidegháborús Múzeum, Plokštinė',
          maps: 'Cold War Museum Plokštinė',
          game: { type: 'code', title: 'Rakétasiló indítókód', help: 'Jegyezd meg a felvillanó indítókódot, és üsd be ugyanígy!', length: 5 },
          desc: 'Föld alatti szovjet atomrakéta-bázis az erdő közepén. Le lehet menni a silóhoz.',
          note: 'A nyitvatartást és a túrákat érdemes előre ellenőrizni.',
          fact: 'A bázist az 1960-as évek elején építették titokban, és négy silójában R-12-es atomrakéták álltak, amelyek elérték Nyugat-Európát. Ma itt működik a Hidegháborús Múzeum.',
          loot: { icon: '☢️', name: 'Hidegháborús érme' },
        },
        {
          time: '~19:00', icon: '🏁', title: 'Vissza Vilniusba', place: 'Vilnius',
          desc: 'Kb. 4 óra autózás keletre. A cél, hogy 19 óra körül beérjünk Vilniusba.',
          fact: 'A Guinness-rekordok könyve szerint az MX-5 minden idők legkelendőbb kétüléses sportautója. A fejlesztők mottója: Jinba Ittai, vagyis „lovas és ló egyként".',
          loot: { icon: '⛽', name: 'Üres tank' },
        },
        {
          time: 'este', icon: '🍻', title: 'Vilniusi sörözés', place: 'Šnekutis / Alaus Biblioteka / Būsi Trečias',
          maps: 'Šnekutis Vilnius',
          game: { type: 'pour', title: 'Parasztsör-csapolás' },
          desc: 'Vacsora és esti sörözés. Az autó a szálláson parkol.',
          fact: 'Litvánia Európa azon kevés helyeinek egyike, ahol fennmaradt a hagyományos parasztsör-főzés (kaimiškas alus), saját, évszázados élesztőtörzsekkel.',
          loot: { icon: '🍺', name: 'Parasztsör' },
        },
      ],
    },

    // ============================================================
    {
      id: 'vas',
      weekday: 'Vasárnap',
      date: '', // TODO
      title: 'Vilnius',
      icon: '🏙️',
      theme: 'city',
      vehicle: 'mx5',
      road: false,
      achievement: { icon: '🐈', name: 'Hazatért macska', desc: 'Mind a 4 világ kész.' },
      stops: [
        {
          time: 'délelőtt', icon: '🎸', title: 'Lukiškės Prison 2.0', place: 'Lukiškės, Vilnius',
          maps: 'Lukiškės Prison 2.0',
          game: { type: 'code', title: 'Cellaajtó-kód', help: 'Jegyezd meg a zárkód sorrendjét, és nyisd ki a cellát!', length: 4 },
          desc: 'Egykori cári börtön, ma alternatív kulturális tér műtermekkel, koncertekkel és túrákkal.',
          note: 'A túrákra általában előre kell jegyet foglalni.',
          fact: 'A börtön a cári időkben épült, és egészen 2019-ig működött. A Stranger Things 4. évadának orosz börtönös jeleneteit is itt forgatták.',
          loot: { icon: '🎬', name: 'Forgatási kellék' },
        },
        {
          time: 'délelőtt', icon: '🐈', title: 'Užupis', place: 'Užupis, Vilnius',
          maps: 'Užupis',
          desc: 'Séta a művésznegyedben, ami „független köztársaságnak" tartja magát.',
          fact: 'Užupis 1997. április 1-jén kikiáltotta a függetlenségét, és saját alkotmánya van. Egyik pontja: „A macska nem köteles szeretni a gazdáját, de nehéz időkben segítenie kell."',
          loot: { icon: '📜', name: 'Užupis alkotmány' },
        },
        {
          time: 'dél', icon: '🏞️', title: 'Pūčkoriai kilátó', place: 'Pavilniai Regionális Park',
          maps: 'Pūčkorių atodanga',
          desc: 'Erdős folyóvölgy és kilátó a Vilnia felett, pár percre a belvárostól.',
          fact: 'A Pūčkoriai-partfal kb. 65 méter magas, Litvánia egyik legmagasabb folyóparti feltárása. Mindez gyakorlatilag Vilnius városhatárán belül.',
          loot: { icon: '🌲', name: 'Fenyőtoboz' },
        },
        {
          time: 'kora délután', icon: '🥣', title: 'Utolsó litván ebéd', place: 'Vilnius',
          desc: 'Utolsó kör a helyi konyhából, mielőtt indulunk a reptérre.',
          fact: 'A šaltibarščiai céklás-kefires hideg leves, feltűnően rózsaszín. Vilniusban saját fesztiválja is van (Pink Soup Fest).',
          loot: { icon: '🥣', name: 'Rózsaszín leves' },
        },
        {
          time: 'délután', icon: '🔑', title: 'Autó leadása', place: 'Vilniusi repülőtér',
          maps: 'Vilnius International Airport',
          desc: 'Búcsú a négykerekű társtól. Innen már gyalog.',
          fact: 'A „Miata" név a Mazda szerint egy ófelnémet szóból ered, és azt jelenti: „jutalom".',
          loot: { icon: '🏁', name: 'Kockás zászló' },
          vehicle: 'cat',
        },
        {
          time: 'délután', icon: '✈️', title: 'Hazarepülés', place: 'Vilniusi repülőtér (VNO)',
          desc: 'Viszlát, Baltikum! Iki pasimatymo!',
          fact: '1989. augusztus 23-án kb. 2 millió ember fogott kezet egy kb. 675 km-es élőláncban Vilniustól Rigán át Tallinnig. Ez volt a Balti út.',
          loot: { icon: '🏆', name: 'Baltikum-trófea' },
        },
      ],
    },
  ],

  // Véletlen „Tudtad?" érdekességek (🧠 gomb a jobb felső sarokban)
  facts: [
    { tag: 'LITVÁNIA', text: 'Litvánia volt Európa utolsó pogány országa: csak 1387-ben vette fel a kereszténységet.' },
    { tag: 'LITVÁNIA', text: 'A 15. században a Litván Nagyfejedelemség Európa legnagyobb területű állama volt, a Balti-tengertől a Fekete-tengerig ért.' },
    { tag: 'LITVÁNIA', text: 'Litvánia volt az első szovjet tagköztársaság, amely kikiáltotta a függetlenségét: 1990. március 11-én.' },
    { tag: 'LITVÁNIA', text: 'A litván az egyik legrégiesebb ma is beszélt indoeurópai nyelv, egyes szavai meglepően hasonlítanak a szanszkritra.' },
    { tag: 'LITVÁNIA', text: 'A fehér gólya Litvánia nemzeti madara.' },
    { tag: 'LITVÁNIA', text: 'Litvánia területének nagyjából harmadát erdő borítja, és közel 3000 tava van.' },
    { tag: 'LITVÁNIA', text: 'A Kur-földnyelv vándordűnéi Európa legmagasabbjai közé tartoznak. A földnyelv UNESCO-világörökség, és fele Litvániáé, fele Oroszországé.' },
    { tag: 'LITVÁNIA', text: 'A kosárlabda Litvánia „második vallása": az ország Európa-bajnok lett 1937-ben, 1939-ben és 2003-ban.' },
    { tag: 'LITVÁNIA', text: 'Litvánul a kandúr: katinas, a nőstény macska: katė.' },
    { tag: 'VILNIUS', text: 'Vilnius óvárosa Kelet- és Észak-Európa egyik legnagyobb fennmaradt középkori óvárosa, 1994 óta UNESCO-világörökség.' },
    { tag: 'VILNIUS', text: 'A legenda szerint Gediminas nagyfejedelem álmában egy vasfarkas üvöltött a dombon. A jós szerint ez egy hatalmas város jele volt, és így született Vilnius.' },
    { tag: 'VILNIUS', text: 'Vilniusban áll Frank Zappa szobra (1995), pedig Zappa sosem járt Litvániában.' },
    { tag: 'VILNIUS', text: 'A vilniusi tévétorony kb. 326 méter magas, ez Litvánia legmagasabb építménye.' },
    { tag: 'VILNIUS', text: '2018-ban Vilnius egy merész kampánnyal reklámozta magát: „Vilnius – Európa G-pontja. Senki sem tudja, hol van, de ha megtalálod, csodálatos."' },
    { tag: 'VILNIUS', text: 'Vilnius azon kevés főváros egyike, ahol a belváros felett hőlégballonnal is lehet repülni.' },
    { tag: 'LETTORSZÁG', text: 'Rigában áll a Macskaház: a tornyain fekete macskaszobrok vannak. A legenda szerint a tulajdonos, akit nem vettek fel a Nagy Céhbe, bosszúból fordíttatta a macskák hátsóját a céhház felé. 🐈‍⬛' },
    { tag: 'LETTORSZÁG', text: 'Lettország területének több mint felét erdő borítja.' },
    { tag: 'LETTORSZÁG', text: 'Riga a Baltikum legnagyobb városa. Riga és Tallinn régóta vitatkozik, hol állították fel az első karácsonyfát.' },
    { tag: 'LETTORSZÁG', text: 'Riga belvárosában rengeteg szecessziós (Art Nouveau) épület áll, kevés városban van ennyi egy helyen.' },
    { tag: 'BALTIKUM', text: 'A balti borostyán (litvánul: gintaras) kb. 40 millió éves megkövesedett fagyanta. Van, amelyikben ősi rovar is rejtőzik.' },
    { tag: 'BALTIKUM', text: 'Az észt nyelv a finnugor nyelvcsalád tagja, vagyis a magyar távoli rokona. A litván és a lett viszont egyáltalán nem az.' },
    { tag: 'BALTIKUM', text: 'A Skype-ot észt mérnökök fejlesztették. Észtországban 2005 óta lehet interneten szavazni.' },
    { tag: 'JAPÁN', text: '1940-ben Chiune Sugihara japán konzul Kaunasban a tiltás ellenére több ezer zsidó menekültnek adott ki vízumot, így mentve meg az életüket.' },
    { tag: 'JAPÁN', text: 'Japánban február 22. a macskák napja, mert a 2-2-2 (ni-ni-ni) úgy hangzik, mint a „nyan nyan nyan".' },
    { tag: 'JAPÁN', text: 'A maneki-neko, a japán integető szerencsemacska: ha a bal mancsát emeli, vendégeket hív, ha a jobbat, pénzt.' },
    { tag: 'JAPÁN', text: 'Japánban vannak „macskaszigetek", például Tashirojima, ahol több a macska, mint az ember.' },
    { tag: 'MACSKA', text: 'A macskák naponta átlagosan 12–16 órát alszanak.' },
    { tag: 'MX-5', text: 'Az MX-5-öt 1989-ben mutatták be a chicagói autószalonon.' },
    { tag: 'MX-5', text: 'Az első generációs (NA) MX-5 pop-up fényszórói a modell legikonikusabb részei. A rajongók „kacsintásra" is szokták alakítani őket.' },
  ],

  // Amit a macska mond, ha rákoppintasz
  phrases: [
    'Labas! (litvánul: Szia!)',
    'Ačiū! (litvánul: Köszi!)',
    'Į sveikatą! (litvánul: Egészségedre!)',
    'Skanu! (litvánul: Finom!)',
    'Sveiki! (lettül: Szia!)',
    'Paldies! (lettül: Köszi!)',
    'Priekā! (lettül: Egészségedre!)',
    'Nyaa~ (japánul: miaú)',
    'Itadakimasu! (japánul: Jó étvágyat!)',
    'Ganbatte! (japánul: Hajrá!)',
    'Katinas vagyok. Litván kandúr.',
    'Prrrrr…',
  ],

  // Betöltőképernyő: [százalék, üzenet]
  loading: [
    [9, 'Macska felébresztése…'],
    [21, 'Repülőjegyek megszagolása…'],
    [34, 'Pop-up fényszórók felnyitása…'],
    [46, 'Cepelinai felfújása…'],
    [58, 'Litván ékezetek telepítése (ą č ę ė į š ų ū ž)…'],
    [69, 'Lett ékezetek telepítése (ā ē ī ū ķ ļ ņ)…'],
    [78, 'Rakétasiló kinyitása…'],
    [87, 'A macska ráfeküdt a billentyűzetre…'],
    [87, 'jjjjjjjjjjjjjjjjjjjjjjjjjjj'],
    [100, 'Kész! Nyaa~'],
  ],
};
