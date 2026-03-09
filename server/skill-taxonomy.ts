/**
 * Skill Taxonomy for recruitment matching.
 *
 * Provides category-based skill families, related-skill lookup,
 * fuzzy matching, and free-text skill extraction.
 */

// ---------------------------------------------------------------------------
// 1. SKILL_TAXONOMY – map of skill families
// ---------------------------------------------------------------------------

export const SKILL_TAXONOMY: Record<string, string[]> = {
  // ── Web Frontend ─────────────────────────────────────────────────────
  "HTML/CSS": ["html", "html5", "css", "css3", "sass", "scss", "less", "tailwind", "tailwindcss", "bootstrap", "bulma", "styled-components", "postcss"],
  "JavaScript Frontend": ["javascript", "js", "typescript", "ts", "es6", "es2015", "ecmascript", "coffeescript"],
  "React": ["react", "reactjs", "react.js", "react native", "redux", "mobx", "next.js", "nextjs", "gatsby", "remix"],
  "Angular": ["angular", "angularjs", "angular.js", "rxjs", "ngrx", "angular material"],
  "Vue": ["vue", "vuejs", "vue.js", "vuex", "pinia", "nuxt", "nuxtjs", "nuxt.js"],
  "Svelte": ["svelte", "sveltekit", "svelte kit"],
  "Frontend Tooling": ["webpack", "vite", "rollup", "esbuild", "parcel", "babel", "eslint", "prettier", "storybook"],

  // ── Web Backend ──────────────────────────────────────────────────────
  "Node.js": ["node", "nodejs", "node.js", "express", "expressjs", "koa", "fastify", "nestjs", "hapi"],
  "Python Web": ["django", "flask", "fastapi", "pyramid", "tornado", "bottle", "starlette", "uvicorn"],
  "Ruby Web": ["ruby on rails", "rails", "ror", "sinatra", "ruby"],
  "PHP Web": ["php", "laravel", "symfony", "codeigniter", "wordpress", "drupal", "magento", "yii", "cakephp"],
  "Java Web": ["spring", "spring boot", "springboot", "java ee", "jakarta ee", "jsf", "struts", "dropwizard", "micronaut", "quarkus"],
  ".NET Web": [".net", "dotnet", "asp.net", "asp.net core", "blazor", "c#", "csharp", "entity framework", "ef core"],
  "Go Web": ["go", "golang", "gin", "echo", "fiber", "gorilla"],
  "Rust Web": ["rust", "actix", "rocket", "axum", "warp", "tokio"],
  "Elixir Web": ["elixir", "phoenix", "erlang", "otp"],
  "GraphQL": ["graphql", "apollo", "relay", "hasura", "graphql api"],
  "API Design": ["rest", "restful", "rest api", "openapi", "swagger", "grpc", "protobuf", "soap", "json api", "api gateway"],

  // ── Mobile ───────────────────────────────────────────────────────────
  "iOS Development": ["ios", "swift", "swiftui", "objective-c", "objc", "uikit", "xcode", "cocoapods", "spm"],
  "Android Development": ["android", "kotlin", "java android", "jetpack compose", "android studio", "gradle"],
  "Cross-Platform Mobile": ["react native", "flutter", "dart", "xamarin", "ionic", "cordova", "capacitor", "maui", ".net maui"],
  "Mobile General": ["mobile development", "mobile app", "pwa", "progressive web app", "responsive design"],

  // ── Data & ML ────────────────────────────────────────────────────────
  "Data Science": ["data science", "data analysis", "data analytics", "pandas", "numpy", "scipy", "jupyter", "matplotlib", "seaborn", "plotly"],
  "Machine Learning": ["machine learning", "ml", "deep learning", "neural networks", "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "xgboost", "lightgbm"],
  "NLP": ["nlp", "natural language processing", "spacy", "nltk", "hugging face", "huggingface", "transformers", "bert", "gpt", "llm", "large language model"],
  "Computer Vision": ["computer vision", "opencv", "image recognition", "object detection", "yolo", "cnn", "image processing"],
  "Data Engineering": ["data engineering", "etl", "elt", "data pipeline", "apache airflow", "airflow", "dbt", "data warehouse", "data lake", "data lakehouse"],
  "Big Data": ["big data", "hadoop", "spark", "apache spark", "pyspark", "hive", "kafka", "apache kafka", "flink", "presto", "trino"],
  "BI & Reporting": ["power bi", "powerbi", "tableau", "looker", "metabase", "superset", "qlik", "qlikview", "qliksense", "ssrs", "crystal reports", "business intelligence"],

  // ── DevOps & CI/CD ───────────────────────────────────────────────────
  "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment", "jenkins", "github actions", "gitlab ci", "circleci", "travis ci", "azure devops", "bamboo", "teamcity"],
  "Containers": ["docker", "containerization", "podman", "container", "dockerfile", "docker compose", "docker-compose"],
  "Orchestration": ["kubernetes", "k8s", "openshift", "docker swarm", "helm", "istio", "service mesh", "rancher", "argo", "argocd"],
  "Infrastructure as Code": ["terraform", "pulumi", "cloudformation", "aws cdk", "ansible", "puppet", "chef", "saltstack", "iac"],
  "Monitoring & Observability": ["prometheus", "grafana", "datadog", "new relic", "splunk", "elk", "elasticsearch", "logstash", "kibana", "jaeger", "opentelemetry", "nagios", "zabbix", "dynatrace"],
  "Site Reliability": ["sre", "site reliability", "incident management", "runbook", "sla", "slo", "sli", "chaos engineering"],

  // ── Cloud ────────────────────────────────────────────────────────────
  "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "rds", "dynamodb", "cloudwatch", "sqs", "sns", "ecs", "eks", "fargate", "api gateway", "route 53", "cloudfront"],
  "Azure": ["azure", "microsoft azure", "azure functions", "azure devops", "azure ad", "azure sql", "cosmos db", "cosmosdb", "azure blob", "azure kubernetes"],
  "GCP": ["gcp", "google cloud", "google cloud platform", "bigquery", "cloud run", "cloud functions", "gke", "firebase", "firestore", "pub/sub"],
  "Cloud General": ["cloud computing", "cloud architecture", "multi-cloud", "hybrid cloud", "serverless", "faas", "paas", "iaas", "saas"],

  // ── Databases ────────────────────────────────────────────────────────
  "SQL Databases": ["sql", "mysql", "postgresql", "postgres", "mariadb", "sql server", "mssql", "oracle db", "oracle database", "sqlite", "t-sql", "pl/sql"],
  "NoSQL Databases": ["nosql", "mongodb", "couchdb", "cassandra", "dynamodb", "hbase", "neo4j", "graph database", "arangodb", "riak"],
  "In-Memory & Cache": ["redis", "memcached", "caching", "in-memory database", "hazelcast", "valkey"],
  "Search Engines": ["elasticsearch", "solr", "opensearch", "algolia", "meilisearch", "full-text search"],
  "Message Queues": ["rabbitmq", "kafka", "activemq", "zeromq", "nats", "mqtt", "message queue", "message broker", "event streaming"],

  // ── Design & UX ──────────────────────────────────────────────────────
  "UI/UX Design": ["ui design", "ux design", "ui/ux", "user interface", "user experience", "interaction design", "information architecture", "wireframing", "prototyping"],
  "Design Tools": ["figma", "sketch", "adobe xd", "invision", "zeplin", "framer", "axure", "balsamiq", "canva"],
  "Graphic Design": ["graphic design", "photoshop", "illustrator", "indesign", "after effects", "premiere pro", "adobe creative suite", "coreldraw"],

  // ── Project Management ───────────────────────────────────────────────
  "Agile Methodologies": ["agile", "scrum", "kanban", "lean", "safe", "scaled agile", "sprint planning", "retrospective", "daily standup", "product owner", "scrum master"],
  "PM Tools": ["jira", "confluence", "trello", "asana", "monday.com", "clickup", "notion", "basecamp", "ms project", "microsoft project", "azure boards"],
  "Project Management": ["project management", "programme management", "pmp", "prince2", "pmbok", "risk management", "stakeholder management", "resource planning", "gantt"],

  // ── QA & Testing ─────────────────────────────────────────────────────
  "Test Automation": ["selenium", "cypress", "playwright", "puppeteer", "webdriver", "appium", "test automation", "automated testing", "testcafe"],
  "Unit & Integration Testing": ["jest", "mocha", "chai", "jasmine", "junit", "pytest", "rspec", "nunit", "xunit", "vitest", "testing library", "react testing library"],
  "QA General": ["qa", "quality assurance", "manual testing", "test cases", "test plan", "regression testing", "smoke testing", "uat", "user acceptance testing", "bug tracking"],
  "Performance Testing": ["jmeter", "gatling", "locust", "k6", "load testing", "stress testing", "performance testing", "artillery"],
  "API Testing": ["postman", "insomnia", "rest assured", "api testing", "soapui", "newman", "karate"],

  // ── Networking ───────────────────────────────────────────────────────
  "Networking Fundamentals": ["networking", "tcp/ip", "dns", "dhcp", "http", "https", "ssl", "tls", "osi model", "vpn", "vlan", "routing", "switching", "load balancing"],
  "Network Infrastructure": ["cisco", "juniper", "ccna", "ccnp", "mikrotik", "ubiquiti", "firewall", "pfsense", "fortinet", "palo alto"],
  "Wireless & Telecoms": ["wifi", "wireless", "5g", "lte", "voip", "sip", "pbx", "asterisk", "3cx", "telecoms", "telecommunications"],

  // ── Security ─────────────────────────────────────────────────────────
  "Cybersecurity": ["cybersecurity", "information security", "infosec", "penetration testing", "pen testing", "vulnerability assessment", "soc", "siem", "threat intelligence", "incident response"],
  "Application Security": ["owasp", "application security", "appsec", "secure coding", "code review", "sast", "dast", "dependency scanning", "snyk", "sonarqube"],
  "Identity & Access": ["iam", "identity management", "access management", "oauth", "oauth2", "oidc", "openid connect", "saml", "ldap", "active directory", "sso", "single sign-on", "keycloak", "auth0", "okta"],
  "Compliance & Governance": ["iso 27001", "gdpr", "popia", "pci dss", "sox", "nist", "cobit", "itil", "governance", "compliance", "audit"],

  // ── ERP & Business Systems ───────────────────────────────────────────
  "SAP": ["sap", "sap erp", "sap hana", "sap s/4hana", "sap fiori", "sap abap", "abap", "sap basis", "sap mm", "sap sd", "sap fi", "sap co", "sap hr", "sap bw"],
  "Oracle ERP": ["oracle erp", "oracle ebs", "oracle fusion", "oracle cloud", "oracle financials", "peoplesoft", "jd edwards"],
  "Microsoft ERP": ["dynamics 365", "dynamics crm", "dynamics nav", "dynamics ax", "navision", "business central", "power platform", "power apps", "power automate"],
  "CRM": ["salesforce", "hubspot", "zoho crm", "freshsales", "pipedrive", "crm", "customer relationship management", "salesforce apex", "salesforce lightning"],
  "ERP General": ["erp", "enterprise resource planning", "supply chain management", "scm", "procurement", "inventory management", "financial systems"],

  // ── South African Tech Stacks ────────────────────────────────────────
  "SA Payments & Fintech": ["paygate", "peach payments", "ozow", "snapscan", "zapper", "yoco", "ikhokha", "stitch", "investec api", "nedbank api", "standard bank api", "fnb api", "absa api"],
  "SA Government & Compliance": ["popia", "fica", "rica", "bbbee", "b-bbee", "sars efiling", "cipc", "companies act", "king iv", "south african reserve bank", "sarb"],
  "SA Telecoms & Mobile": ["mtn api", "vodacom api", "ussd", "airtime", "momo", "mobile money", "whatsapp business api", "bulk sms"],
  "SA Platforms": ["takealot", "takealot api", "bob pay", "capitec api", "discovery api", "multichoice", "dstv"],

  // ── General Programming Languages ────────────────────────────────────
  "Python": ["python", "python3", "python2", "pip", "poetry", "conda", "virtualenv", "venv"],
  "Java": ["java", "jvm", "jdk", "maven", "gradle", "java 8", "java 11", "java 17", "java 21"],
  "C/C++": ["c", "c++", "cpp", "c language", "cmake", "make", "gcc", "g++", "clang", "llvm", "embedded c"],
  "Functional Programming": ["haskell", "scala", "clojure", "f#", "fsharp", "ocaml", "lisp", "scheme", "racket"],
  "Scripting Languages": ["bash", "shell", "powershell", "perl", "lua", "groovy", "shell scripting", "batch", "awk", "sed"],
  "Systems Programming": ["rust", "go", "golang", "zig", "nim", "systems programming", "low-level programming"],
  "R & Statistics": ["r", "r language", "rstudio", "ggplot", "tidyverse", "dplyr", "shiny", "statistical analysis", "biostatistics"],
  "Solidity & Web3": ["solidity", "web3", "blockchain", "ethereum", "smart contracts", "defi", "nft", "hardhat", "truffle", "foundry"],

  // ── Version Control ──────────────────────────────────────────────────
  "Version Control": ["git", "github", "gitlab", "bitbucket", "svn", "subversion", "mercurial", "version control", "source control"],

  // ── Operating Systems & Admin ────────────────────────────────────────
  "Linux": ["linux", "ubuntu", "centos", "rhel", "red hat", "debian", "fedora", "arch linux", "suse", "linux administration"],
  "Windows Admin": ["windows server", "windows administration", "active directory", "group policy", "powershell", "iis", "hyper-v"],
  "Virtualisation": ["vmware", "virtualbox", "kvm", "proxmox", "virtualisation", "virtualization", "esxi", "vsphere", "citrix"],

  // ── Office & Productivity ────────────────────────────────────────────
  "Microsoft Office": ["microsoft office", "ms office", "excel", "word", "powerpoint", "outlook", "teams", "sharepoint", "onedrive", "microsoft 365", "office 365"],
  "Google Workspace": ["google workspace", "g suite", "google docs", "google sheets", "google slides", "google drive", "gmail"],

  // ── AI & Automation ──────────────────────────────────────────────────
  "AI Tools": ["chatgpt", "copilot", "github copilot", "ai", "artificial intelligence", "generative ai", "gen ai", "prompt engineering", "midjourney", "stable diffusion", "openai", "claude", "anthropic"],
  "RPA": ["rpa", "robotic process automation", "uipath", "blue prism", "automation anywhere", "power automate"],

  // ── Embedded & IoT ───────────────────────────────────────────────────
  "Embedded Systems": ["embedded systems", "embedded software", "rtos", "firmware", "microcontroller", "arduino", "raspberry pi", "esp32", "stm32", "fpga", "vhdl", "verilog"],
  "IoT": ["iot", "internet of things", "mqtt", "lora", "lorawan", "zigbee", "z-wave", "edge computing", "iot gateway"],

  // ── GIS & Mapping ────────────────────────────────────────────────────
  "GIS": ["gis", "geographic information system", "arcgis", "qgis", "mapbox", "leaflet", "openlayers", "google maps api", "geospatial", "spatial data"],
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalise a string for comparison: lowercase and trim. */
function normalise(s: string): string {
  return s.trim().toLowerCase();
}

/** Build a reverse lookup: normalised skill -> family key. Cached once. */
let _reverseMap: Map<string, string> | null = null;

function getReverseMap(): Map<string, string> {
  if (_reverseMap) return _reverseMap;
  _reverseMap = new Map<string, string>();
  for (const [family, skills] of Object.entries(SKILL_TAXONOMY)) {
    for (const skill of skills) {
      _reverseMap.set(normalise(skill), family);
    }
  }
  return _reverseMap;
}

/** Simple Levenshtein distance for short strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/** Returns true when two normalised strings are a fuzzy match. */
function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // One contains the other
  if (a.includes(b) || b.includes(a)) return true;
  // Levenshtein threshold: allow ~20% edits for strings longer than 3 chars
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 3) return a === b;
  const threshold = Math.floor(maxLen * 0.2);
  return levenshtein(a, b) <= threshold;
}

// ---------------------------------------------------------------------------
// 2. findRelatedSkills
// ---------------------------------------------------------------------------

/**
 * Returns all skills that belong to the same taxonomy family as the given
 * skill. Returns an empty array if the skill is not recognised.
 */
export function findRelatedSkills(skill: string): string[] {
  const norm = normalise(skill);
  const reverseMap = getReverseMap();

  // Direct lookup
  const family = reverseMap.get(norm);
  if (family) {
    return SKILL_TAXONOMY[family].filter((s) => normalise(s) !== norm);
  }

  // Fuzzy lookup – try every entry
  for (const [key, familyName] of Array.from(reverseMap.entries())) {
    if (fuzzyMatch(norm, key)) {
      return SKILL_TAXONOMY[familyName].filter((s) => !fuzzyMatch(normalise(s), norm));
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// 3. skillsMatch
// ---------------------------------------------------------------------------

/**
 * Returns true if `candidateSkill` and `requiredSkill` are in the same
 * taxonomy family or are fuzzy string matches of each other.
 */
export function skillsMatch(candidateSkill: string, requiredSkill: string): boolean {
  const a = normalise(candidateSkill);
  const b = normalise(requiredSkill);

  // Exact or fuzzy string match
  if (fuzzyMatch(a, b)) return true;

  // Same family check
  const reverseMap = getReverseMap();

  const familyA = reverseMap.get(a);
  const familyB = reverseMap.get(b);

  if (familyA && familyB && familyA === familyB) return true;

  // Fuzzy family lookup when one or both are not exact matches
  if (!familyA || !familyB) {
    const resolvedA = familyA ?? findFamilyFuzzy(a, reverseMap);
    const resolvedB = familyB ?? findFamilyFuzzy(b, reverseMap);
    if (resolvedA && resolvedB && resolvedA === resolvedB) return true;
  }

  return false;
}

/** Fuzzy-resolve a normalised skill to its family name. */
function findFamilyFuzzy(norm: string, reverseMap: Map<string, string>): string | null {
  for (const [key, family] of Array.from(reverseMap.entries())) {
    if (fuzzyMatch(norm, key)) return family;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. extractSkillsFromText
// ---------------------------------------------------------------------------

/** Build a sorted list of all known skill strings (longest first for greedy matching). */
let _allSkills: string[] | null = null;

function getAllSkillsSorted(): string[] {
  if (_allSkills) return _allSkills;
  const set = new Set<string>();
  for (const skills of Object.values(SKILL_TAXONOMY)) {
    for (const s of skills) {
      set.add(normalise(s));
    }
  }
  _allSkills = Array.from(set).sort((a, b) => b.length - a.length);
  return _allSkills;
}

/**
 * Extracts recognised skills from free-form text (e.g. a job description or
 * CV). Returns a de-duplicated array of matched skill strings (in their
 * canonical taxonomy form).
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];

  const normText = normalise(text);
  const found = new Set<string>();
  const allSkills = getAllSkillsSorted();

  // Build a lookup from normalised -> canonical form
  const canonical = new Map<string, string>();
  for (const skills of Object.values(SKILL_TAXONOMY)) {
    for (const s of skills) {
      canonical.set(normalise(s), s);
    }
  }

  for (const skill of allSkills) {
    // Skip very short skills (1-2 chars like "c", "r") unless bounded by word boundaries
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = skill.length <= 2
      ? new RegExp(`(?:^|[\\s,;|/()\\[\\]])${escaped}(?:$|[\\s,;|/()\\[\\]])`)
      : new RegExp(`(?:^|[\\s,;|/()\\[\\]])${escaped}(?:$|[\\s,;|/()\\[\\]])`);

    if (pattern.test(normText)) {
      const canon = canonical.get(skill);
      if (canon) {
        found.add(canon);
      }
    }
  }

  return Array.from(found);
}
