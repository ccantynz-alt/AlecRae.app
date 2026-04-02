import { DocMode } from './templates';

export interface Language {
  code: string;
  whisperCode: string;
  name: string;
  nativeName: string;
  legalTerminology: string[];
  accountingTerminology: string[];
  dateFormat: string;
  currencySymbol: string;
  spellingVariant?: string;
  grammarNotes: string;
}

export const LANGUAGES: Language[] = [
  {
    code: 'en-US', whisperCode: 'en', name: 'English (US)', nativeName: 'English (US)',
    legalTerminology: ['habeas corpus', 'res ipsa loquitur', 'voir dire', 'stare decisis', 'certiorari', 'prima facie', 'amicus curiae', 'subpoena duces tecum', 'pro se', 'nunc pro tunc', 'mandamus', 'in limine', 'ex parte', 'sua sponte', 'quantum meruit'],
    accountingTerminology: ['GAAP', 'FASB', 'ASC', 'IRC', 'EBITDA', 'SOX', 'PCAOB', 'NOL', 'AMT', '10-K', '10-Q', 'Schedule C'],
    dateFormat: 'MM/DD/YYYY', currencySymbol: '$', spellingVariant: 'US',
    grammarNotes: 'Use Bluebook citation style. American spelling (analyze, organize, honor). Oxford comma preferred in legal writing.',
  },
  {
    code: 'en-GB', whisperCode: 'en', name: 'English (UK)', nativeName: 'English (UK)',
    legalTerminology: ['solicitor', 'barrister', 'tribunal', 'Crown Court', 'High Court', 'judicial review', 'claimant', 'defendant', 'magistrate', 'injunction', 'tort', 'negligence', 'Queen\'s Counsel', 'statutory instrument', 'common law'],
    accountingTerminology: ['IFRS', 'HMRC', 'FCA', 'Companies House', 'VAT', 'corporation tax', 'PAYE', 'National Insurance', 'FRS 102', 'audit committee'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '£', spellingVariant: 'UK',
    grammarNotes: 'Use OSCOLA citation style. British spelling (analyse, organise, honour). No Oxford comma in standard usage.',
  },
  {
    code: 'en-AU', whisperCode: 'en', name: 'English (AU)', nativeName: 'English (AU)',
    legalTerminology: ['magistrate', 'Federal Court', 'ASIC', 'High Court of Australia', 'barrister', 'solicitor', 'tribunal', 'statutory declaration', 'affidavit', 'subpoena', 'writ', 'injunction', 'tort', 'duty of care'],
    accountingTerminology: ['AASB', 'ATO', 'ASIC', 'GST', 'BAS', 'superannuation', 'franking credits', 'PAYG', 'tax file number', 'CGT'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: 'A$', spellingVariant: 'AU',
    grammarNotes: 'Use AGLC citation style. British-influenced spelling. Legal writing follows UK conventions with local variations.',
  },
  {
    code: 'en-NZ', whisperCode: 'en', name: 'English (NZ)', nativeName: 'English (NZ)',
    legalTerminology: ['District Court', 'High Court', 'Employment Court', 'IRD', 'Treaty of Waitangi', 'Māori Land Court', 'Resource Management Act', 'statutory declaration', 'affidavit', 'barrister', 'solicitor'],
    accountingTerminology: ['IRD', 'GST', 'PAYE', 'ACC', 'KiwiSaver', 'NZ IFRS', 'Financial Markets Authority', 'Chartered Accountants ANZ'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: 'NZ$', spellingVariant: 'NZ',
    grammarNotes: 'Similar to UK/AU conventions. NZ-specific statutes and court hierarchy. Te reo Māori terms may appear in legal contexts.',
  },
  {
    code: 'es', whisperCode: 'es', name: 'Spanish', nativeName: 'Español',
    legalTerminology: ['demandante', 'demandado', 'sentencia', 'amparo', 'recurso', 'juzgado', 'tribunal', 'fiscal', 'abogado', 'procurador', 'auto', 'providencia', 'escritura pública', 'poder notarial', 'litispendencia'],
    accountingTerminology: ['NIF', 'NIIF', 'IVA', 'IRPF', 'balance general', 'cuenta de resultados', 'activo', 'pasivo', 'patrimonio neto', 'amortización'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '€',
    grammarNotes: 'Spanish legal writing uses formal register. Capitalize proper nouns of institutions. Use usted form in formal correspondence.',
  },
  {
    code: 'fr', whisperCode: 'fr', name: 'French', nativeName: 'Français',
    legalTerminology: ['plaignant', 'défendeur', 'arrêt', 'cour d\'appel', 'mise en demeure', 'assignation', 'tribunal de grande instance', 'juge d\'instruction', 'procureur', 'greffier', 'jugement', 'ordonnance', 'pourvoi en cassation', 'référé'],
    accountingTerminology: ['PCG', 'IFRS', 'TVA', 'bilan', 'compte de résultat', 'actif', 'passif', 'capitaux propres', 'amortissement', 'provisions'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '€',
    grammarNotes: 'French legal writing is highly formal. Use passé composé and present tense. Capitalize Tribunal, Cour, État. Use « guillemets » for quotes.',
  },
  {
    code: 'de', whisperCode: 'de', name: 'German', nativeName: 'Deutsch',
    legalTerminology: ['Kläger', 'Beklagter', 'Urteil', 'Berufung', 'Grundgesetz', 'Bundesgerichtshof', 'Verwaltungsgericht', 'Rechtsanwalt', 'Staatsanwalt', 'Beschluss', 'Verfügung', 'Revision', 'Klageerhebung', 'einstweilige Verfügung'],
    accountingTerminology: ['HGB', 'IFRS', 'Umsatzsteuer', 'Bilanz', 'GuV', 'Aktiva', 'Passiva', 'Abschreibung', 'Rückstellung', 'Wirtschaftsprüfer'],
    dateFormat: 'DD.MM.YYYY', currencySymbol: '€',
    grammarNotes: 'German legal writing uses long compound sentences. Nouns are capitalized. Use formal Sie form. Legal citations follow German format.',
  },
  {
    code: 'it', whisperCode: 'it', name: 'Italian', nativeName: 'Italiano',
    legalTerminology: ['attore', 'convenuto', 'sentenza', 'ricorso', 'codice civile', 'codice penale', 'tribunale', 'corte d\'appello', 'Cassazione', 'decreto', 'ordinanza', 'giurisprudenza', 'procura', 'atto di citazione'],
    accountingTerminology: ['OIC', 'IFRS', 'IVA', 'bilancio', 'conto economico', 'stato patrimoniale', 'ammortamento', 'accantonamento', 'revisore dei conti', 'partita IVA'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '€',
    grammarNotes: 'Italian legal writing uses formal register. Capitalize institutional names. Use Lei form for formal address.',
  },
  {
    code: 'pt-BR', whisperCode: 'pt', name: 'Portuguese (BR)', nativeName: 'Português (BR)',
    legalTerminology: ['autor', 'réu', 'acórdão', 'recurso extraordinário', 'mandado de segurança', 'habeas corpus', 'STF', 'STJ', 'comarca', 'desembargador', 'juiz de direito', 'Ministério Público', 'petição inicial', 'contestação'],
    accountingTerminology: ['CPC', 'IFRS', 'ICMS', 'ISS', 'PIS', 'COFINS', 'balanço patrimonial', 'DRE', 'CVM', 'Receita Federal'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: 'R$',
    grammarNotes: 'Brazilian legal Portuguese is highly formal. Use third person. Capitalize court names and institutions.',
  },
  {
    code: 'pt-PT', whisperCode: 'pt', name: 'Portuguese (PT)', nativeName: 'Português (PT)',
    legalTerminology: ['queixoso', 'arguido', 'tribunal da relação', 'Supremo Tribunal de Justiça', 'acórdão', 'providência cautelar', 'Ministério Público', 'procurador', 'advogado', 'juiz', 'sentença', 'recurso', 'constituição'],
    accountingTerminology: ['SNC', 'IFRS', 'IVA', 'IRC', 'IRS', 'balanço', 'demonstração de resultados', 'Autoridade Tributária', 'TOC', 'ROC'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '€',
    grammarNotes: 'European Portuguese legal writing differs from Brazilian. Use formal register with European spelling conventions.',
  },
  {
    code: 'nl', whisperCode: 'nl', name: 'Dutch', nativeName: 'Nederlands',
    legalTerminology: ['eiser', 'gedaagde', 'vonnis', 'hoger beroep', 'rechtbank', 'gerechtshof', 'Hoge Raad', 'advocaat', 'officier van justitie', 'dagvaarding', 'kort geding', 'cassatie', 'arrest'],
    accountingTerminology: ['RJ', 'IFRS', 'BTW', 'balans', 'winst-en-verliesrekening', 'jaarrekening', 'accountant', 'Belastingdienst', 'vennootschapsbelasting', 'fiscaal'],
    dateFormat: 'DD-MM-YYYY', currencySymbol: '€',
    grammarNotes: 'Dutch legal writing uses formal register. Follow Dutch spelling rules. Capitalize proper institutional names.',
  },
  {
    code: 'ja', whisperCode: 'ja', name: 'Japanese', nativeName: '日本語',
    legalTerminology: ['原告', '被告', '判決', '控訴', '民法', '刑法', '裁判所', '弁護士', '検察官', '訴状', '答弁書', '準備書面', '最高裁判所', '地方裁判所'],
    accountingTerminology: ['JGAAP', 'IFRS', '貸借対照表', '損益計算書', '監査法人', '公認会計士', '税理士', '消費税', '法人税', '確定申告'],
    dateFormat: 'YYYY/MM/DD', currencySymbol: '¥',
    grammarNotes: 'Japanese legal writing uses highly formal keigo. Use desu/masu form. Legal documents use specific kanji compounds.',
  },
  {
    code: 'ko', whisperCode: 'ko', name: 'Korean', nativeName: '한국어',
    legalTerminology: ['원고', '피고', '판결', '항소', '대법원', '헌법재판소', '변호사', '검사', '소장', '답변서', '준비서면', '민법', '형법', '상고'],
    accountingTerminology: ['K-IFRS', 'K-GAAP', '재무제표', '대차대조표', '손익계산서', '공인회계사', '세무사', '부가가치세', '법인세', '국세청'],
    dateFormat: 'YYYY.MM.DD', currencySymbol: '₩',
    grammarNotes: 'Korean legal writing uses formal hasipsio-che style. Use appropriate honorifics. Legal terminology uses Sino-Korean vocabulary.',
  },
  {
    code: 'zh', whisperCode: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文',
    legalTerminology: ['原告', '被告', '判决', '上诉', '民法典', '刑法', '人民法院', '律师', '检察院', '起诉状', '答辩状', '最高人民法院', '仲裁', '合同法'],
    accountingTerminology: ['CAS', 'IFRS', '资产负债表', '利润表', '注册会计师', '审计', '增值税', '企业所得税', '财务报表', '会计准则'],
    dateFormat: 'YYYY年MM月DD日', currencySymbol: '¥',
    grammarNotes: 'Chinese legal writing uses formal written Chinese (书面语). Use simplified characters for PRC, traditional for Taiwan/HK.',
  },
  {
    code: 'ar', whisperCode: 'ar', name: 'Arabic', nativeName: 'العربية',
    legalTerminology: ['المدعي', 'المدعى عليه', 'الحكم', 'الاستئناف', 'المحكمة', 'القاضي', 'المحامي', 'النيابة العامة', 'الشريعة', 'الدعوى', 'الطعن', 'النقض', 'العقد', 'التحكيم'],
    accountingTerminology: ['معايير المحاسبة', 'الميزانية العمومية', 'قائمة الدخل', 'المراجعة', 'ضريبة القيمة المضافة', 'الزكاة', 'المحاسب القانوني', 'القوائم المالية'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: 'د.إ',
    grammarNotes: 'Arabic legal writing uses Modern Standard Arabic (فصحى). Right-to-left text. Use formal register with proper diacritical marks for ambiguous terms.',
  },
  {
    code: 'hi', whisperCode: 'hi', name: 'Hindi', nativeName: 'हिन्दी',
    legalTerminology: ['वादी', 'प्रतिवादी', 'निर्णय', 'अपील', 'उच्चतम न्यायालय', 'उच्च न्यायालय', 'अधिवक्ता', 'न्यायाधीश', 'याचिका', 'रिट', 'जमानत', 'दंड संहिता', 'सिविल प्रक्रिया संहिता'],
    accountingTerminology: ['ICAI', 'GST', 'आयकर', 'लेखा परीक्षा', 'तुलन पत्र', 'लाभ हानि खाता', 'चार्टर्ड अकाउंटेंट', 'TDS', 'PAN', 'वित्तीय विवरण'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '₹',
    grammarNotes: 'Hindi legal writing often mixes Hindi and English terminology. Use formal Shuddh Hindi where possible. Devanagari script.',
  },
  {
    code: 'ru', whisperCode: 'ru', name: 'Russian', nativeName: 'Русский',
    legalTerminology: ['истец', 'ответчик', 'решение суда', 'апелляция', 'кассация', 'арбитражный суд', 'адвокат', 'прокурор', 'исковое заявление', 'определение', 'постановление', 'Конституционный Суд', 'Верховный Суд'],
    accountingTerminology: ['РСБУ', 'МСФО', 'НДС', 'бухгалтерский баланс', 'отчёт о прибылях и убытках', 'аудитор', 'налог на прибыль', 'ФНС', 'главный бухгалтер'],
    dateFormat: 'DD.MM.YYYY', currencySymbol: '₽',
    grammarNotes: 'Russian legal writing uses formal register. Genitive case used extensively in legal constructions. Capitalize institutional names.',
  },
  {
    code: 'tr', whisperCode: 'tr', name: 'Turkish', nativeName: 'Türkçe',
    legalTerminology: ['davacı', 'davalı', 'karar', 'temyiz', 'mahkeme', 'hakim', 'avukat', 'savcı', 'dava dilekçesi', 'cevap dilekçesi', 'Yargıtay', 'Anayasa Mahkemesi', 'icra', 'ihtiyati tedbir'],
    accountingTerminology: ['VUK', 'TFRS', 'KDV', 'bilanço', 'gelir tablosu', 'denetçi', 'SMMM', 'YMM', 'vergi dairesi', 'kurumlar vergisi'],
    dateFormat: 'DD.MM.YYYY', currencySymbol: '₺',
    grammarNotes: 'Turkish legal writing uses formal Ottoman-influenced vocabulary. Agglutinative grammar requires attention to suffixes.',
  },
  {
    code: 'pl', whisperCode: 'pl', name: 'Polish', nativeName: 'Polski',
    legalTerminology: ['powód', 'pozwany', 'wyrok', 'apelacja', 'kasacja', 'sąd', 'sędzia', 'adwokat', 'radca prawny', 'prokuratura', 'pozew', 'Sąd Najwyższy', 'postanowienie', 'nakaz zapłaty'],
    accountingTerminology: ['ustawa o rachunkowości', 'MSR', 'MSSF', 'VAT', 'PIT', 'CIT', 'bilans', 'rachunek zysków i strat', 'biegły rewident', 'KRS'],
    dateFormat: 'DD.MM.YYYY', currencySymbol: 'zł',
    grammarNotes: 'Polish legal writing uses highly formal register. Complex case system affects legal terminology. Capitalize institutional names.',
  },
  {
    code: 'sv', whisperCode: 'sv', name: 'Swedish', nativeName: 'Svenska',
    legalTerminology: ['kärande', 'svarande', 'dom', 'överklagande', 'tingsrätt', 'hovrätt', 'Högsta domstolen', 'advokat', 'åklagare', 'stämningsansökan', 'svaromål', 'förordning', 'lagrum'],
    accountingTerminology: ['BFNAR', 'IFRS', 'moms', 'balansräkning', 'resultaträkning', 'revisor', 'Skatteverket', 'bolagsskatt', 'årsredovisning', 'bokföring'],
    dateFormat: 'YYYY-MM-DD', currencySymbol: 'kr',
    grammarNotes: 'Swedish legal writing uses formal register. ISO date format standard. Definite articles are suffixed to nouns.',
  },
  {
    code: 'th', whisperCode: 'th', name: 'Thai', nativeName: 'ไทย',
    legalTerminology: ['โจทก์', 'จำเลย', 'คำพิพากษา', 'อุทธรณ์', 'ฎีกา', 'ศาล', 'ผู้พิพากษา', 'ทนายความ', 'อัยการ', 'คำฟ้อง', 'คำให้การ', 'ศาลฎีกา', 'พระราชบัญญัติ'],
    accountingTerminology: ['TFRS', 'ภาษีมูลค่าเพิ่ม', 'งบดุล', 'งบกำไรขาดทุน', 'ผู้สอบบัญชี', 'กรมสรรพากร', 'ภาษีเงินได้นิติบุคคล', 'สภาวิชาชีพบัญชี'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '฿',
    grammarNotes: 'Thai legal writing uses royal/formal register (ราชาศัพท์ for court). No spaces between words — context determines boundaries.',
  },
  {
    code: 'vi', whisperCode: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt',
    legalTerminology: ['nguyên đơn', 'bị đơn', 'bản án', 'kháng cáo', 'tòa án', 'thẩm phán', 'luật sư', 'viện kiểm sát', 'đơn khởi kiện', 'bản cáo trạng', 'Tòa án nhân dân tối cao', 'pháp lệnh', 'nghị định'],
    accountingTerminology: ['VAS', 'IFRS', 'thuế GTGT', 'bảng cân đối kế toán', 'báo cáo kết quả kinh doanh', 'kiểm toán viên', 'Tổng cục Thuế', 'thuế thu nhập doanh nghiệp'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: '₫',
    grammarNotes: 'Vietnamese legal writing uses formal register with Sino-Vietnamese legal vocabulary. Tonal marks are essential for meaning.',
  },
  {
    code: 'id', whisperCode: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia',
    legalTerminology: ['penggugat', 'tergugat', 'putusan', 'banding', 'kasasi', 'pengadilan', 'hakim', 'advokat', 'jaksa', 'gugatan', 'jawaban', 'Mahkamah Agung', 'Mahkamah Konstitusi', 'peraturan pemerintah'],
    accountingTerminology: ['SAK', 'IFRS', 'PPN', 'neraca', 'laporan laba rugi', 'akuntan publik', 'Direktorat Jenderal Pajak', 'PPh', 'audit', 'laporan keuangan'],
    dateFormat: 'DD/MM/YYYY', currencySymbol: 'Rp',
    grammarNotes: 'Indonesian legal writing uses formal Bahasa Indonesia. No verb conjugation but formal prefixes/suffixes are important (me-, ber-, pe-, ke-an).',
  },
];

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find(l => l.code === code) || LANGUAGES.find(l => l.code === code.split('-')[0]);
}

export function getWhisperPromptForLanguage(code: string): string {
  const lang = getLanguage(code);
  if (!lang) return 'Professional dictation transcription.';
  const terms = [...lang.legalTerminology.slice(0, 10), ...lang.accountingTerminology.slice(0, 6)].join(', ');
  return `Professional legal and accounting dictation in ${lang.name}. Key terms: ${terms}`;
}

export function getLanguagesByRegion(): Record<string, Language[]> {
  return {
    'English': LANGUAGES.filter(l => l.code.startsWith('en')),
    'European': LANGUAGES.filter(l => ['es', 'fr', 'de', 'it', 'nl', 'pl', 'sv'].includes(l.code)),
    'Portuguese': LANGUAGES.filter(l => l.code.startsWith('pt')),
    'Asian': LANGUAGES.filter(l => ['ja', 'ko', 'zh', 'th', 'vi', 'id'].includes(l.code)),
    'Other': LANGUAGES.filter(l => ['ar', 'hi', 'ru', 'tr'].includes(l.code)),
  };
}
