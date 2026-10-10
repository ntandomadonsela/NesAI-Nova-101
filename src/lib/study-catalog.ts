export const SCHOOL_LEVELS = ["Grade 10", "Grade 11", "Grade 12"] as const;
export const LEVELS = [...SCHOOL_LEVELS, "University"] as const;

const LANGUAGES = [
  "Afrikaans",
  "English",
  "isiNdebele",
  "isiXhosa",
  "isiZulu",
  "Sepedi",
  "Sesotho",
  "Setswana",
  "Siswati",
  "Tshivenda",
  "Xitsonga",
];
const LANGUAGE_SUBJECTS = LANGUAGES.flatMap((language) => [
  `${language} Home Language`,
  `${language} First Additional Language`,
  `${language} Second Additional Language`,
]);

// DBE FET/NSC subject options. The language variants cover the official language subjects.
export const SCHOOL_SUBJECTS = [
  "Accounting",
  "Agricultural Management Practices",
  "Agricultural Sciences",
  "Agricultural Technology",
  "Business Studies",
  "Civil Technology",
  "Computer Applications Technology",
  "Consumer Studies",
  "Dance Studies",
  "Design",
  "Dramatic Arts",
  "Economics",
  "Electrical Technology",
  "Engineering Graphics and Design",
  "Geography",
  "History",
  "Hospitality Studies",
  "Information Technology",
  "Life Orientation",
  "Life Sciences",
  "Mathematical Literacy",
  "Mathematics",
  "Mechanical Technology",
  "Music",
  "Physical Sciences",
  "Religion Studies",
  "Tourism",
  "Visual Arts",
  "South African Sign Language Home Language",
  ...LANGUAGE_SUBJECTS,
].sort((a, b) => a.localeCompare(b));

export const UNIVERSITY_SUBJECTS = [
  "Accounting",
  "Applied Mathematics",
  "Biochemistry",
  "Biology",
  "Business Management",
  "Calculus",
  "Chemistry",
  "Computer Networks",
  "Computer Science",
  "Data Science",
  "Economics",
  "Electrical Engineering",
  "Engineering Mathematics",
  "English Studies",
  "Finance",
  "Financial Accounting",
  "Information Systems",
  "Introduction to Law",
  "Marketing",
  "Microeconomics",
  "Macroeconomics",
  "Nursing Science",
  "Physics",
  "Psychology",
  "Research Methods",
  "Statistics",
  "Taxation",
];

export const DEGREE_SUGGESTIONS = [
  "BA",
  "BCom",
  "BCom Accounting",
  "BCom Economics",
  "BCom Law",
  "BEd",
  "BEng / BSc Engineering",
  "LLB",
  "BSc",
  "BSc Computer Science",
  "BSc Data Science",
  "BSc Nursing",
  "MBChB / Medicine",
  "Diploma",
  "Higher Certificate",
  "Other degree or qualification",
];

export function subjectsForLevel(level: string) {
  return level === "University" ? UNIVERSITY_SUBJECTS : SCHOOL_SUBJECTS;
}
