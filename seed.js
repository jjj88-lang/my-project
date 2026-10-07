// Pre-Med Ledger — starting data built from Justin's resume (Oct 2026) and high-school transcript.
// Loaded automatically on first run when the page saves to this browser; on the claude.ai artifact the
// same records are written to the shared database instead. Hour entries marked "estimated" are derived
// from the weekly commitments on the resume: replace them with real records where you have them.
(function () {
  'use strict';
  const EST = 'Estimated from the resume commitment; replace with exact records if you have them.';
  const now = '2026-10-07T12:00:00.000Z';
  const stamp = d => Object.assign({ createdAt: now, updatedAt: now }, d);

  const activities = [
    stamp({ id: 'act-stormont', name: 'Stormont Vail Health', org: 'Stormont Vail Health', role: 'Perioperative Hospital Volunteer', category: 'clinical', amcasType: 'Community Service/Volunteer – Medical/Clinical', status: 'Completed', location: 'Topeka, KS', start: '2022-10-01', end: '2026-08-15', ongoing: false, hoursPerWeek: 3, weeksPerYear: 47,
      contactName: '', contactTitle: 'Volunteer Services', contactEmail: '', contactPhone: '',
      description: 'Acted as a clinical liaison for 3,000+ patients in the perioperative and discharge areas, gaining firsthand insight into how rural geographical barriers and transportation logistics impact post-surgical recovery.',
      bullets: 'Acted as a clinical liaison for 3,000+ patients in the perioperative and discharge areas, gaining firsthand insight into how rural geographical barriers and transportation logistics impact post-surgical recovery.',
      mostMeaningful: true, meaningfulEssay: '', tradition: '', startedInHS: true, includeAmcas: true, notes: 'Add the volunteer coordinator\'s name and email before you lose touch. Consider continuing during summers home.' }),
    stamp({ id: 'act-shadowing', name: 'Surgery & Anesthesiology Shadowing', org: 'Stormont Vail Health', role: 'Clinical Shadowing', category: 'shadowing', amcasType: 'Physician Shadowing/Clinical Observation', status: 'Completed', location: 'Topeka, KS', start: '2024-08-15', end: '2026-08-15', ongoing: false, hoursPerWeek: 2, weeksPerYear: 32,
      contactName: '', contactTitle: '', contactEmail: '', contactPhone: '',
      description: 'Observed surgeons and anesthesiologists across orthopedic, general surgical, and other perioperative cases, developing an interest in surgical care and physician decision-making.',
      bullets: 'Observed surgeons and anesthesiologists across orthopedic, general surgical, and other perioperative cases, developing an interest in surgical care and physician decision-making.',
      mostMeaningful: false, meaningfulEssay: '', tradition: '', startedInHS: true, includeAmcas: true, notes: 'Record each physician\'s name and specialty: AMCAS and interviewers ask. Add a primary care physician next (family medicine, internal medicine or pediatrics).' }),
    stamp({ id: 'act-futureframe', name: 'Future Frame', org: 'Future Frame', role: 'Co-Founder & Director', category: 'leadership', amcasType: 'Leadership – Not Listed Elsewhere', status: 'Completed', location: 'Topeka, KS', start: '2024-09-01', end: '2026-05-23', ongoing: false, hoursPerWeek: 2, weeksPerYear: 30,
      contactName: '', contactTitle: '', contactEmail: '', contactPhone: '',
      description: 'Co-founded and led a 31-member mentoring organization serving 500+ students with ADHD, learning disabilities, and executive-function challenges; expanded programming to a local middle school. Overhauled operations by establishing an accountable mentor pipeline with the National Honor Society.',
      bullets: 'Co-founded and led a 31-member mentoring organization serving 500+ students with ADHD, learning disabilities, and executive-function challenges; expanded programming to a local middle school.\nOverhauled operational structure by establishing a highly accountable mentor pipeline with the National Honor Society, shifting the program from well-intentioned volunteerism to a reliable support system.',
      mostMeaningful: true, meaningfulEssay: '', tradition: '', startedInHS: true, includeAmcas: true, notes: 'If the organization keeps running without you, note who leads it now; sustainability is a strong interview point.' }),
    stamp({ id: 'act-patch', name: 'PATCH (Pre-Professional Association Toward Careers in Health)', org: 'Cornell University', role: 'Member', category: 'club', amcasType: 'Extracurricular Activities', status: 'Active', location: 'Ithaca, NY', start: '2026-08-24', end: '', ongoing: true, hoursPerWeek: 1, weeksPerYear: 30,
      contactName: '', contactTitle: '', contactEmail: '', contactPhone: '', description: '', bullets: '', mostMeaningful: false, meaningfulEssay: '', tradition: '', startedInHS: false, includeAmcas: true, notes: 'Aim for a board position by sophomore year; a title turns a club into a leadership entry.' }),
    stamp({ id: 'act-kdsap', name: 'KDSAP (Kidney Disease Screening & Awareness Program)', org: 'Cornell University', role: 'Member', category: 'club', amcasType: 'Extracurricular Activities', status: 'Active', location: 'Ithaca, NY', start: '2026-08-24', end: '', ongoing: true, hoursPerWeek: 1, weeksPerYear: 30,
      contactName: '', contactTitle: '', contactEmail: '', contactPhone: '', description: '', bullets: '', mostMeaningful: false, meaningfulEssay: '', tradition: '', startedInHS: false, includeAmcas: true, notes: 'Screening events where you take blood pressure or counsel patients are clinical volunteering. Create a separate "KDSAP screenings" clinical activity and log those hours there.' }),
    stamp({ id: 'act-kasa', name: 'KASA (Korean American Students Association)', org: 'Cornell University', role: 'Member', category: 'club', amcasType: 'Extracurricular Activities', status: 'Active', location: 'Ithaca, NY', start: '2026-08-24', end: '', ongoing: true, hoursPerWeek: 0.5, weeksPerYear: 30,
      contactName: '', contactTitle: '', contactEmail: '', contactPhone: '', description: '', bullets: '', mostMeaningful: false, meaningfulEssay: '', tradition: '', startedInHS: false, includeAmcas: true, notes: '' }),
    stamp({ id: 'act-restaurant-research', name: 'Cost Pass-Through in the Restaurant Industry Before and After COVID-19', org: 'Independent study, advised by Sungkyu Kwak', role: 'First Author', category: 'research', amcasType: 'Research/Lab', status: 'Completed', location: 'Topeka, KS', start: '2024-04-01', end: '2024-10-31', ongoing: false, hoursPerWeek: 0, weeksPerYear: 52,
      contactName: 'Sungkyu Kwak', contactTitle: 'Research advisor', contactEmail: '', contactPhone: '',
      description: 'Designed an independent study using surveys of Topeka restaurant owners and federal economic data to examine how rising costs affected restaurant prices before and after COVID-19; published as first author in the Journal of Student Research.',
      bullets: 'Designed an independent study using surveys of Topeka restaurant owners and federal economic data to examine how rising costs affected restaurant prices before and after COVID-19; published as first author in the Journal of Student Research.',
      mostMeaningful: false, meaningfulEssay: '', tradition: '', startedInHS: true, includeAmcas: true, notes: 'Add total hours once you reconstruct them (survey design, data collection, writing, revisions).' }),
    stamp({ id: 'act-trustrag', name: 'TrustRAG: Reliability of Retrieval-Augmented Generation for Clinical Decision Support', org: 'Remote research project', role: 'Student Researcher, Data & Experiment Co-Lead', category: 'research', amcasType: 'Research/Lab', status: 'Active', location: 'Remote', start: '2026-05-01', end: '', ongoing: true, hoursPerWeek: 0, weeksPerYear: 52,
      contactName: '', contactTitle: 'Principal investigator', contactEmail: '', contactPhone: '',
      description: 'Co-led experiments evaluating the reliability of retrieval-augmented AI for clinical question answering; identified reproducible answer-position bias and citation failures.',
      bullets: 'Co-led experiments evaluating the reliability of retrieval-augmented AI for clinical question answering; identified reproducible answer-position bias and citation failures.',
      mostMeaningful: false, meaningfulEssay: '', tradition: '', startedInHS: true, includeAmcas: true, notes: 'Set your typical hours per week and start logging sessions; research hours are the easiest to lose track of.' }),
    stamp({ id: 'act-yuki', name: 'Yuki Restaurant of Japan', org: 'Yuki Restaurant of Japan', role: 'Server, Busser, Hibachi Chef, Sushi Chef', category: 'work', amcasType: 'Paid Employment – Not Medical/Clinical', status: 'Active', location: 'Topeka, KS', start: '2021-02-01', end: '', ongoing: true, hoursPerWeek: 12, weeksPerYear: 48,
      contactName: '', contactTitle: 'Owner / manager', contactEmail: '', contactPhone: '',
      description: 'Prepared and served 500+ hibachi meals in front of customers, balancing precise food preparation, live interaction, and rapid adaptation in a high-pressure environment. Trained 40+ new hires across front- and back-of-house roles within a multilingual team.',
      bullets: 'Prepared and served 500+ hibachi meals directly in front of customers, balancing precise food preparation, live interaction, and rapid adaptation in a high-pressure environment.\nTrained 40+ new hires across front- and back-of-house roles, adapting instruction to different experience levels and collaborating within a multilingual team.',
      mostMeaningful: false, meaningfulEssay: '', tradition: 'work', traditionSite: 'Off campus', endorsement: 'To request', startedInHS: true, includeAmcas: true, notes: 'Seasonal (breaks and summers). Only on-the-books hours worked during the academic year (including fall, winter and spring breaks at home) count toward the Cornell Tradition work requirement; summer hours do not. Off-campus work needs a supervisor endorsement each year.' }),
  ];

  const logs = [
    // Stormont Vail: 3 hrs/wk × 47 wks/yr
    stamp({ id: 'log-stormont-1', activityId: 'act-stormont', date: '2022-10-01', endDate: '2023-05-31', hours: 95, note: EST, physician: '', specialty: '', setting: 'Perioperative and discharge areas', verifiedBy: '' }),
    stamp({ id: 'log-stormont-2', activityId: 'act-stormont', date: '2023-06-01', endDate: '2024-05-31', hours: 141, note: EST, physician: '', specialty: '', setting: 'Perioperative and discharge areas', verifiedBy: '' }),
    stamp({ id: 'log-stormont-3', activityId: 'act-stormont', date: '2024-06-01', endDate: '2025-05-31', hours: 141, note: EST, physician: '', specialty: '', setting: 'Perioperative and discharge areas', verifiedBy: '' }),
    stamp({ id: 'log-stormont-4', activityId: 'act-stormont', date: '2025-06-01', endDate: '2026-05-23', hours: 138, note: EST, physician: '', specialty: '', setting: 'Perioperative and discharge areas', verifiedBy: '' }),
    stamp({ id: 'log-stormont-5', activityId: 'act-stormont', date: '2026-05-24', endDate: '2026-08-15', hours: 36, note: 'Summer after graduation. ' + EST, physician: '', specialty: '', setting: 'Perioperative and discharge areas', verifiedBy: '' }),
    // Shadowing: 2 hrs/wk × 32 wks/yr
    stamp({ id: 'log-shadow-1', activityId: 'act-shadowing', date: '2024-08-15', endDate: '2025-05-31', hours: 64, note: EST + ' Fill in physician names and specialties.', physician: '', specialty: 'Surgery / Anesthesiology', setting: 'Operating room', verifiedBy: '' }),
    stamp({ id: 'log-shadow-2', activityId: 'act-shadowing', date: '2025-06-01', endDate: '2026-05-23', hours: 64, note: EST + ' Fill in physician names and specialties.', physician: '', specialty: 'Surgery / Anesthesiology', setting: 'Operating room', verifiedBy: '' }),
    stamp({ id: 'log-shadow-3', activityId: 'act-shadowing', date: '2026-05-24', endDate: '2026-08-15', hours: 16, note: 'Summer after graduation. ' + EST, physician: '', specialty: 'Surgery / Anesthesiology', setting: 'Operating room', verifiedBy: '' }),
    // Future Frame: 2 hrs/wk × 30 wks/yr
    stamp({ id: 'log-ff-1', activityId: 'act-futureframe', date: '2024-09-01', endDate: '2025-05-31', hours: 60, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    stamp({ id: 'log-ff-2', activityId: 'act-futureframe', date: '2025-08-15', endDate: '2026-05-23', hours: 60, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    // Yuki: 12 hrs/wk × 48 wks/yr, seasonal
    stamp({ id: 'log-yuki-2021', activityId: 'act-yuki', date: '2021-02-01', endDate: '2021-12-31', hours: 528, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    stamp({ id: 'log-yuki-2022', activityId: 'act-yuki', date: '2022-01-01', endDate: '2022-12-31', hours: 576, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    stamp({ id: 'log-yuki-2023', activityId: 'act-yuki', date: '2023-01-01', endDate: '2023-12-31', hours: 576, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    stamp({ id: 'log-yuki-2024', activityId: 'act-yuki', date: '2024-01-01', endDate: '2024-12-31', hours: 576, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    stamp({ id: 'log-yuki-2025', activityId: 'act-yuki', date: '2025-01-01', endDate: '2025-12-31', hours: 576, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    stamp({ id: 'log-yuki-2026a', activityId: 'act-yuki', date: '2026-01-01', endDate: '2026-05-23', hours: 222, note: EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
    stamp({ id: 'log-yuki-2026b', activityId: 'act-yuki', date: '2026-05-24', endDate: '2026-08-15', hours: 132, note: 'Summer after graduation. ' + EST, physician: '', specialty: '', setting: '', verifiedBy: '' }),
  ];

  const courses = [
    stamp({ id: 'crs-biomg1350', term: 'Fall 2026', code: 'BIOMG 1350', title: 'Cell and Developmental Biology', credits: 3, grade: 'IP', bcpm: true, prereq: '', notes: '' }),
    stamp({ id: 'crs-chem2070', term: 'Fall 2026', code: 'CHEM 2070', title: 'General Chemistry I', credits: 4, grade: 'IP', bcpm: true, prereq: '', notes: '' }),
    stamp({ id: 'crs-chem2071', term: 'Fall 2026', code: 'CHEM 2071', title: 'General Chemistry I Laboratory', credits: 1, grade: 'IP', bcpm: true, prereq: '', notes: 'Corequisite lab for CHEM 2070. Taking CHEM 2070/2071 forfeits AP Chemistry credit.' }),
  ];
  const apCourses = ['AP Biology', 'AP Chemistry', 'AP Physics 1', 'AP Calculus BC', 'AP Statistics', 'AP Computer Science Principles', 'AP Environmental Science', 'AP Literature and Composition', 'AP European History', 'AP US History', 'AP Art History', 'AP Microeconomics', 'AP Comparative Government'];
  apCourses.forEach((t, i) => courses.push(stamp({ id: 'crs-ap-' + (i + 1), term: 'AP / transfer credit', code: t.toUpperCase().replace('AP ', 'AP '), title: t + ' (Washburn Rural HS)', credits: 0, grade: 'AP', bcpm: /Biology|Chemistry|Physics|Calculus|Statistics/.test(t), prereq: 'none', notes: (/Biology/.test(t) ? 'Bio Sci majors cannot use AP Biology credit toward major requirements; it can count toward the 120 graduation credits. ' : /Chemistry/.test(t) ? 'AP Chemistry credit is forfeited if you take CHEM 2070/2071 (kept only with CHEM 2150). ' : /Statistics/.test(t) ? 'A score of 5 may apply toward the major statistics requirement (confirm with the Bio Sci office). ' : '') + 'Enter the Cornell credits awarded once AP scores post; AMCAS lists AP credit but excludes it from the GPA.' })));

  const awards = [
    stamp({ id: 'awd-ge-reagan', name: 'GE-Reagan Foundation Scholarship', org: 'Ronald Reagan Presidential Foundation & Institute', level: 'National', date: '2026-04-01', amount: 40000, selectivity: '1 of 10 students nationally from 13,000 applicants', description: 'Selected for leadership, drive, integrity, and citizenship; $40,000 in renewable scholarship funding.' }),
    stamp({ id: 'awd-ad-astra', name: 'United Kaw Valley Ad Astra Youth Volunteer Award', org: 'United Way of Kaw Valley', level: 'Local', date: '', amount: 0, selectivity: '', description: 'Recognized for exceptional sustained community service and measurable program outcomes in Shawnee County. Add the award date.' }),
    stamp({ id: 'awd-tradition', name: 'Cornell Tradition Fellowship', org: 'Cornell University', level: 'University', date: '2026-08-24', amount: 0, selectivity: '', description: 'Fellowship recognizing work, service and academics; carries annual work and service hour commitments tracked on the dashboard.' }),
    stamp({ id: 'awd-bio-scholars', name: 'Biology Scholars Program', org: 'Cornell University, CALS', level: 'University', date: '2026-08-24', amount: 0, selectivity: '', description: 'Selected for the Biology Scholars Program.' }),
  ];

  const pubs = [
    stamp({ id: 'pub-jsr-2024', title: 'Cost Pass-Through to Prices in the Restaurant Industry Before and After COVID-19', type: 'Publication', role: 'First author', venue: 'Journal of Student Research, 13(4)', date: '2024-11-30', advisor: 'Sungkyu Kwak', activityId: 'act-restaurant-research', citation: 'Jeon, J. (2024). Cost Pass-Through to Prices in the Restaurant Industry Before and After COVID-19. Journal of Student Research, 13(4).', url: '', notes: 'Confirm the publication month and add the DOI.' }),
    stamp({ id: 'pub-delay-discounting', title: 'Behavioral Predictors of Delay Discounting', type: 'Manuscript (under review)', role: 'Co-author', venue: '', date: '', advisor: '', activityId: '', citation: '', url: '', notes: 'Update the status and venue when the decision arrives.' }),
    stamp({ id: 'pub-nanoemulsion-review', title: 'Review of cationic nanoemulsions for cervicovaginal mRNA delivery', type: 'Manuscript (in prep)', role: 'Contributing author', venue: '', date: '', advisor: '', activityId: '', citation: '', url: '', notes: 'Confirm the current status.' }),
  ];

  const letters = [
    stamp({ id: 'ltr-kwak', name: 'Sungkyu Kwak', title: 'Research advisor', type: 'Research mentor', status: 'Potential', email: '', context: 'Advised the Journal of Student Research paper (2024).', askedOn: '', dueOn: '', notes: 'Send a short update each semester so the relationship stays warm.' }),
  ];

  const resumeText = [
    'JUSTIN JEON',
    'jjj88@cornell.edu | 785-409-0871 | linkedin.com/in/justin-jeon-030b39373',
    '',
    'EDUCATION',
    'Cornell University, College of Agriculture and Life Sciences — Ithaca, NY',
    'Bachelor of Science, Biological Sciences | Aug 2026 – May 2030 (Expected)',
    'Cornell Tradition Fellow; Biology Scholars Program',
    'Relevant Coursework (Fall 2026): BIOMG 1350; CHEM 2070/2071',
    'Washburn Rural High School — Topeka, Kansas | Aug 2022 – May 2026',
    'Academic Achievements: Rank 2/441 | Weighted GPA 4.791 | Unweighted GPA 4.0/4.0 | ACT 35',
    '',
    'HONORS & AWARDS',
    'GE-Reagan Foundation Scholarship Program Recipient',
    '  • Selected as 1 of 10 students nationally from 13,000 applicants for leadership, drive, integrity, and citizenship; awarded $40,000 in renewable scholarship funding.',
    'United Kaw Valley Ad Astra Youth Volunteer Award',
    '  • Recognized for exceptional sustained community service and measurable program outcomes in Shawnee County.',
    '',
    'CLINICAL EXPERIENCE',
    'Stormont Vail Health — Topeka, KS',
    'Perioperative Hospital Volunteer | 3 hrs/wk, 47 wks/yr | Oct 2022 – Aug 2026',
    '  • Acted as a clinical liaison for 3,000+ patients in the perioperative and discharge areas, gaining firsthand insight into how rural geographical barriers and transportation logistics impact post-surgical recovery.',
    'Surgery / Anesthesiology — Topeka, KS',
    'Clinical Shadowing | 2 hrs/wk, 32 wks/yr | Aug 2024 – Aug 2026',
    '  • Observed surgeons and anesthesiologists across orthopedic, general surgical, and other perioperative cases, developing an interest in surgical care and physician decision-making.',
    '',
    'LEADERSHIP & EXTRACURRICULAR EXPERIENCE',
    'Future Frame — Topeka, KS',
    'Co-Founder & Director | 2 hrs/wk, 30 wks/yr | Sep 2024 – May 2026',
    '  • Co-founded and led a 31-member mentoring organization serving 500+ students with ADHD, learning disabilities, and executive-function challenges; expanded programming to a local middle school.',
    '  • Overhauled operational structure by establishing a highly accountable mentor pipeline with the National Honor Society, shifting the program from well-intentioned volunteerism to a reliable support system.',
    'Pre-Professional Association Toward Careers in Health (PATCH) | Member (1 hr/wk) | Ithaca, NY | Aug 2026 – Present',
    'Kidney Disease Screening & Awareness Program (KDSAP) | Member (1 hr/wk) | Ithaca, NY | Aug 2026 – Present',
    'Korean American Students Association (KASA) | Member (.5 hr/wk) | Ithaca, NY | Aug 2026 – Present',
    '',
    'RESEARCH EXPERIENCE',
    'Cost Pass-Through to Prices in the Restaurant Industry Before and After COVID-19 — Topeka, Kansas',
    'First Author, Journal of Student Research 13(4), 2024; advised by Sungkyu Kwak | Apr 2024 – Oct 2024',
    '  • Designed an independent study using surveys of Topeka restaurant owners and federal economic data to examine how rising costs affected restaurant prices before and after COVID-19; published as first author in the Journal of Student Research.',
    'TrustRAG: Reliability of Retrieval-Augmented Generation for Clinical Decision Support — Remote',
    'Student Researcher: Data & Experiment Co-Lead | May 2026 – Present',
    '  • Co-led experiments evaluating the reliability of retrieval-augmented AI for clinical question answering; identified reproducible answer-position bias and citation failures.',
    'Additional research: Co-author, Behavioral Predictors of Delay Discounting (manuscript under review); contributing author, review of cationic nanoemulsions for cervicovaginal mRNA delivery.',
    '',
    'WORK EXPERIENCE',
    'Yuki Restaurant of Japan — Topeka, KS',
    'Server | Busser | Hibachi Chef | Sushi Chef | 12 hrs/wk, 48 wks/yr | Feb 2021 – Present (seasonal)',
    '  • Prepared and served 500+ hibachi meals directly in front of customers, balancing precise food preparation, live interaction, and rapid adaptation in a high-pressure environment.',
    '  • Trained 40+ new hires across front- and back-of-house roles, adapting instruction to different experience levels and collaborating within a multilingual team.',
    '',
    'SKILLS & INTERESTS',
    'Languages: English; conversational Korean',
    'Interests: Hibachi & sushi cooking, soccer goalkeeping, trivia, Tottenham Hotspur',
  ].join('\n');

  const resume = [stamp({ id: 'res-v1', label: 'October 2026 (uploaded resume)', date: '2026-10-07', text: resumeText })];

  const settings = {
    countFrom: '2026-05-23',
    profile: {
      name: 'Justin Jeon', email: 'jjj88@cornell.edu', phone: '785-409-0871', linkedin: 'linkedin.com/in/justin-jeon-030b39373',
      school: 'Cornell University, College of Agriculture and Life Sciences', major: 'B.S. Biological Sciences', classYear: 2030, collegeStart: '2026-08-24',
      programs: ['Cornell Tradition Fellow', 'Biology Scholars Program'],
      hsSummary: 'Washburn Rural High School, Topeka, KS (2022–2026): rank 2 of 441, unweighted GPA 4.0, ACT 35.',
      languages: 'English; conversational Korean', certifications: '', interests: 'Hibachi & sushi cooking, soccer goalkeeping, trivia, Tottenham Hotspur',
      mcatDate: '', mcatScore: '', gapYear: false,
    },
  };

  window.PMT_SEED = { activities, logs, courses, awards, pubs, letters, journal: [], resume, settings };
})();
