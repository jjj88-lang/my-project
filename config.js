// Pre-Med Ledger — configuration.
// Everything here is a default. Goals, counting dates and Tradition targets can be changed in
// Settings inside the app; this file only sets the starting values. Sources are noted where a
// number comes from a published rule (AAMC AMCAS guides, Cornell Tradition policies, Cornell HPAC).
(function () {
  'use strict';

  const CONFIG = {
    appName: 'Pre-Med Ledger',
    dataVersion: 1,

    student: {
      name: 'Justin Jeon',
      school: 'Cornell University, College of Agriculture and Life Sciences',
      major: 'B.S. Biological Sciences',
      classYear: 2030,
      collegeStart: '2026-08-24',
      hsGraduation: '2026-05-23',
      programs: ['Cornell Tradition Fellow', 'Biology Scholars Program'],
      email: 'jjj88@cornell.edu',
    },

    // The buckets the dashboard counts. `amcas` lists the AMCAS experience types that usually
    // map to each bucket, so an activity can be exported later.
    categories: [
      { key: 'clinical',   label: 'Clinical experience',      short: 'Clinical',   desc: 'Patient-facing roles, paid or volunteer (hospital volunteer, scribe, EMT, CNA, hospice). Close enough to the patient to be part of their care.',
        amcas: ['Community Service/Volunteer – Medical/Clinical', 'Paid Employment – Medical/Clinical'] },
      { key: 'shadowing',  label: 'Physician shadowing',      short: 'Shadowing',  desc: 'Observation only. Log the physician, specialty and setting for every session; include a primary care physician.',
        amcas: ['Physician Shadowing/Clinical Observation'] },
      { key: 'service',    label: 'Non-clinical volunteering', short: 'Service',   desc: 'Community service without patient contact (mentoring, food bank, crisis line, tutoring for free).',
        amcas: ['Community Service/Volunteer – Not Medical/Clinical', 'Community Health Advocacy'] },
      { key: 'research',   label: 'Research',                 short: 'Research',   desc: 'Lab or independent research, paid or unpaid. One lab for two years reads better than four short stints.',
        amcas: ['Research/Lab'] },
      { key: 'leadership', label: 'Leadership',               short: 'Leadership', desc: 'Positions where you led people or an organization. Record headcounts and outcomes.',
        amcas: ['Leadership – Not Listed Elsewhere'] },
      { key: 'teaching',   label: 'Teaching & tutoring',      short: 'Teaching',   desc: 'TA, tutoring, mentoring in an instructional role.',
        amcas: ['Teaching/Tutoring/Teaching Assistant'] },
      { key: 'work',       label: 'Paid work (non-clinical)', short: 'Work',       desc: 'Jobs without patient contact. Academic-year hours count toward Cornell Tradition work.',
        amcas: ['Paid Employment – Not Medical/Clinical'] },
      { key: 'club',       label: 'Clubs & extracurriculars', short: 'Clubs',      desc: 'Student organizations, pre-health groups, cultural associations.',
        amcas: ['Extracurricular Activities'] },
      { key: 'hobby',      label: 'Hobbies & athletics',      short: 'Hobbies',    desc: 'Sports, arts, cooking, anything that shows who you are outside medicine. Long-standing ones only.',
        amcas: ['Hobbies', 'Intercollegiate Athletics', 'Artistic Endeavors'] },
      { key: 'other',      label: 'Other',                    short: 'Other',      desc: 'Internships, summer programs, certifications, anything else.',
        amcas: ['Other', 'Conferences Attended', 'Military Service'] },
    ],

    // AMCAS Work & Activities experience types (19 types; "Community Health Advocacy" replaced
    // "Social Justice/Advocacy" in the 2027 application).
    amcasTypes: [
      'Artistic Endeavors',
      'Community Health Advocacy',
      'Community Service/Volunteer – Medical/Clinical',
      'Community Service/Volunteer – Not Medical/Clinical',
      'Conferences Attended',
      'Extracurricular Activities',
      'Hobbies',
      'Honors/Awards/Recognition',
      'Intercollegiate Athletics',
      'Leadership – Not Listed Elsewhere',
      'Military Service',
      'Other',
      'Paid Employment – Medical/Clinical',
      'Paid Employment – Not Medical/Clinical',
      'Physician Shadowing/Clinical Observation',
      'Presentations/Posters',
      'Publications',
      'Research/Lab',
      'Teaching/Tutoring/Teaching Assistant',
    ],
    amcasTypeAliases: { 'Social Justice/Advocacy': 'Community Health Advocacy', 'Honors/Awards/Recognitions': 'Honors/Awards/Recognition' },

    amcas: {
      maxEntries: 15,
      mostMeaningful: 3,
      nameChars: 60,            // reported by advisors as the AMCAS interface limit; confirm in the live form
      personalStatementChars: 5300,
      otherImpactfulChars: 1325,
      descriptionChars: 700,
      meaningfulChars: 1325,
      dateRangesPerEntry: 4,
    },

    // Default hour goals by the time the application goes in (June 2029 for a straight-through plan).
    // Advising consensus: clinical 150 floor / 300 competitive / 500+; shadowing 50–100 (Cornell HPAC says
    // 25–200); non-clinical service 150 / 300+; research 100–200 solid, 400+ for research-heavy schools;
    // leadership ~100–200. Teaching has no benchmark, so it starts hidden (0).
    defaultGoals: {
      clinical: 300,
      shadowing: 75,
      service: 300,
      research: 400,
      leadership: 150,
      teaching: 0,
    },

    // Cornell Tradition fellowship, per academic year (Cornell Tradition policies, 2026):
    // 100 h paid legal work + 100 h service (at least 15 h community service, rest community or campus)
    // + 50 "flex" h of either = 250 h, and a 2.3 cumulative GPA. Hours count only inside the academic
    // year (the Sunday before fall classes through the end of spring classes, breaks included); summer
    // hours never count; research and for-credit activities never count; off-campus hours need a
    // supervisor endorsement. Edit the exact window dates each year when the program announces them.
    tradition: {
      workHours: 100,
      serviceHours: 100,
      communityHours: 15,
      flexHours: 50,
      totalHours: 250,
      minGpa: 2.3,
      windows: [
        { label: '2026–27', from: '2026-08-23', to: '2027-05-09' },
        { label: '2027–28', from: '2027-08-22', to: '2028-05-07' },
        { label: '2028–29', from: '2028-08-20', to: '2029-05-06' },
        { label: '2029–30', from: '2029-08-19', to: '2030-05-05' },
      ],
    },
    traditionKinds: [
      { value: '', label: 'Does not count' },
      { value: 'work', label: 'Paid work (on the books)' },
      { value: 'community', label: 'Community service (benefits people outside Cornell)' },
      { value: 'campus', label: 'Campus service (benefits Cornell students or the university)' },
    ],
    endorsementStates: ['', 'Not needed (on-campus payroll)', 'To request', 'Requested', 'Completed'],

    // Grade scales. Cornell gives A+ 4.3; AMCAS caps A+ at 4.0 and may treat a U (fail under S/U) as 0.0.
    gradeScales: {
      cornell: { 'A+': 4.3, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0 },
      amcas:   { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0, 'U': 0 },
    },
    // Grades that never enter the Cornell GPA.
    nonGpaGrades: ['IP', 'S', 'U', 'SX', 'UX', 'W', 'INC', 'NGR', 'AP', 'TR', 'R', 'V'],
    gradeOptions: ['IP', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'S', 'U', 'SX', 'UX', 'W', 'INC', 'AP', 'TR'],
    // Latin honors on final cumulative Cornell GPA (standardized from the Fall 2026 conferral).
    latinHonors: [{ label: 'summa cum laude', min: 4.0 }, { label: 'magna cum laude', min: 3.75 }, { label: 'cum laude', min: 3.5 }],

    // Subject prefixes AMCAS classifies as BCPM (Biology, Chemistry, Physics, Math) by primary content.
    // Not BCPM: PSYCH, CS/INFO, NS (nutrition = health sciences), BME/ENGRD (engineering), ANSC/NTRES/PLSCI (natural sciences).
    bcpmPrefixes: ['BIO', 'BIOG', 'BIOMG', 'BIOEE', 'BIONB', 'BIOMI', 'BIOAP', 'BIOSM', 'ENTOM', 'PLBIO', 'CHEM', 'PHYS', 'AEP', 'ASTRO', 'MATH', 'STSCI', 'BTRY'],

    // Term ordering: 'Fall 2026' → 2026.3, 'Spring 2027' → 2027.1, 'Summer 2027' → 2027.2, 'Winter 2027' → 2027.0
    termSeasons: { Winter: 0, Spring: 1, Summer: 2, Fall: 3 },

    // Standard MD prerequisites and the Cornell courses that satisfy them (Cornell HPAC academic preparation list).
    prereqs: [
      { key: 'bio',     label: 'Biology with lab (1 year)',          hint: 'BIOMG 1350 + BIOG 1440 or 1445 + BIOG 1500 lab', match: ['BIOMG 1350', 'BIOG 1440', 'BIOG 1445', 'BIOG 1500', 'BIOEE 1610', 'BIOEE 1611', 'BIOEE 1780'] },
      { key: 'genchem', label: 'General chemistry with lab (1 year)', hint: 'CHEM 2070 + 2071, CHEM 2080 + 2081 (or CHEM 2150)', match: ['CHEM 2070', 'CHEM 2071', 'CHEM 2080', 'CHEM 2081', 'CHEM 2090', 'CHEM 2150'] },
      { key: 'orgo',    label: 'Organic chemistry with lab (1 year)', hint: 'CHEM 3570 + 3580 (or 3590 + 3600) + CHEM 2510 lab. CHEM 1570 is not accepted for pre-med.', match: ['CHEM 3570', 'CHEM 3580', 'CHEM 3590', 'CHEM 3600', 'CHEM 2510', 'CHEM 3530'] },
      { key: 'biochem', label: 'Biochemistry',                        hint: 'BIOMG 3300, 3310 (+3320), or 3350', match: ['BIOMG 3300', 'BIOMG 3310', 'BIOMG 3320', 'BIOMG 3350'] },
      { key: 'physics', label: 'Physics with lab (1 year)',           hint: 'PHYS 1101 + 1102 (pre-med only) or PHYS 2207 + 2208 (also satisfies the Bio Sci major)', match: ['PHYS 1101', 'PHYS 1102', 'PHYS 2207', 'PHYS 2208', 'PHYS 1112', 'PHYS 1110', 'PHYS 2213'] },
      { key: 'math',    label: 'Calculus',                            hint: 'MATH 1106 or MATH 1110 (or 1910)', match: ['MATH 1106', 'MATH 1110', 'MATH 1120', 'MATH 1910', 'MATH 1920'] },
      { key: 'stats',   label: 'Statistics',                          hint: 'STSCI 2150 or BTRY 3010 preferred; also STSCI 2200, MATH 1710, AEM 2100, PSYCH 2500, SOC 3010', match: ['STSCI 2150', 'STSCI 2200', 'STSCI 2100', 'BTRY 3010', 'MATH 1710', 'AEM 2100', 'PSYCH 2500', 'SOC 3010', 'ECON 3130', 'PAM 2100'] },
      { key: 'writing', label: 'English / writing (2 semesters)',     hint: 'Two First-Year Writing Seminars (any department). Pin them to this slot in the course form.', match: ['WRIT', 'ENGL 1'], titleMatch: ['writing seminar', 'fws'] },
      { key: 'psych',   label: 'Psychology (for the MCAT)',           hint: 'PSYCH 1101', match: ['PSYCH 1101'] },
      { key: 'soc',     label: 'Sociology (for the MCAT)',            hint: 'SOC 1101 or DSOC 1101', match: ['SOC 1101', 'DSOC 1101'] },
    ],

    // Class of 2030, straight-through plan (AMCAS 2030 cycle, matriculate fall 2030). Items marked
    // `shift: true` move one year later when the gap-year option is on in Settings.
    milestones: [
      { key: 'explore-ct',   date: '2026-12-01', label: 'Finish the required Explore CT events',   detail: 'First-year Cornell Tradition fellows must attend all Explore CT orientation events this fall.' },
      { key: 'fresh-fall',   date: '2026-12-18', label: 'First semester ends',                     detail: 'Log every hour from day one. Go to office hours: letter writers start as professors who know your name.' },
      { key: 'bsp-1250',     date: '2027-01-19', label: 'BSP: enroll in the first-year seminar (BIOG 1200 or 1250; confirm with BSP)', detail: 'Biology Scholars Program first-year seminar, 1 credit S/U. Weekly 2-hour study group continues through sophomore year.' },
      { key: 'trad-reapp-1', date: '2027-03-25', label: 'Cornell Tradition re-application opens',  detail: 'Opens late March, due near the end of the academic year (one college page says June 30; confirm with tradition@cornell.edu). Off-campus work and service need supervisor endorsements.' },
      { key: 'summer-1',     date: '2027-05-30', label: 'Summer after first year',                 detail: 'Clinical hours, research, or a job. Summer hours do not count toward Tradition, so front-load Tradition hours during the year.' },
      { key: 'bsp-2200',     date: '2027-08-23', label: 'BSP: enroll in BIOG 2200 (sophomore fall seminar)', detail: '1 credit S/U, BSP members only.' },
      { key: 'soph-plan',    date: '2027-09-01', label: 'Sophomore year: settle into one research lab', detail: 'Two years in one lab reads better than four short stints.' },
      { key: 'bsp-sgl',      date: '2028-03-01', label: 'BSP: apply for Study Group Leader',       detail: 'Applications are in the spring of sophomore year; a year-long role taken for credit (BIOG 2401). Whether it is paid is unverified, which matters for Tradition work hours.' },
      { key: 'trad-reapp-2', date: '2028-03-25', label: 'Cornell Tradition re-application opens',  detail: 'Same as last year: list every job and service role, request endorsements early.' },
      { key: 'mcat-review',  date: '2028-06-01', label: 'Summer before junior year: MCAT content review', shift: true, detail: 'Finish general chemistry, organic chemistry, biochemistry, physics, psychology and sociology by fall 2028.' },
      { key: 'hpac-module',  date: '2028-10-01', label: 'Start the HPAC Application Module; ask letter writers', shift: true, detail: 'Cornell Health Professions Advising Center (HPAC) opens its Application Module in October of the year before you apply. Begin approaching the 2–5 people who will write for your Cornell Letter Packet.' },
      { key: 'mcat-reg',     date: '2028-10-20', label: '2029 MCAT registration opens',            shift: true, detail: 'Registration opens in late October; pick a March or April date before seats go.' },
      { key: 'privatefolio', date: '2029-01-15', label: 'Open a PrivateFolio account for the Cornell Letter Packet', shift: true, detail: 'January or February. HPAC assembles a cover letter plus 2–5 letters you choose and uploads the packet in the summer. Finish the Application Module assignments to book the spring coaching appointment.' },
      { key: 'fap',          date: '2029-01-10', label: 'Check AAMC Fee Assistance Program eligibility', shift: true, detail: 'Income-based; opens each January. Approval must come before MCAT registration to get the reduced fee, and it also reduces AMCAS fees. Confirm current rules at aamc.org.' },
      { key: 'mcat-prep',    date: '2029-01-08', label: 'Dedicated MCAT study block',               shift: true, detail: 'Plan about 300 hours over 3–4 months while carrying a lighter course load.' },
      { key: 'trad-reapp-3', date: '2029-03-25', label: 'Cornell Tradition re-application opens',  detail: 'Junior-year re-application.' },
      { key: 'mcat',         date: '2029-04-15', label: 'Take the MCAT (March–April)',              shift: true, detail: 'Scores take about 30 days. The last workable date is late May for a June submission.' },
      { key: 'letters-in',   date: '2029-05-01', label: 'Letters on file; request the Letter Packet', shift: true, detail: 'All letters in PrivateFolio, then request the Cornell Letter Packet from HPAC.' },
      { key: 'amcas-open',   date: '2029-05-03', label: 'AMCAS opens (first week of May)',          shift: true, detail: 'Start entering your 15 Work & Activities from the worksheet in this tracker.' },
      { key: 'amcas-submit', date: '2029-06-01', label: 'Submit AMCAS (first week of June)',        shift: true, detail: 'First submissions open late May; rolling admissions reward early, verified applications. Completed hours freeze here; later hours go in as "anticipated".' },
      { key: 'amcas-transmit', date: '2029-06-27', label: 'AMCAS transmits to schools',             shift: true, detail: 'Late June. Secondaries follow within 2–4 weeks.' },
      { key: 'secondaries',  date: '2029-07-15', label: 'Secondaries arrive',                      shift: true, detail: 'Return each within 14 days. Pre-write common prompts in June and July.' },
      { key: 'interviews',   date: '2029-09-15', label: 'Interview season begins',                 shift: true, detail: 'Runs September through March.' },
      { key: 'acceptances',  date: '2029-10-15', label: 'First MD acceptances may be issued',      shift: true, detail: 'MD schools may not accept regular applicants before October 15.' },
      { key: 'trad-reapp-4', date: '2030-03-25', label: 'Cornell Tradition senior-year re-application', detail: 'Final year of fellowship hours.' },
      { key: 'narrow-3',     date: '2030-04-15', label: 'Narrow to three acceptances',             shift: true, detail: 'AAMC protocol: hold at most three acceptances by April 15, one by April 30.' },
      { key: 'grad',         date: '2030-05-23', label: 'Cornell graduation',                      detail: 'Expected B.S. Biological Sciences.' },
      { key: 'matriculate',  date: '2030-08-01', label: 'Medical school begins',                   shift: true, detail: 'Straight-through plan. Turn on the gap-year option in Settings to shift the application milestones a year later.' },
    ],

    // Fields the tracker prompts for at log time, by category.
    logPrompts: {
      shadowing: ['physician', 'specialty', 'setting'],
      clinical: ['setting'],
    },
    primaryCareWords: ['family', 'internal medicine', 'pediatric', 'primary care', 'general practice', 'geriatric'],

    // Experience tags plus the AAMC premed competencies (2026 names) that essays and letters are read against.
    journalTags: ['Patient story', 'Lesson learned', 'Challenge', 'Why medicine', 'Idea for essay', 'Service Orientation', 'Empathy and Compassion', 'Understanding Others', 'Self-Awareness', 'Teamwork and Collaboration', 'Resilience and Adaptability', 'Ethical Responsibility', 'Interpersonal Skills', 'Oral Communication', 'Reliability and Dependability', 'Commitment to Learning and Growth', 'Critical Thinking', 'Scientific Inquiry'],
    certSuggestions: ['BLS/CPR (American Heart Association)', 'EMT-B', 'CNA', 'Phlebotomy', 'CITI human-subjects research training', 'HIPAA training', 'Immunization record / TB test'],

    letterTypes: ['Science faculty', 'Non-science faculty', 'Research mentor', 'Clinical supervisor', 'Volunteer supervisor', 'Employer', 'Other'],
    letterStatuses: ['Potential', 'Building relationship', 'Asked', 'Confirmed', 'Submitted'],

    pubTypes: ['Publication', 'Manuscript (under review)', 'Manuscript (in prep)', 'Poster', 'Oral presentation', 'Conference attended'],
    awardLevels: ['National', 'State / regional', 'University', 'College / department', 'Local', 'Other'],
    activityStatuses: ['Active', 'Completed', 'Planned', 'Paused'],
  };

  window.PMT_CONFIG = CONFIG;
})();
