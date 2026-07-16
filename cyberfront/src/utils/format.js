export const formatIncidentId = (id) => {
  if (id === undefined || id === null) return "N/A";
  const num = Number(id);
  if (isNaN(num)) return id;
  return `INC-${String(num).padStart(6, '0')}`;
};

export const formatTimestamp = (ts) => {
  if (!ts) return "—";
  
  let date;
  if (typeof ts === 'string') {
    const cleanTs = ts.trim();
    if (!cleanTs.includes("Z") && !/[+-]\d{2}:?\d{2}$/.test(cleanTs)) {
      const isoStr = cleanTs.includes(" ") ? cleanTs.replace(" ", "T") : cleanTs;
      date = new Date(isoStr + "+05:30");
    } else {
      date = new Date(cleanTs);
    }
  } else {
    date = new Date(ts);
  }

  if (isNaN(date.getTime())) return ts;

  const optionsDate = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' };
  const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };

  const datePart = date.toLocaleDateString('en-GB', optionsDate); // "06 Jul 2026"
  const timePart = date.toLocaleTimeString('en-US', optionsTime); // "03:45 PM"

  return `${datePart}, ${timePart}`;
};

export const getAnalystLevel = (username, usersList) => {
  if (!username) return "—";
  if (username.toLowerCase() === "management review") return "N/A";
  if (!usersList || usersList.length === 0) return "—";
  const found = usersList.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
  if (found && found.analystLevel) {
    const level = found.analystLevel.trim();
    return level.includes("Analyst") ? level : `${level} Analyst`;
  }
  return "—";
};

export const formatSpecialization = (spec) => {
  if (!spec) return "—";
  const upper = spec.toUpperCase().trim();
  if (upper === "IDENTITY_ACCESS" || 
      upper === "INCIDENT_ACCESS" || 
      upper === "IDENTITY & ACCESS" || 
      upper === "IDENTITY AND ACCESS" || 
      upper === "IDENTITY & ACCESS MANAGEMENT" ||
      upper === "IDENTITY AND ACCESS MANAGEMENT") {
    return "IDENTITY_ACCESS";
  }
  return spec;
};

export const extractIoCs = (description, aiText) => {
  const text = `${description || ""} ${aiText || ""}`;
  
  const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const urlPattern = /https?:\/\/[^\s$.?#].[^\s]*/g;
  const domainPattern = /\b(?:[a-z0-9]+(?:-[a-z0-9]+)*\.)+[a-z]{2,}\b/gi;
  const md5Pattern = /\b[a-fA-F0-9]{32}\b/g;
  const sha1Pattern = /\b[a-fA-F0-9]{40}\b/g;
  const sha256Pattern = /\b[a-fA-F0-9]{64}\b/g;

  const ips = Array.from(new Set(text.match(ipPattern) || []));
  const emails = Array.from(new Set(text.match(emailPattern) || []));
  const urls = Array.from(new Set(text.match(urlPattern) || []));
  const domains = Array.from(new Set(text.match(domainPattern) || []));
  const md5s = text.match(md5Pattern) || [];
  const sha1s = text.match(sha1Pattern) || [];
  const sha256s = text.match(sha256Pattern) || [];
  const hashes = Array.from(new Set([...md5s, ...sha1s, ...sha256s]));

  const isPrivateIp = (ip) => {
    return ip.startsWith("10.") || 
           ip.startsWith("192.168.") || 
           ip.startsWith("127.") || 
           /172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
  };

  const internalIps = ips.filter(isPrivateIp);
  const externalIps = ips.filter(ip => !isPrivateIp(ip));

  const registryPattern = /(HKLM|HKCU|HKCR|HKU|registry\\)[a-zA-Z0-9\\\-_]+/gi;
  const registries = Array.from(new Set(text.match(registryPattern) || []));

  const psPattern = /(powershell|iex|encodedcommand|invoke-expression|bypass)/gi;
  const hasPS = psPattern.test(text);
  const psMatch = text.match(/(?:powershell\.exe|powershell)\s+-[^\n\r]+/i);
  const psCommand = psMatch ? psMatch[0] : (hasPS ? "PowerShell Execution Detected" : null);

  const filePattern = /\b[a-zA-Z0-9_\-.]+\.(exe|dll|bat|vbs|ps1|doc|docx|xls|xlsx|pdf|zip|rar)\b/gi;
  const files = Array.from(new Set(text.match(filePattern) || []));

  const devicePattern = /\b(?:desktop|laptop|ws|dc|server|pc|host)-[a-zA-Z0-9\-]+\b/gi;
  const devices = Array.from(new Set(text.match(devicePattern) || []));

  const cleanDomains = domains.filter(d => !d.toLowerCase().endsWith(".com.com") && !d.toLowerCase().endsWith(".png") && !d.toLowerCase().endsWith(".jpg") && d.toLowerCase() !== "company.com" && d.toLowerCase() !== "gmail.com");

  return {
    externalIp: externalIps.length > 0 ? externalIps.join(", ") : null,
    internalIp: internalIps.length > 0 ? internalIps.join(", ") : null,
    domain: cleanDomains.length > 0 ? cleanDomains.join(", ") : null,
    url: urls.length > 0 ? urls.join(", ") : null,
    email: emails.length > 0 ? emails.join(", ") : null,
    hash: hashes.length > 0 ? hashes.join(", ") : null,
    registry: registries.length > 0 ? registries.join(", ") : null,
    powershell: psCommand,
    file: files.length > 0 ? files.join(", ") : null,
    device: devices.length > 0 ? devices.join(", ") : null,
  };
};

export const getMitreMapping = (category, title, description) => {
  const cat = (category || "").toUpperCase();
  const t = (title || "").toLowerCase();
  const d = (description || "").toLowerCase();
  
  if (cat === "PHISHING" || t.includes("phish") || d.includes("phish") || t.includes("email") || d.includes("email")) {
    const getScore = (kw1, kw2, kw3) => {
      let score = 0;
      if (t.includes(kw1)) score += 70;
      if (kw2 && t.includes(kw2)) score += 50;
      if (kw3 && t.includes(kw3)) score += 30;
      if (d.includes(kw1)) score += 20;
      if (kw2 && d.includes(kw2)) score += 15;
      if (kw3 && d.includes(kw3)) score += 10;
      return score;
    };
    
    const dhl = getScore("dhl", "delivery", "shipping");
    const adobe = getScore("adobe", "pdf", "document cloud");
    const sharepoint = getScore("sharepoint", "share point", "sp");
    const teams = getScore("teams", "microsoft teams", "msteams");
    const hr = getScore("hr", "payroll", "salary") + getScore("benefits", "compensation", "");
    const onedrive = getScore("onedrive", "one drive", "sky drive");
    const outlook = getScore("outlook", "exchange", "mail renewal");
    const bank = getScore("bank", "wire", "routing") + getScore("transfer", "payment", "invoice");
    const pwd = getScore("password", "expiry", "reset") + getScore("credential", "expired", "");
    const bec = getScore("bec", "ceo", "executive") + getScore("invoice spoof", "financial", "");
    
    let max = 0;
    let type = "GENERIC";
    if (dhl > max) { max = dhl; type = "DHL"; }
    if (adobe > max) { max = adobe; type = "ADOBE"; }
    if (sharepoint > max) { max = sharepoint; type = "SHAREPOINT"; }
    if (teams > max) { max = teams; type = "TEAMS"; }
    if (hr > max) { max = hr; type = "HR"; }
    if (onedrive > max) { max = onedrive; type = "ONEDRIVE"; }
    if (outlook > max) { max = outlook; type = "OUTLOOK"; }
    if (bank > max) { max = bank; type = "BANK"; }
    if (pwd > max) { max = pwd; type = "PASSWORD"; }
    if (bec > max) { max = bec; type = "BEC"; }
    
    if (type === "ADOBE") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Adobe Document Cloud phishing email lures using redirection link payloads." },
        { tactic: "Credential Access", technique: "Input Capture", techniqueId: "T1056", description: "Harvesting Adobe login details via spoofed access portal forms." }
      ];
    }
    if (type === "DHL") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Impersonating DHL transport tracking emails containing tracking link redirects." },
        { tactic: "Credential Access", technique: "Session Credentials", techniqueId: "T1539", description: "Harvesting email login tokens via lookalike tracking logins." }
      ];
    }
    if (type === "SHAREPOINT") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Microsoft SharePoint collaboration email template spoofing redirects." },
        { tactic: "Credential Access", technique: "Valid Accounts", techniqueId: "T1078", description: "Harvesting system login accounts to compromise M365 sharing." }
      ];
    }
    if (type === "HR") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Attachment", techniqueId: "T1566.001", description: "Spearphishing targeting HR/Payroll containing malicious spreadsheet files." },
        { tactic: "Execution", technique: "User Execution: Malicious File", techniqueId: "T1204.002", description: "User launches payload attachments triggering macro code execution." },
        { tactic: "Execution", technique: "Command and Scripting Interpreter", techniqueId: "T1059", description: "Macro VBA commands invoking local script shells." }
      ];
    }
    if (type === "TEAMS") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Mimicking Teams chat notification email templates with lookalike link options." },
        { tactic: "Defense Evasion", technique: "Obfuscated Files or Information", techniqueId: "T1027", description: "Obfuscating target redirect links to bypass email transport protection rules." }
      ];
    }
    if (type === "ONEDRIVE") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Replicating OneDrive document vault request templates containing sharing link redirects." },
        { tactic: "Credential Access", technique: "Valid Accounts", techniqueId: "T1078", description: "Harvesting user login accounts to gain cloud storage access files." }
      ];
    }
    if (type === "OUTLOOK") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Spoofing Exchange Web App portal alerts redirecting to OWA lookalike login pages." },
        { tactic: "Credential Access", technique: "Input Capture", techniqueId: "T1056", description: "Harvesting primary Exchange credentials using imitation web portal frames." }
      ];
    }
    if (type === "BANK") {
      return [
        { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Impersonating treasury banking institutions carrying secure wire details." },
        { tactic: "Credential Access", technique: "Valid Accounts", techniqueId: "T1078", description: "Hijacking financial portals using stolen administrator credentials." }
      ];
    }
    
    return [
      { tactic: "Initial Access", technique: "Phishing: Spearphishing Link", techniqueId: "T1566.002", description: "Adversaries send phishing links to gain initial access to victim networks." },
      { tactic: "Credential Access", technique: "Input Capture", techniqueId: "T1056", description: "Harvesting credentials via external lookalike authentication frames." }
    ];
  }
  
  if (cat === "IDENTITY_ACCESS" || cat === "IDENTITY & ACCESS" || cat === "IDENTITY AND ACCESS") {
    return [
      { tactic: "Credential Access", technique: "Brute Force", techniqueId: "T1110", description: "Adversaries may use brute force to gain unauthorized access." }
    ];
  } else if (cat === "MALWARE" || cat === "RANSOMWARE") {
    return [
      { tactic: "Execution", technique: "User Execution", techniqueId: "T1204", description: "Adversaries may rely on user execution to run malicious software." },
      { tactic: "Persistence", technique: "Registry Run Keys / Startup Folder", techniqueId: "T1547.001", description: "Adversaries may execute malicious code on startup via registry run keys." },
      { tactic: "Privilege Escalation", technique: "Bypass User Account Control", techniqueId: "T1548.002", description: "Adversaries may bypass UAC mechanisms to run with elevated privileges." }
    ];
  } else if (cat === "NETWORK" || cat === "NETWORK SECURITY") {
    return [
      { tactic: "Command and Control", technique: "Application Layer Protocol", techniqueId: "T1071", description: "Adversaries may use application layer protocols to bypass firewalls." },
      { tactic: "Discovery", technique: "Network Service Discovery", techniqueId: "T1046", description: "Adversaries may scan network ports to discover services." }
    ];
  }
  return null;
};

export const getDefaultChecklistForCategory = (category) => {
  const cat = (category || "").toUpperCase();
  if (cat === "IDENTITY_ACCESS" || cat === "IDENTITY & ACCESS" || cat === "IDENTITY AND ACCESS") {
    return [
      { item: "Review VPN Logs", checked: false },
      { item: "Review Azure AD Logs", checked: false },
      { item: "Verify MFA Events", checked: false },
      { item: "Review Successful Logins", checked: false },
      { item: "Check User Sessions", checked: false },
      { item: "Verify Password Changes", checked: false }
    ];
  } else if (cat === "MALWARE" || cat === "RANSOMWARE") {
    return [
      { item: "Antivirus Logs", checked: false },
      { item: "EDR Logs", checked: false },
      { item: "Registry Analysis", checked: false },
      { item: "Memory Analysis", checked: false },
      { item: "Network Connections", checked: false },
      { item: "Quarantine Verification", checked: false }
    ];
  } else if (cat === "PHISHING") {
    return [
      { item: "Email Headers", checked: false },
      { item: "Sender Reputation", checked: false },
      { item: "URL Analysis", checked: false },
      { item: "Attachment Scan", checked: false },
      { item: "Mail Gateway Logs", checked: false },
      { item: "User Interview", checked: false }
    ];
  }
  return [
    { item: "Review Incident Details", checked: false },
    { item: "Verify Alert Indicators", checked: false },
    { item: "Contact Reporter", checked: false },
    { item: "Document Containment Actions", checked: false }
  ];
};

export const iocsMatch = (val1, val2) => {
  if (!val1 || !val2) return false;
  const list1 = val1.split(", ").map(s => s.trim().toLowerCase());
  const list2 = val2.split(", ").map(s => s.trim().toLowerCase());
  return list1.some(item => list2.includes(item));
};
