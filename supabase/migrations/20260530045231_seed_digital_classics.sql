-- Seed initial : 10 classiques du domaine public dans la tradition
-- salaf-salih sunni, hébergés sur archive.org (légal, gratuit, stable).
--
-- Chaque entrée pointe vers une page archive.org/details/... qui offre
-- streaming + téléchargement PDF/EPUB. La colonne external_url est
-- utilisée en priorité par le frontend ; file_url reçoit la même URL
-- en fallback (la colonne est NOT NULL).
--
-- On insère uniquement si aucun livre digital n'existe encore — évite
-- les doublons en cas de rejouage.

insert into public.digital_books (
  title, author, language, category, description, file_url, external_url
)
select * from (values
  (
    'Le Saint Coran — Mushaf Madinah',
    '—',
    'Arabe',
    'Coran',
    'Mushaf de Médine en écriture ottomane (rasm uthmanî), 604 pages. Édition du complexe King Fahd.',
    'https://archive.org/details/quran-madinah',
    'https://archive.org/details/quran-madinah'
  ),
  (
    'Sahih al-Bukhari (صحيح البخاري)',
    'Imam Muhammad al-Bukhari',
    'Arabe',
    'Hadith',
    'Recueil de hadiths authentiques, considéré comme le plus authentique après le Coran. 10 volumes en arabe.',
    'https://archive.org/details/sahih-al-bukhari-arabic-full',
    'https://archive.org/details/sahih-al-bukhari-arabic-full'
  ),
  (
    'Sahih Muslim (صحيح مسلم)',
    'Imam Muslim ibn al-Hajjaj',
    'Arabe',
    'Hadith',
    'Recueil de hadiths authentiques compilé par Imam Muslim. Texte arabe complet, 4513 pages.',
    'https://archive.org/details/sahih-muslim-arabic',
    'https://archive.org/details/sahih-muslim-arabic'
  ),
  (
    'Sunan Abi Dawud (سنن أبي داود)',
    'Imam Abu Dawud al-Sijistani',
    'Arabe',
    'Hadith',
    'Troisième des six recueils canoniques de hadiths sunnites. Texte arabe.',
    'https://archive.org/details/sunan-abu-dawood-arabic',
    'https://archive.org/details/sunan-abu-dawood-arabic'
  ),
  (
    'Tafsir Ibn Kathir (تفسير ابن كثير)',
    'Imam Isma''il ibn Kathir',
    'Arabe',
    'Tafsir',
    'Exégèse du Coran de référence dans la tradition sunnite, 10 volumes.',
    'https://archive.org/details/tafsir-ibn-kathir-10.-Volumes',
    'https://archive.org/details/tafsir-ibn-kathir-10.-Volumes'
  ),
  (
    'Riyad as-Salihin (رياض الصالحين)',
    'Imam Yahya al-Nawawi',
    'Arabe',
    'Hadith',
    'Anthologie de hadiths sur les vertus, l''adoration, l''éthique. Compilation classique de l''Imam al-Nawawi.',
    'https://archive.org/details/Riyad-Us-Saliheen-ARABIC.pdf',
    'https://archive.org/details/Riyad-Us-Saliheen-ARABIC.pdf'
  ),
  (
    'Al-Aqida al-Wasitiyya (العقيدة الواسطية)',
    'Shaykh al-Islam Ibn Taymiyyah',
    'Arabe',
    'Aqida',
    'Traité de croyance résumant la voie des Salafs sur l''unicité et les attributs divins.',
    'https://archive.org/details/al-aqidah-al-wasitiyyah-shaykh-al-islam-ibn-taymiyyah',
    'https://archive.org/details/al-aqidah-al-wasitiyyah-shaykh-al-islam-ibn-taymiyyah'
  ),
  (
    'Kitab at-Tawhid (كتاب التوحيد)',
    'Shaykh Muhammad ibn Abd al-Wahhab',
    'Arabe',
    'Aqida',
    'Le livre de l''unicité — texte fondamental sur le Tawhid avec arabe + traductions.',
    'https://archive.org/details/KTRiaasahPrinting',
    'https://archive.org/details/KTRiaasahPrinting'
  ),
  (
    'Al-Usul al-Thalatha (الأصول الثلاثة)',
    'Shaykh Muhammad ibn Abd al-Wahhab',
    'Arabe',
    'Aqida',
    'Les trois principes fondamentaux : que tout musulman doit connaître sur son Seigneur, sa religion et son Prophète.',
    'https://archive.org/details/usool-athalatha',
    'https://archive.org/details/usool-athalatha'
  ),
  (
    'Oussoûl ath-Thalâtha — Les Trois Principes (français)',
    'Shaykh Muhammad ibn Abd al-Wahhab',
    'Français',
    'Aqida',
    'Traduction française des Trois Principes Fondamentaux et leurs preuves.',
    'https://archive.org/details/OussoulAth-Thalatha-LesTroisPrincipesFondamentauxEtLeursPreuves.',
    'https://archive.org/details/OussoulAth-Thalatha-LesTroisPrincipesFondamentauxEtLeursPreuves.'
  )
) as v(title, author, language, category, description, file_url, external_url)
where not exists (select 1 from public.digital_books);
