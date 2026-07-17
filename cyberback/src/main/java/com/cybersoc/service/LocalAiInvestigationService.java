package com.cybersoc.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Arrays;
import java.util.ArrayList;

@Service
public class LocalAiInvestigationService {

    public enum AttackPattern {
        PHISHING_DHL,
        PHISHING_ADOBE,
        PHISHING_SHAREPOINT,
        PHISHING_TEAMS,
        PHISHING_HR,
        PHISHING_ONEDRIVE,
        PHISHING_OUTLOOK,
        PHISHING_BANK,
        PHISHING_PASSWORD,
        PHISHING_BEC,
        PHISHING_GENERIC,
        
        MALWARE_RANSOMWARE,
        MALWARE_TROJAN,
        MALWARE_SPYWARE,
        MALWARE_WORM,
        MALWARE_KEYLOGGER,
        MALWARE_USB,
        MALWARE_MACRO,
        MALWARE_VIRUS,
        MALWARE_ENDPOINT,
        GENERIC_MALWARE,
        
        IDENTITY_VPN,
        IDENTITY_BRUTEFORCE,
        IDENTITY_TRAVEL,
        IDENTITY_FAILURE,
        IDENTITY_MFA,
        IDENTITY_SUSPICIOUS,
        IDENTITY_CREDS,
        IDENTITY_GENERIC,
        
        WEB_SQLI,
        WEB_XSS,
        WEB_COMMAND,
        WEB_UPLOAD,
        WEB_RCE,
        WEB_GENERIC,
        
        NETWORK_PORTSCAN,
        NETWORK_DDOS,
        NETWORK_DNSTUNNEL,
        NETWORK_BEACONING,
        NETWORK_LATERAL,
        NETWORK_EXFIL,
        
        CLOUD_MISCONFIG,
        CLOUD_BUCKET,
        CLOUD_IAM,
        CLOUD_GENERIC,
        
        ALERT_FIREWALL,
        ALERT_IDS,
        ALERT_IPS,
        ALERT_SIEM,
        ALERT_AV,
        ALERT_EDR,
        
        THREAT_INSIDER,
        THREAT_PRIV_ESC,
        THREAT_ZERODAY,
        THREAT_SUPPLY_CHAIN,
        OTHER
    }

    public enum IncidentOutcome {
        ATTEMPTED_PHISHING,
        USER_INTERACTION_ONLY,
        CONFIRMED_COMPROMISE,
        INCONCLUSIVE
    }

    public static class IncidentEvidence {
        public String domain;
        public String email;
        public String url;
        public String username;
        public String filename;
        public String ipAddress;
    }

    private double getContextScore(String kw1, String kw2, String kw3, String title, String description, String analystNotes, String resolutionSummary) {
        double score = 0.0;
        if (title != null && !title.isEmpty()) {
            if (!kw1.isEmpty() && title.toLowerCase().contains(kw1)) score += 70.0;
            if (!kw2.isEmpty() && title.toLowerCase().contains(kw2)) score += 50.0;
            if (!kw3.isEmpty() && title.toLowerCase().contains(kw3)) score += 30.0;
        }
        if (description != null && !description.isEmpty()) {
            if (!kw1.isEmpty() && description.toLowerCase().contains(kw1)) score += 20.0;
            if (!kw2.isEmpty() && description.toLowerCase().contains(kw2)) score += 15.0;
            if (!kw3.isEmpty() && description.toLowerCase().contains(kw3)) score += 10.0;
        }
        if (analystNotes != null && !analystNotes.isEmpty()) {
            if (!kw1.isEmpty() && analystNotes.toLowerCase().contains(kw1)) score += 5.0;
            if (!kw2.isEmpty() && analystNotes.toLowerCase().contains(kw2)) score += 3.5;
            if (!kw3.isEmpty() && analystNotes.toLowerCase().contains(kw3)) score += 2.0;
        }
        if (resolutionSummary != null && !resolutionSummary.isEmpty()) {
            if (!kw1.isEmpty() && resolutionSummary.toLowerCase().contains(kw1)) score += 5.0;
            if (!kw2.isEmpty() && resolutionSummary.toLowerCase().contains(kw2)) score += 3.5;
            if (!kw3.isEmpty() && resolutionSummary.toLowerCase().contains(kw3)) score += 2.0;
        }
        return score;
    }

    private List<String> extractDomains(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern domainPattern = java.util.regex.Pattern.compile(
            "\\b([a-zA-Z0-9-]+\\.[a-zA-Z]{2,6}(\\.[a-zA-Z]{2,6})?)\\b"
        );
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = domainPattern.matcher(field);
            while (m.find()) {
                String val = m.group(1).toLowerCase();
                if (!val.contains("microsoft") && !val.contains("adobe") && !val.contains("google") && 
                    !val.contains("dhl") && !val.contains("sharepoint") && !val.contains("onedrive") && 
                    !val.contains("outlook") && !val.contains("github") && !val.contains("localhost") &&
                    !val.contains("example") && !val.contains("spring") && !val.contains("com.cybersoc") &&
                    !val.endsWith(".css") && !val.endsWith(".js") && !val.endsWith(".json") && !val.endsWith(".png")) {
                    if (!found.contains(val)) found.add(val);
                }
            }
        }
        return found;
    }

    private List<String> extractIPs(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern ipPattern = java.util.regex.Pattern.compile(
            "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b"
        );
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = ipPattern.matcher(field);
            while (m.find()) {
                String val = m.group();
                if (!val.startsWith("127.0.") && !val.startsWith("0.0.") && !val.startsWith("10.0.") && !val.equals("255.255.255.255")) {
                    if (!found.contains(val)) found.add(val);
                }
            }
        }
        return found;
    }

    private List<String> extractEmails(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern emailPattern = java.util.regex.Pattern.compile(
            "\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}\\b"
        );
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = emailPattern.matcher(field);
            while (m.find()) {
                String val = m.group().toLowerCase();
                if (!found.contains(val)) found.add(val);
            }
        }
        return found;
    }

    private List<String> extractAttachments(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern filePattern = java.util.regex.Pattern.compile(
            "\\b[a-zA-Z0-9_.-]+\\.(pdf|xlsm|xlsx|docx|exe|zip|lnk|html|htm)\\b"
        );
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = filePattern.matcher(field);
            while (m.find()) {
                String val = m.group();
                if (!val.equalsIgnoreCase("skill.md") && !val.equalsIgnoreCase("agents.md") && 
                    !val.equalsIgnoreCase("index.js") && !val.equalsIgnoreCase("package.json")) {
                    if (!found.contains(val)) found.add(val);
                }
            }
        }
        return found;
    }

    private List<String> extractHashes(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\b([a-fA-F0-9]{32}|[a-fA-F0-9]{64})\\b");
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = p.matcher(field);
            while (m.find()) {
                String val = m.group();
                if (!found.contains(val)) found.add(val);
            }
        }
        return found;
    }

    private List<String> extractCVEs(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\bCVE-\\d{4}-\\d{4,7}\\b", java.util.regex.Pattern.CASE_INSENSITIVE);
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = p.matcher(field);
            while (m.find()) {
                String val = m.group().toUpperCase();
                if (!found.contains(val)) found.add(val);
            }
        }
        return found;
    }

    private List<String> extractRegistryKeys(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\b(HKLM|HKCU|HKU|HKCR)\\\\[a-zA-Z0-9_\\\\.-]+\\b");
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = p.matcher(field);
            while (m.find()) {
                String val = m.group();
                if (!found.contains(val)) found.add(val);
            }
        }
        return found;
    }

    private List<String> extractURLs(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        java.util.regex.Pattern urlPattern = java.util.regex.Pattern.compile(
            "https?://[^\\s$.?#].[^\\s]*"
        );
        for (String field : fields) {
            if (field == null || field.isEmpty()) continue;
            java.util.regex.Matcher m = urlPattern.matcher(field);
            while (m.find()) {
                String val = m.group();
                if (!found.contains(val)) found.add(val);
            }
        }
        return found;
    }

    private List<String> extractIoCs(String... fields) {
        List<String> found = new java.util.ArrayList<>();
        for (String d : extractDomains(fields)) {
            found.add("Extracted Domain: " + d);
        }
        for (String ip : extractIPs(fields)) {
            found.add("Extracted IP: " + ip);
        }
        for (String att : extractAttachments(fields)) {
            found.add("Extracted File: " + att);
        }
        for (String hash : extractHashes(fields)) {
            found.add("Extracted Hash: " + hash);
        }
        for (String cve : extractCVEs(fields)) {
            found.add("Extracted CVE: " + cve);
        }
        for (String reg : extractRegistryKeys(fields)) {
            found.add("Extracted Registry Key: " + reg);
        }
        return found;
    }

    private AttackPattern classify(String category, String title, String description, String analystNotes, String resolutionSummary) {
        String cat = category != null ? category.toUpperCase().trim() : "";
        String t = title != null ? title.toLowerCase() : "";
        String d = description != null ? description.toLowerCase() : "";
        String notes = analystNotes != null ? analystNotes.toLowerCase() : "";
        String res = resolutionSummary != null ? resolutionSummary.toLowerCase() : "";
        String tAndD = (t + " " + d + " " + notes + " " + res);

        boolean isPhishing = cat.contains("PHISHING") || t.contains("phish") || d.contains("phish") || t.contains("email") || d.contains("email");
        
        if (isPhishing) {
            double dhlScore = getContextScore("dhl", "delivery", "shipping", t, d, notes, res);
            double adobeScore = getContextScore("adobe", "pdf", "document cloud", t, d, notes, res);
            double sharepointScore = getContextScore("sharepoint", "share point", "sp", t, d, notes, res);
            double teamsScore = getContextScore("teams", "microsoft teams", "msteams", t, d, notes, res);
            double hrScore = getContextScore("hr", "payroll", "salary", t, d, notes, res) + getContextScore("benefits", "compensation", "", t, d, notes, res);
            double onedriveScore = getContextScore("onedrive", "one drive", "sky drive", t, d, notes, res);
            double outlookScore = getContextScore("outlook", "exchange", "mail renewal", t, d, notes, res);
            double bankScore = getContextScore("bank", "wire", "routing", t, d, notes, res) + getContextScore("transfer", "payment", "invoice", t, d, notes, res);
            double pwdScore = getContextScore("password", "expiry", "reset", t, d, notes, res) + getContextScore("credential", "expired", "", t, d, notes, res);
            double becScore = getContextScore("bec", "ceo", "executive", t, d, notes, res) + getContextScore("invoice spoof", "financial", "", t, d, notes, res);
            
            double maxScore = 0.0;
            AttackPattern bestPattern = AttackPattern.PHISHING_GENERIC;
            
            if (dhlScore > maxScore) { maxScore = dhlScore; bestPattern = AttackPattern.PHISHING_DHL; }
            if (adobeScore > maxScore) { maxScore = adobeScore; bestPattern = AttackPattern.PHISHING_ADOBE; }
            if (sharepointScore > maxScore) { maxScore = sharepointScore; bestPattern = AttackPattern.PHISHING_SHAREPOINT; }
            if (teamsScore > maxScore) { maxScore = teamsScore; bestPattern = AttackPattern.PHISHING_TEAMS; }
            if (hrScore > maxScore) { maxScore = hrScore; bestPattern = AttackPattern.PHISHING_HR; }
            if (onedriveScore > maxScore) { maxScore = onedriveScore; bestPattern = AttackPattern.PHISHING_ONEDRIVE; }
            if (outlookScore > maxScore) { maxScore = outlookScore; bestPattern = AttackPattern.PHISHING_OUTLOOK; }
            if (bankScore > maxScore) { maxScore = bankScore; bestPattern = AttackPattern.PHISHING_BANK; }
            if (pwdScore > maxScore) { maxScore = pwdScore; bestPattern = AttackPattern.PHISHING_PASSWORD; }
            if (becScore > maxScore) { maxScore = becScore; bestPattern = AttackPattern.PHISHING_BEC; }
            
            if (maxScore > 0.0) {
                return bestPattern;
            }
            return AttackPattern.PHISHING_GENERIC;
        }
        
        // Malware
        if (cat.contains("MALWARE") || tAndD.contains("malware") || cat.contains("VIRUS") || tAndD.contains("virus")) {
            if (tAndD.contains("ransomware") || tAndD.contains("encrypt") || tAndD.contains("decrypt")) return AttackPattern.MALWARE_RANSOMWARE;
            if (tAndD.contains("trojan")) return AttackPattern.MALWARE_TROJAN;
            if (tAndD.contains("spyware") || tAndD.contains("stealer")) return AttackPattern.MALWARE_SPYWARE;
            if (tAndD.contains("worm")) return AttackPattern.MALWARE_WORM;
            if (tAndD.contains("keylogger")) return AttackPattern.MALWARE_KEYLOGGER;
            if (tAndD.contains("usb") || tAndD.contains("drive") || tAndD.contains("external")) return AttackPattern.MALWARE_USB;
            if (tAndD.contains("macro") || tAndD.contains("word") || tAndD.contains("excel")) return AttackPattern.MALWARE_MACRO;
            if (tAndD.contains("virus")) return AttackPattern.MALWARE_VIRUS;
            if (tAndD.contains("endpoint")) return AttackPattern.MALWARE_ENDPOINT;
            return AttackPattern.GENERIC_MALWARE;
        }
 
        // Web attacks
        if (cat.contains("WEB") || tAndD.contains("web") || tAndD.contains("sql") || tAndD.contains("xss")) {
            if (tAndD.contains("sql injection") || tAndD.contains("sqli")) return AttackPattern.WEB_SQLI;
            if (tAndD.contains("cross site scripting") || tAndD.contains("xss")) return AttackPattern.WEB_XSS;
            if (tAndD.contains("command injection") || tAndD.contains("cmd injection")) return AttackPattern.WEB_COMMAND;
            if (tAndD.contains("file upload")) return AttackPattern.WEB_UPLOAD;
            if (tAndD.contains("remote code execution") || tAndD.contains("rce")) return AttackPattern.WEB_RCE;
            return AttackPattern.WEB_GENERIC;
        }
        
        // Identity & Access
        if (cat.contains("IDENTITY") || cat.contains("ACCESS") || tAndD.contains("login") || tAndD.contains("auth")) {
            if (tAndD.contains("vpn")) return AttackPattern.IDENTITY_VPN;
            if (tAndD.contains("brute force") || tAndD.contains("spray")) return AttackPattern.IDENTITY_BRUTEFORCE;
            if (tAndD.contains("impossible travel")) return AttackPattern.IDENTITY_TRAVEL;
            if (tAndD.contains("multiple login failure") || tAndD.contains("failed logins")) return AttackPattern.IDENTITY_FAILURE;
            if (tAndD.contains("mfa fatigue") || tAndD.contains("push")) return AttackPattern.IDENTITY_MFA;
            if (tAndD.contains("suspicious login")) return AttackPattern.IDENTITY_SUSPICIOUS;
            if (tAndD.contains("credential theft") || tAndD.contains("creds")) return AttackPattern.IDENTITY_CREDS;
            return AttackPattern.IDENTITY_GENERIC;
        }
 
        // Network Security
        if (cat.contains("NETWORK") || tAndD.contains("network") || tAndD.contains("ddos") || tAndD.contains("dns")) {
            if (tAndD.contains("port scan") || tAndD.contains("probe") || tAndD.contains("scanning")) return AttackPattern.NETWORK_PORTSCAN;
            if (tAndD.contains("ddos") || tAndD.contains("denial of service")) return AttackPattern.NETWORK_DDOS;
            if (tAndD.contains("dns tunneling")) return AttackPattern.NETWORK_DNSTUNNEL;
            if (tAndD.contains("beaconing")) return AttackPattern.NETWORK_BEACONING;
            if (tAndD.contains("lateral movement")) return AttackPattern.NETWORK_LATERAL;
            if (tAndD.contains("data exfiltration") || tAndD.contains("exfil")) return AttackPattern.NETWORK_EXFIL;
            return AttackPattern.OTHER;
        }
        
        // Cloud
        if (cat.contains("CLOUD") || tAndD.contains("cloud") || tAndD.contains("aws") || tAndD.contains("azure") || tAndD.contains("gcp")) {
            if (tAndD.contains("bucket") || tAndD.contains("s3") || tAndD.contains("storage")) return AttackPattern.CLOUD_BUCKET;
            if (tAndD.contains("iam") || tAndD.contains("policy") || tAndD.contains("role")) return AttackPattern.CLOUD_IAM;
            if (tAndD.contains("misconfig")) return AttackPattern.CLOUD_MISCONFIG;
            return AttackPattern.CLOUD_GENERIC;
        }
 
        // Alerts / Security tools
        if (tAndD.contains("firewall")) return AttackPattern.ALERT_FIREWALL;
        if (tAndD.contains("ids alert") || tAndD.contains("ids")) return AttackPattern.ALERT_IDS;
        if (tAndD.contains("ips alert") || tAndD.contains("ips")) return AttackPattern.ALERT_IPS;
        if (tAndD.contains("siem")) return AttackPattern.ALERT_SIEM;
        if (tAndD.contains("antivirus") || tAndD.contains("av alert")) return AttackPattern.ALERT_AV;
        if (tAndD.contains("edr")) return AttackPattern.ALERT_EDR;
 
        // Insider / Privilege / Threat Intel
        if (tAndD.contains("insider") || tAndD.contains("leak") || tAndD.contains("leakage")) return AttackPattern.THREAT_INSIDER;
        if (tAndD.contains("privilege escalation") || tAndD.contains("root") || tAndD.contains("admin")) return AttackPattern.THREAT_PRIV_ESC;
        if (tAndD.contains("zero-day") || tAndD.contains("0-day")) return AttackPattern.THREAT_ZERODAY;
        if (tAndD.contains("supply chain")) return AttackPattern.THREAT_SUPPLY_CHAIN;
        
        return AttackPattern.OTHER;
    }

    public Map<String, String> getAnalysis(
            String title, String category, String priority, String description,
            String source, String department, String assignedAnalyst,
            String analystNotes, String resolutionSummary, String reportedBy
    ) {
        AttackPattern pattern = classify(category, title, description, analystNotes, resolutionSummary);
        int seed = Math.abs(title != null ? title.hashCode() : 0);
        boolean isMalwareCat = (category != null && category.toUpperCase().contains("MALWARE")) || 
                               (pattern.name().startsWith("MALWARE")) || 
                               (pattern == AttackPattern.GENERIC_MALWARE);
        
        Map<String, String> analysis = new HashMap<>();
        List<String> extracted = new java.util.ArrayList<>();
        
        // Populate shared IncidentEvidence
        IncidentEvidence evidence = new IncidentEvidence();
        List<String> domains = extractDomains(description, analystNotes, resolutionSummary, title);
        List<String> emails = extractEmails(description, analystNotes, resolutionSummary, title);
        List<String> attachments = extractAttachments(description, analystNotes, resolutionSummary, title);
        List<String> ips = extractIPs(description, analystNotes, resolutionSummary, title);
        List<String> urls = extractURLs(description, analystNotes, resolutionSummary, title);

        evidence.domain = domains.isEmpty() ? null : domains.get(0);
        evidence.email = emails.isEmpty() ? null : emails.get(0);
        evidence.filename = attachments.isEmpty() ? null : attachments.get(0);
        evidence.ipAddress = ips.isEmpty() ? null : ips.get(0);
        evidence.url = urls.isEmpty() ? null : urls.get(0);
        evidence.username = (reportedBy != null && !reportedBy.isEmpty() && !"unknown".equalsIgnoreCase(reportedBy)) ? reportedBy : null;

        if (evidence.domain == null) {
            if (evidence.email != null && evidence.email.contains("@")) {
                evidence.domain = evidence.email.substring(evidence.email.indexOf("@") + 1);
            } else if (evidence.url != null) {
                try {
                    String cleanUrl = evidence.url.replace("https://", "").replace("http://", "");
                    if (cleanUrl.contains("/")) {
                        cleanUrl = cleanUrl.substring(0, cleanUrl.indexOf("/"));
                    }
                    if (cleanUrl.contains("?")) {
                        cleanUrl = cleanUrl.substring(0, cleanUrl.indexOf("?"));
                    }
                    evidence.domain = cleanUrl;
                } catch (Exception e) {
                    // Ignore
                }
            }
        }

        String primaryDomain = evidence.domain != null ? evidence.domain : "Not available";
        String primaryEmail = evidence.email != null ? evidence.email : "Not available";
        String primaryAttachment = evidence.filename != null ? evidence.filename : "Not available";
        String primaryIP = evidence.ipAddress != null ? evidence.ipAddress : "Not available";
        String primaryUser = evidence.username != null ? evidence.username : "Not available";

        boolean mentionsAD = (title + " " + description + " " + analystNotes).toLowerCase().contains("active directory") || 
                             (title + " " + description + " " + analystNotes).toLowerCase().contains("azure ad");
        String identitySystem = mentionsAD ? "Active Directory / Azure AD" : "Enterprise Identity Platform";
        String credentialTerm = mentionsAD ? "AD credentials" : "user credentials";
        String emailGateway = "Email Security Gateway";
        String endpointPlatform = "Endpoint Protection Platform";
        String proxyGateway = "Proxy Gateway";

        String domainSec = evidence.domain != null ? evidence.domain : "Not available in collected evidence";
        String emailSec = evidence.email != null ? evidence.email : "Not available in collected evidence";
        String attachmentSec = evidence.filename != null ? evidence.filename : "Not available in collected evidence";
        String ipSec = evidence.ipAddress != null ? evidence.ipAddress : "Not available in collected evidence";
        String userSec = evidence.username != null ? evidence.username : "Not available in collected evidence";

        boolean hasCredHarvest = (pattern == AttackPattern.PHISHING_ADOBE || 
                                  pattern == AttackPattern.PHISHING_TEAMS || 
                                  pattern == AttackPattern.PHISHING_SHAREPOINT || 
                                  pattern == AttackPattern.PHISHING_ONEDRIVE || 
                                  pattern == AttackPattern.PHISHING_OUTLOOK || 
                                  pattern == AttackPattern.PHISHING_PASSWORD ||
                                  pattern == AttackPattern.PHISHING_BANK);

        boolean hasMacro = (pattern == AttackPattern.PHISHING_HR || 
                             pattern == AttackPattern.MALWARE_RANSOMWARE || 
                             pattern == AttackPattern.MALWARE_MACRO ||
                             pattern == AttackPattern.GENERIC_MALWARE);

        int totalIocs = (evidence.domain != null ? 1 : 0) + (evidence.ipAddress != null ? 1 : 0) + (evidence.filename != null ? 1 : 0);

        boolean isAttempted = false;
        String lowercaseContext = ((title != null ? title : "") + " " 
                                   + (description != null ? description : "") + " " 
                                   + (analystNotes != null ? analystNotes : "") + " " 
                                   + (resolutionSummary != null ? resolutionSummary : "")).toLowerCase();
                                   
        if (lowercaseContext.contains("did not enter credentials") || 
            lowercaseContext.contains("no credentials submitted") || 
            lowercaseContext.contains("reported before clicking") || 
            lowercaseContext.contains("reported without clicking") || 
            lowercaseContext.contains("reported without opening attachment") || 
            lowercaseContext.contains("no malicious file downloaded") ||
            lowercaseContext.contains("did not click") ||
            lowercaseContext.contains("no user interaction")) {
            isAttempted = true;
        }

        boolean isCompromised = false;
        if (lowercaseContext.contains("user entered credentials") ||
            lowercaseContext.contains("login successful") ||
            lowercaseContext.contains("credentials compromised") ||
            lowercaseContext.contains("mfa prompt accepted") ||
            lowercaseContext.contains("session hijacked") ||
            lowercaseContext.contains("suspicious login detected") ||
            lowercaseContext.contains("compromised credentials") ||
            lowercaseContext.contains("entered credentials") ||
            lowercaseContext.contains("submitted credentials")) {
            isCompromised = true;
        }

        IncidentOutcome outcome = IncidentOutcome.INCONCLUSIVE;
        if (isCompromised) {
            outcome = IncidentOutcome.CONFIRMED_COMPROMISE;
        } else if (lowercaseContext.contains("clicked link") || 
                   lowercaseContext.contains("user clicked") || 
                   lowercaseContext.contains("clicked the link") || 
                   lowercaseContext.contains("interacted with") ||
                   lowercaseContext.contains("opened the link") ||
                   lowercaseContext.contains("clicked on")) {
            outcome = IncidentOutcome.USER_INTERACTION_ONLY;
        } else if (isAttempted) {
            outcome = IncidentOutcome.ATTEMPTED_PHISHING;
        }

        boolean hasNetworkEvidence = !primaryIP.equals("Not available") || !primaryDomain.equals("Not available");
        boolean hasMalware = hasMacro || (pattern == AttackPattern.MALWARE_RANSOMWARE || pattern == AttackPattern.MALWARE_TROJAN);

        String observedEvidenceText = buildObservedEvidence(evidence, outcome, hasMacro);

        // Calculate dynamic Severity and Confidence
        int baseSeverityScore = calculateDynamicSeverity(priority, totalIocs, hasCredHarvest, hasMacro, department, outcome, hasMalware, reportedBy, hasNetworkEvidence);
        int finalConfidence = calculateDynamicConfidence(totalIocs, description, title, source, pattern, outcome, hasNetworkEvidence);
        
        // 18 fields construction mapping
        String execSummary = "";
        String classification = "";
        String mitre = "";
        String rootCause = "";
        List<String> iocs = new ArrayList<>();
        if (evidence.domain != null) {
            iocs.add("Domain: " + evidence.domain);
        }
        if (evidence.email != null) {
            iocs.add("Sender: " + evidence.email);
        }
        if (evidence.url != null) {
            iocs.add("URL: " + evidence.url);
        }
        if (evidence.ipAddress != null) {
            iocs.add("Source IP: " + evidence.ipAddress);
        }
        if (evidence.filename != null) {
            iocs.add("Attachment: " + evidence.filename);
        }
        if (evidence.username != null) {
            iocs.add("Target User: " + evidence.username);
        }

        // Add extra extracted IoCs like hashes, CVEs, registry keys:
        for (String hash : extractHashes(description, analystNotes, resolutionSummary)) {
            iocs.add("File Hash: " + hash);
        }
        for (String cve : extractCVEs(description, analystNotes, resolutionSummary)) {
            iocs.add("CVE: " + cve);
        }
        for (String reg : extractRegistryKeys(description, analystNotes, resolutionSummary)) {
            iocs.add("Registry Key: " + reg);
        }

        String techFindings = "";
        List<String> steps = new ArrayList<>();
        List<String> containment = new ArrayList<>();
        List<String> eradication = new ArrayList<>();
        List<String> recovery = new ArrayList<>();
        String impact = "";
        String baseRisk = "Medium";
        if (baseSeverityScore >= 85) {
            baseRisk = "Critical";
        } else if (baseSeverityScore >= 70) {
            baseRisk = "High";
        } else if (baseSeverityScore < 40) {
            baseRisk = "Low";
        }
        String decisionReminder = "";
        String aiRecommendation = "";
        String suggestedPriority = priority != null ? priority : "Medium";
        String nextAction = "";
        
        if (isMalwareCat) {
            String malwareName = category != null ? category : "Malware";
            if (pattern == AttackPattern.MALWARE_RANSOMWARE) malwareName = "Ransomware";
            else if (pattern == AttackPattern.MALWARE_TROJAN) malwareName = "Trojan";
            else if (pattern == AttackPattern.MALWARE_SPYWARE) malwareName = "Spyware";
            else if (pattern == AttackPattern.MALWARE_WORM) malwareName = "Worm";
            else if (pattern == AttackPattern.MALWARE_KEYLOGGER) malwareName = "Keylogger";
            
            execSummary = "A " + malwareName + " incident was identified on target device associated with user " + userSec + ". " +
                          "The threat agent attempts local unauthorized execution and persistence setup. " +
                          "The incident is assigned to analyst " + (assignedAnalyst != null ? assignedAnalyst : "SOC Triage") + " and is undergoing active security review.";
            
            classification = "Category: Malware\nPattern: " + malwareName + "\nFidelity: High";
            
            mitre = "- Execution: Command and Scripting Interpreter (T1059)\n" +
                    "- Persistence: Registry Run Keys / Startup Folder (T1547.001)\n" +
                    "- Privilege Escalation: Process Injection (T1055)\n" +
                    "- Defense Evasion: Indicator Removal on Host (T1070)\n" +
                    "- Command and Control: Application Layer Protocol (T1071)\n" +
                    "- Discovery: Process Discovery (T1057)\n" +
                    "- Lateral Movement: Lateral Tool Transfer (T1570)";
            
            rootCause = "Execution of untrusted software payload or malicious email attachment.";
            
            techFindings = "Technical Details: Anomalous executable activity detected. " +
                           "System logs indicate processes attempting to run from user space folders (AppData/Temp) or registry run modifications.";
            
            steps = new ArrayList<>(Arrays.asList(
                "Identify running process, parent process ID, and executable path.",
                "Extract SHA256/MD5 hash of the threat file.",
                "Inspect registry persistence run keys and scheduled tasks.",
                "Check active network connections and block any destination C2 IP.",
                "Query EDR logs, Windows Event logs, and Sysmon event telemetry."
            ));
            
            containment = new ArrayList<>(Arrays.asList(
                "Isolate endpoint from corporate network segments.",
                "Kill the malicious running process threads.",
                "Quarantine the threat executable file."
            ));
            
            eradication = new ArrayList<>(Arrays.asList(
                "Remove registry persistence keys and scheduled tasks.",
                "Run a full EDR/Antivirus scan on the target system."
            ));
            
            recovery = new ArrayList<>(Arrays.asList(
                "Collect memory dump for deeper offline analysis.",
                "Block malicious IOC hash at firewall/mail gateways.",
                "Verify lateral movement attempts on adjacent devices."
            ));
            
            if (baseSeverityScore >= 85) {
                impact = "Critical severity threat: Highly disruptive. High risk of system encryption, file loss, lateral network pivoting, and disruption of critical business services.";
            } else if (baseSeverityScore >= 70) {
                impact = "High severity threat: Significant risk. Local system compromise, potential unauthorized credential harvesting, and network scanning activity.";
            } else {
                impact = "Medium/Low severity threat: Low/localized risk. Isolated malware execution with minimal system impact.";
            }
            
            decisionReminder = "Verify if EDR has successfully blocked execution before proceeding with manual isolation.";
            aiRecommendation = "Immediate containment: Network isolate endpoint, terminate processes, and perform full system remediation.";
            nextAction = "Network isolate the affected machine and kill running processes.";
        } else {
            switch (pattern) {
                case PHISHING_DHL:
                case PHISHING_TEAMS:
                case PHISHING_ADOBE:
                case PHISHING_SHAREPOINT:
            case PHISHING_HR:
            case PHISHING_ONEDRIVE:
            case PHISHING_OUTLOOK:
            case PHISHING_BANK:
            case PHISHING_PASSWORD:
            case PHISHING_BEC:
            case PHISHING_GENERIC:
                PhishingTemplate p = buildPhishingAnalysis(pattern, evidence, identitySystem, proxyGateway, emailGateway, endpointPlatform, credentialTerm, outcome, assignedAnalyst, department);
                execSummary = p.execSummary;
                classification = p.classification;
                mitre = p.mitre;
                rootCause = p.rootCause;
                iocs.addAll(extracted);
                techFindings = observedEvidenceText + "\n\n" + p.techFindingsSuffix;
                steps.addAll(p.steps);
                containment.addAll(p.containment);
                eradication.addAll(p.eradication);
                recovery.addAll(p.recovery);
                impact = p.impact;
                decisionReminder = p.decisionReminder;
                aiRecommendation = p.aiRecommendation;
                nextAction = p.nextAction;
                break;

            case MALWARE_RANSOMWARE:
                execSummary = "A ransomware threat attempt was detected on target device of " + userSec + ". The threat objective is file encryption and local system recovery inhibition. The incident is assigned to analyst " + (assignedAnalyst != null ? assignedAnalyst : "SOC Triage") + " and is undergoing active endpoint isolation.";
                classification = "**Category**: Malware\n- **Pattern**: Ransomware\n- **Fidelity**: Critical";
                mitre = "- **Impact**: Data Encrypted for Impact (T1486)\n- **Inhibit System Recovery**: Shadow Copy Deletion (T1490)";
                rootCause = "Malicious binary execution originating from unsanitized user downloads.";
                iocs.addAll(extracted);
                techFindings = observedEvidenceText + "\n\n" +
                               "Technical Details: Active file encryption loop detected on " + userSec + " workstation. Executable attempts shadow copy deletion commands.";
                steps.addAll(Arrays.asList(
                    "Identify parent process of the ransomware threat binary.",
                    "Map shared storage drives for write activity spikes.",
                    "Extract memory strings to check encryption keys."
                ));
                containment.addAll(Arrays.asList(
                    "Isolate host device from network ports immediately.",
                    "Deactivate write permissions across mapped file shares."
                ));
                eradication.addAll(Arrays.asList(
                    "Terminate execution threads of the encryption binary.",
                    "Delete payload execution files."
                ));
                recovery.addAll(Arrays.asList(
                    "Restore host files from cold storage backups.",
                    "Verify system registry auto-runs are clean."
                ));
                impact = "Disruption of corporate data channels and loss of system functionality.";
                decisionReminder = "Do not shut down the device if key extraction from memory is planned, but isolate immediately.";
                aiRecommendation = "Disconnect the machine from switch networks, suspend mapped folder writes, and recover from backups.";
                nextAction = "Network isolate workstation and review server file shared states.";
                break;

            case MALWARE_TROJAN:
                execSummary = "A Trojan infection attempt was detected on target device of " + userSec + ". The threat objective is hidden remote access execution and lateral movement. The incident is assigned to analyst " + (assignedAnalyst != null ? assignedAnalyst : "SOC Triage") + " and is undergoing host process analysis.";
                rootCause = "Trojan execution.";
                classification = "**Category**: Malware\n- **Pattern**: Remote Access Trojan (RAT)\n- **Fidelity**: High";
                mitre = "- **Execution**: Shared Modules (T1129)\n- **Persistence**: Registry Run Keys (T1547.001)";
                iocs.addAll(extracted);
                techFindings = observedEvidenceText + "\n\n" +
                               "Technical Details: Forensic inspection indicates backdoor execution. Binary modifies local system startup registry locations to establish system persistence.";
                steps.addAll(Arrays.asList(
                    "Perform memory dump analysis to trace binary components.",
                    "Inspect local host registry run paths.",
                    "Review active network sockets."
                ));
                containment.addAll(Arrays.asList(
                    "Kill process executable files.",
                    "Isolate the machine from the local network segment."
                ));
                eradication.addAll(Arrays.asList(
                    "Delete malicious file footprints from directories.",
                    "Clear registry startup patch values."
                ));
                recovery.addAll(Arrays.asList(
                    "Perform system scan using updated antimalware databases.",
                    "Restore system registry values."
                ));
                impact = "Backdoor entry vector and potential lateral host pivoting.";
                decisionReminder = "Check system connection records to identify if external commands were received.";
                aiRecommendation = "Isolate the host, terminate the malicious process, and clear registry run additions.";
                nextAction = "Host isolation and process termination.";
                break;

            case WEB_SQLI:
                execSummary = "A SQL Injection payload attack was identified targeting public API paths from source IP " + primaryIP + ". The threat objective is unauthorized database querying. The incident is assigned to analyst " + (assignedAnalyst != null ? assignedAnalyst : "SOC Triage") + " and is undergoing active firewall triage.";
                classification = "**Category**: Web Attack\n- **Pattern**: SQL Injection (SQLi)\n- **Fidelity**: High";
                mitre = "- **Initial Access**: Exploit Public-Facing Application (T1190)\n- **Credential Access**: Database Query (T1565)";
                rootCause = "Unsanitized request parameters in public-facing API endpoints.";
                iocs.addAll(extracted);
                techFindings = observedEvidenceText + "\n\n" +
                               "Technical Details: WAF alert triggered for database syntax keywords in parameter fields. The application backend threw database access exception logs.";
                steps.addAll(Arrays.asList(
                    "Inspect HTTP server log queries.",
                    "Check database error logs for target queries.",
                    "Verify target code query configuration."
                ));
                containment.addAll(Arrays.asList(
                    "Add input filtering rules to WAF configuration.",
                    "Temporarily restrict the attacking IP address: " + primaryIP + "."
                ));
                eradication.addAll(Arrays.asList(
                    "Implement query parameterization in application code.",
                    "Filter database stack outputs."
                ));
                recovery.addAll(Arrays.asList(
                    "Deploy parameterized code updates.",
                    "Verify database row integrities."
                ));
                impact = "Leakage of database entries and possible administrator privileges hijack.";
                decisionReminder = "Examine if database logs show queries retrieving sensitive user data table structures.";
                aiRecommendation = "Block source IP " + primaryIP + " on firewall, apply query parameterized filters, and configure WAF SQL syntax bans.";
                nextAction = "Enable WAF blocking rules and verify query parameterization.";
                break;

            case IDENTITY_VPN:
                execSummary = "An anomalous VPN access session was identified for user " + userSec + " from source IP " + primaryIP + ". The threat objective is remote session hijacking. The incident is assigned to analyst " + (assignedAnalyst != null ? assignedAnalyst : "SOC Triage") + " and is undergoing location logon cross-reference.";
                classification = "**Category**: Identity Access\n- **Pattern**: VPN Access Anomaly\n- **Fidelity**: High";
                mitre = "- **Initial Access**: Valid Accounts (T1078.001 - Domain Accounts)\n- **Lateral Movement**: Remote Services (T1021)";
                rootCause = "VPN access credentials exposure.";
                iocs.addAll(extracted);
                techFindings = observedEvidenceText + "\n\n" +
                               "Technical Details: Successful logon session from source IP: " + primaryIP + ". The user was logged on elsewhere concurrently.";
                steps.addAll(Arrays.asList(
                    "Audit VPN source IP reputation.",
                    "Cross-reference user connection logs.",
                    "Contact the user " + userSec + " to verify travel status."
                ));
                containment.addAll(Arrays.asList(
                    "Terminate the active VPN connection session.",
                    "Disable user VPN profiles temporarily."
                ));
                eradication.addAll(Arrays.asList(
                    "Revoke user authentication tokens.",
                    "Force password resets."
                ));
                recovery.addAll(Arrays.asList(
                    "Reset MFA prompts for the user account: " + userSec + ".",
                    "Enforce geographical restriction rules."
                ));
                impact = "Unauthorized internal corporate subnet access.";
                decisionReminder = "Check if user workstation was active inside corporate office prior to VPN log events.";
                aiRecommendation = "Terminate active VPN sessions, suspend target credentials, and require MFA reset.";
                nextAction = "Terminate active VPN session and lock account.";
                break;

            case NETWORK_DDOS:
                execSummary = "A Distributed Denial of Service (DDoS) traffic flood was identified targeting corporate public gateways. The threat objective is network service exhaustion. The incident is assigned to analyst " + (assignedAnalyst != null ? assignedAnalyst : "SOC Triage") + " and is undergoing active scrubbing center routing.";
                classification = "**Category**: Network Security\n- **Pattern**: DDoS Traffic Flood\n- **Fidelity**: High";
                mitre = "- **Impact**: Network Denial of Service (T1498)\n- **Resource Hijacking**: Resource Exhaustion (T1496)";
                rootCause = "Distributed botnet traffic targeting public gateway IP addresses.";
                iocs.addAll(extracted);
                techFindings = observedEvidenceText + "\n\n" +
                               "Technical Details: High incoming UDP throughput exhausting local switch buffers. Firewall state tables reached capacity bounds.";
                steps.addAll(Arrays.asList(
                    "Determine targeted service IPs and ports.",
                    "Analyze incoming packet protocols (UDP/TCP/HTTP).",
                    "Check load balancer connection queues."
                ));
                containment.addAll(Arrays.asList(
                    "Activate cloud DDoS mitigation routing.",
                    "Enable rate-limiting traffic filters."
                ));
                eradication.addAll(Arrays.asList(
                    "Drop incoming botnet IP ranges.",
                    "Restrict non-regional traffic paths."
                ));
                recovery.addAll(Arrays.asList(
                    "Verify core switch states.",
                    "Restore standard bandwidth routing."
                ));
                impact = "Loss of service capability and web gateway downtime.";
                decisionReminder = "Ensure firewall configuration changes don't block legitimate administrative network access.";
                aiRecommendation = "Route traffic through external scrubbing centers and enable geographic firewall blocks.";
                nextAction = "Enable DDoS mitigation scrubbing.";
                break;

            case THREAT_INSIDER:
                execSummary = "Suspicious off-hours bulk data query transfers were identified from " + userSec + " workstation. The threat objective is proprietary data collection. The incident is assigned to analyst " + (assignedAnalyst != null ? assignedAnalyst : "SOC Triage") + " and is undergoing active directory access log audits.";
                classification = "**Category**: Insider Threat\n- **Pattern**: Unauthorized Data Collection\n- **Fidelity**: High";
                mitre = "- **Collection**: Data from Local System (T1005)\n- **Exfiltration**: Exfiltration Over Alternative Protocol (T1048)";
                rootCause = "Authorized user executing abnormal bulk query transfers.";
                iocs.addAll(extracted);
                techFindings = observedEvidenceText + "\n\n" +
                               "Technical Details: Active session logged to user workstation downloading large archives. Access patterns do not correlate with standard shift operations.";
                steps.addAll(Arrays.asList(
                    "Review target file access log parameters.",
                    "Track local system copy histories.",
                    "Verify user account roles."
                ));
                containment.addAll(Arrays.asList(
                    "Isolate the user device from the network.",
                    "Lock database access privileges."
                ));
                eradication.addAll(Arrays.asList(
                    "Revoke user credentials.",
                    "Delete local file dumps."
                ));
                recovery.addAll(Arrays.asList(
                    "Reset workspace device profiles.",
                    "Deploy data loss prevention filters."
                ));
                impact = "Severe risk of proprietary source code leakage and compliance penalties.";
                decisionReminder = "Coordinate with HR and legal departments before locking employee directory accounts.";
                aiRecommendation = "Network isolate the endpoint, suspend account database access, and inform security management.";
                nextAction = "Isolate employee workstation and lock access.";

            default:
                execSummary = "A security anomaly was identified, requiring analyst triage to analyze the alert context.";
                classification = "**Category**: " + (category != null ? category : "Other") + "\n- **Pattern**: Unclassified anomaly\n- **Fidelity**: Medium";
                mitre = "- **Defense Evasion**: Security Software Discovery (T1518.001)";
                rootCause = "Suspicious behavior matching security tool triggers.";
                iocs.addAll(Arrays.asList(
                    "Anomalous metric triggers: " + (seed % 100) + " alerts",
                    "Unrecognized event code"
                ));
                iocs.addAll(extracted);
                techFindings = "Event logs indicate anomalous host behavior or access sequences that deviate from baseline operations.";
                steps.addAll(Arrays.asList(
                    "Review target device logging paths.",
                    "Verify account permissions.",
                    "Contact the reporting user."
                ));
                containment.addAll(Arrays.asList(
                    "Put device on observation logs.",
                    "Limit admin access ports."
                ));
                eradication.addAll(Arrays.asList(
                    "Update definitions.",
                    "Clear system caches."
                ));
                recovery.addAll(Arrays.asList(
                    "Restore host files.",
                    "Monitor connection logs."
                ));
                impact = "Unknown risk; requires manual assessment.";
                baseRisk = "Medium";
                baseSeverityScore = 60;
                decisionReminder = "Assess analyst notes to determine if the activity is authorized administrative maintenance.";
                aiRecommendation = "Investigate event context manually, trace host process trees, and verify target permissions.";
                nextAction = "Manual analyst triage and log correlation.";
        }
        }
        
        // Enforce dynamic calculations of severity score and risk level
        baseSeverityScore = calculateDynamicSeverity(priority, totalIocs, hasCredHarvest, hasMacro, department, outcome, hasMalware, reportedBy, hasNetworkEvidence);
        if (baseSeverityScore >= 85) {
            baseRisk = "Critical";
        } else if (baseSeverityScore >= 70) {
            baseRisk = "High";
        } else if (baseSeverityScore < 40) {
            baseRisk = "Low";
        } else {
            baseRisk = "Medium";
        }
        
        String brand = "Generic";
        if (pattern == AttackPattern.PHISHING_DHL) brand = "DHL";
        else if (pattern == AttackPattern.PHISHING_TEAMS) brand = "Microsoft Teams";
        else if (pattern == AttackPattern.PHISHING_ADOBE) brand = "Adobe";
        else if (pattern == AttackPattern.PHISHING_SHAREPOINT) brand = "SharePoint";
        else if (pattern == AttackPattern.PHISHING_ONEDRIVE) brand = "OneDrive";
        else if (pattern == AttackPattern.PHISHING_OUTLOOK) brand = "Outlook";
        else if (pattern == AttackPattern.PHISHING_BANK) brand = "Bank";
        else if (pattern == AttackPattern.PHISHING_PASSWORD) brand = "Microsoft 365";
        else if (pattern == AttackPattern.PHISHING_BEC) brand = "Executive";
        else if (pattern == AttackPattern.PHISHING_HR) brand = "HR";

        // Calculate dynamic risk level
        String finalRisk = baseRisk;
        if ("Critical".equalsIgnoreCase(priority)) {
            finalRisk = "Critical";
        } else if ("High".equalsIgnoreCase(priority) && !"Critical".equalsIgnoreCase(baseRisk)) {
            finalRisk = "High";
        } else if ("Low".equalsIgnoreCase(priority)) {
            finalRisk = "Low";
        }
        
        // Assemble Lists to String formatting
        StringBuilder iocsText = new StringBuilder();
        for (String ioc : iocs) {
            iocsText.append("• ").append(ioc).append("\n");
        }
        if (iocsText.length() > 0) iocsText.setLength(iocsText.length() - 1);
        
        StringBuilder stepsText = new StringBuilder();
        for (String step : steps) {
            stepsText.append("- ").append(step).append("\n");
        }
        if (stepsText.length() > 0) stepsText.setLength(stepsText.length() - 1);
        
        StringBuilder contText = new StringBuilder();
        for (String cont : containment) {
            contText.append("- ").append(cont).append("\n");
        }
        if (contText.length() > 0) contText.setLength(contText.length() - 1);

        // Format and append clean plain-text sections (no **, ##, ###)
        
        // Evidence Summary Section (Available vs Missing Table)
        StringBuilder evSummary = new StringBuilder();
        evSummary.append("Evidence Summary\n");
        evSummary.append("Artifact | Status | Detail\n");
        List<String> hashes = extractHashes(description, analystNotes, resolutionSummary);
        if (isMalwareCat) {
            String processName = extractField(lowercaseContext, "process", "running process");
            String processId = extractField(lowercaseContext, "pid", "process id");
            String execPath = extractField(lowercaseContext, "path", "executable path");
            String hashVal = !hashes.isEmpty() ? hashes.get(0) : (evidence.filename != null ? evidence.filename : null);
            String regPersist = !extractRegistryKeys(description, analystNotes, resolutionSummary).isEmpty() ? extractRegistryKeys(description, analystNotes, resolutionSummary).get(0) : null;
            String schedTask = extractField(lowercaseContext, "scheduled task", "cron");
            String serviceName = extractField(lowercaseContext, "service", "systemd");
            String netConn = extractField(lowercaseContext, "connection", "port");
            String srcIp = evidence.ipAddress;
            String destIp = extractField(lowercaseContext, "destination ip", "c2 ip");
            String edrDet = extractField(lowercaseContext, "edr", "defender");
            String winEvt = extractField(lowercaseContext, "event log", "event");
            String sysmonEvt = extractField(lowercaseContext, "sysmon", "event id");

            evSummary.append("Running Process | ").append(processName != null ? "Available" : "Not Available").append(" | ").append(processName != null ? processName : "-").append("\n");
            evSummary.append("Process ID | ").append(processId != null ? "Available" : "Not Available").append(" | ").append(processId != null ? processId : "-").append("\n");
            evSummary.append("Executable Path | ").append(execPath != null ? "Available" : "Not Available").append(" | ").append(execPath != null ? execPath : "-").append("\n");
            evSummary.append("SHA256/MD5 Hash | ").append(hashVal != null ? "Available" : "Not Available").append(" | ").append(hashVal != null ? hashVal : "-").append("\n");
            evSummary.append("Registry Persistence | ").append(regPersist != null ? "Available" : "Not Available").append(" | ").append(regPersist != null ? regPersist : "-").append("\n");
            evSummary.append("Scheduled Tasks | ").append(schedTask != null ? "Available" : "Not Available").append(" | ").append(schedTask != null ? schedTask : "-").append("\n");
            evSummary.append("Services | ").append(serviceName != null ? "Available" : "Not Available").append(" | ").append(serviceName != null ? serviceName : "-").append("\n");
            evSummary.append("Network Connections | ").append(netConn != null ? "Available" : "Not Available").append(" | ").append(netConn != null ? netConn : "-").append("\n");
            evSummary.append("Source IP | ").append(srcIp != null ? "Available" : "Not Available").append(" | ").append(srcIp != null ? srcIp : "-").append("\n");
            evSummary.append("Destination IP | ").append(destIp != null ? "Available" : "Not Available").append(" | ").append(destIp != null ? destIp : "-").append("\n");
            evSummary.append("EDR Detection | ").append(edrDet != null ? "Available" : "Not Available").append(" | ").append(edrDet != null ? edrDet : "-").append("\n");
            evSummary.append("Windows Event Logs | ").append(winEvt != null ? "Available" : "Not Available").append(" | ").append(winEvt != null ? winEvt : "-").append("\n");
            evSummary.append("Sysmon Events | ").append(sysmonEvt != null ? "Available" : "Not Available").append(" | ").append(sysmonEvt != null ? sysmonEvt : "-");
        } else {
            evSummary.append("Sender | ").append(evidence.email != null ? "Available" : "Not Available").append(" | ").append(evidence.email != null ? evidence.email : "-").append("\n");
            evSummary.append("Domain | ").append(evidence.domain != null ? "Available" : "Not Available").append(" | ").append(evidence.domain != null ? evidence.domain : "-").append("\n");
            evSummary.append("URL | ").append(evidence.url != null ? "Available" : "Not Available").append(" | ").append(evidence.url != null ? evidence.url : "-").append("\n");
            evSummary.append("DNS Logs | ").append(evidence.domain != null ? "Available" : "Not Available").append(" | ").append(evidence.domain != null ? "Resolved queries to " + evidence.domain : "-").append("\n");
            evSummary.append("Proxy Logs | ").append(evidence.domain != null ? "Available" : "Not Available").append(" | ").append(evidence.domain != null ? "Sessions to " + evidence.domain + " tracked" : "-").append("\n");
            
            boolean authAvailable = (outcome == IncidentOutcome.CONFIRMED_COMPROMISE);
            evSummary.append("Authentication Logs | ").append(authAvailable ? "Available" : "Not Available").append(" | ").append(authAvailable ? "Successful logon events detected" : "-").append("\n");
            
            boolean hashAvailable = (!hashes.isEmpty() || evidence.filename != null);
            String hashDetail = !hashes.isEmpty() ? hashes.get(0) : (evidence.filename != null ? evidence.filename : "-");
            evSummary.append("Attachment Hash | ").append(hashAvailable ? "Available" : "Not Available").append(" | ").append(hashDetail).append("\n");
            
            evSummary.append("Endpoint Telemetry | ").append(authAvailable ? "Available" : "Not Available").append(" | ").append(authAvailable ? "Session activity logged" : "-");
        }

        // 12 UI Sections assembly

        // 1. Executive Incident Summary
        String sec1 = "Executive Incident Summary\n" + execSummary;

        // 2. Threat Classification (remove any markdown)
        String cleanClassification = classification.replace("**", "").replace("##", "").replace("###", "").replace("- ", "");
        String sec2 = "Threat Classification\n" + cleanClassification;

        // 3. Evidence Summary
        String sec3 = evSummary.toString();

        // 4. Technical Findings
        String cleanTechFindings = techFindings.replace("**", "").replace("##", "").replace("###", "");
        String sec4 = "Technical Findings\n" + cleanTechFindings;

        // 5. Investigation Steps
        String sec5 = "Investigation Steps\n" + stepsText.toString();

        // 6. Containment
        String sec6 = "Containment\n" + contText.toString();

        // 7. Eradication
        StringBuilder eradicationText = new StringBuilder();
        for (String erad : eradication) {
            eradicationText.append("- ").append(erad).append("\n");
        }
        if (eradicationText.length() > 0) eradicationText.setLength(eradicationText.length() - 1);
        String sec7 = "Eradication\n" + eradicationText.toString();

        // 8. Recovery
        StringBuilder recoveryText = new StringBuilder();
        for (String rec : recovery) {
            recoveryText.append("- ").append(rec).append("\n");
        }
        if (recoveryText.length() > 0) recoveryText.setLength(recoveryText.length() - 1);
        String sec8 = "Recovery\n" + recoveryText.toString();

        // 9. Business Impact
        String sec9 = "Business Impact\n" + impact;

        // 10. Risk Assessment
        String severityWord = "Medium";
        if (baseSeverityScore >= 85) {
            severityWord = "Critical";
        } else if (baseSeverityScore >= 70) {
            severityWord = "High";
        } else if (baseSeverityScore < 40) {
            severityWord = "Low";
        }

        StringBuilder riskAss = new StringBuilder();
        riskAss.append("Risk Assessment\n");
        riskAss.append("Risk Score: ").append(baseSeverityScore).append("/100\n");
        riskAss.append("Explanation: Score is determined by incident category ").append(category != null ? category : "Phishing");
        if (totalIocs > 0) riskAss.append(", presence of ").append(totalIocs).append(" indicator(s)");
        if (isMalwareCat) {
            riskAss.append(", and malware severity classified as ").append(severityWord);
        } else {
            if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
                riskAss.append(", confirmed credential theft indicators, and successful authentication anomalies");
            } else if (outcome == IncidentOutcome.USER_INTERACTION_ONLY) {
                riskAss.append(", user interaction only, and lack of authentication anomalies");
            } else {
                riskAss.append(", unconfirmed interaction status, and no observed credential compromise");
            }
            if (hasMacro) riskAss.append(", and potential macro malware indicators");
        }
        String sec10 = riskAss.toString();

        // 11. AI Recommendation (grouped)
        StringBuilder aiRec = new StringBuilder();
        if (isMalwareCat) {
            aiRec.append("AI Recommendation\n");
            aiRec.append("Immediate Actions:\n");
            aiRec.append("- Isolate Endpoint: ").append(primaryIP != null && !primaryIP.equals("Not available") ? primaryIP : (primaryUser != null && !primaryUser.equals("Not available") ? primaryUser : "Not Available")).append("\n");
            aiRec.append("- Kill Malicious Process\n");
            aiRec.append("- Quarantine File: ").append(evidence.filename != null ? evidence.filename : "Not Available").append("\n");
            aiRec.append("Short-Term Actions:\n");
            aiRec.append("- Remove Persistence\n");
            aiRec.append("- Run Full EDR Scan\n");
            aiRec.append("- Collect Memory Dump\n");
            aiRec.append("Long-Term Actions:\n");
            aiRec.append("- Block IOC Hash: ").append(!hashes.isEmpty() ? hashes.get(0) : "Not Available").append("\n");
            aiRec.append("- Block C2 IP: ").append(primaryIP != null && !primaryIP.equals("Not available") ? primaryIP : "Not Available").append("\n");
            aiRec.append("- Verify Lateral Movement");
        } else {
            aiRec.append("AI Recommendation\n");
            aiRec.append("Immediate Actions:\n");
            if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
                aiRec.append("- Reset password for User: ").append(userSec).append("\n");
                aiRec.append("- Revoke active logon sessions for User: ").append(userSec).append("\n");
            } else {
                aiRec.append("- Block sender: ").append(emailSec).append("\n");
                aiRec.append("- Block domain: ").append(domainSec).append("\n");
            }
            aiRec.append("Short-Term Actions:\n");
            aiRec.append("- Review Azure AD logs for User: ").append(userSec).append("\n");
            aiRec.append("- Review Defender alerts\n");
            aiRec.append("Long-Term Actions:\n");
            aiRec.append("- Enforce multi-factor authentication (MFA)\n");
            aiRec.append("- Deploy user security awareness training regarding ").append(brand).append(" lures");
        }
        String sec11 = aiRec.toString();

        // 12. Incident Assessment
        int classConf = finalConfidence;
        int evConf = 35;
        if (totalIocs > 2 && hasNetworkEvidence) {
            evConf = 85;
        } else if (totalIocs > 0) {
            evConf = 62;
        }
        int overallConf = (classConf + evConf) / 2;

        String classVal = "Suspected Phishing";
        if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
            classVal = "Confirmed Threat";
        } else if (category != null && !category.toUpperCase().contains("PHISHING")) {
            classVal = "Potential Threat";
        }

        String compromiseVal = "Not Confirmed";
        if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
            compromiseVal = "Confirmed";
        }

        String decisionVal = "Continue Monitoring";
        if (baseSeverityScore >= 80) {
            decisionVal = "Immediate Containment Required";
        } else if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
            decisionVal = "Remediate and Close";
        }

        StringBuilder assessment = new StringBuilder();
        assessment.append("Incident Assessment\n");
        assessment.append("Classification: ").append(classVal).append("\n");
        assessment.append("Compromise Status: ").append(compromiseVal).append("\n");
        assessment.append("Investigation Status: Active\n");
        assessment.append("Recommended Decision: ").append(decisionVal).append("\n");
        assessment.append("Overall Confidence: ").append(overallConf).append("%\n");
        assessment.append("Classification Confidence: ").append(classConf).append("%\n");
        assessment.append("Evidence Confidence: ").append(evConf).append("%");
        String sec12 = assessment.toString();

        // Map to standard MySQL database columns
        analysis.put("executiveSummary", sec1 + "\n\n" + sec2);
        analysis.put("keyIndicators", sec3);
        analysis.put("possibleRootCause", sec4);
        analysis.put("investigationSteps", sec5);
        analysis.put("containmentRecommendations", sec6 + "\n\n" + sec7 + "\n\n" + sec8);
        analysis.put("businessImpact", sec9 + "\n\n" + sec10 + "\n\n" + sec11 + "\n\n" + sec12);
        analysis.put("riskLevel", finalRisk);
        analysis.put("confidenceScore", overallConf + "% [Classification: " + classConf + "% | Evidence: " + evConf + "% | Overall: " + overallConf + "%]");

        return analysis;
    }

    private int calculateDynamicSeverity(
            String priority, int iocCount, boolean hasCredHarvest, boolean hasMacro, String department,
            IncidentOutcome outcome, boolean hasMalware, String reportedBy, boolean hasNetworkEvidence
    ) {
        int score = 50; // Medium base
        if ("Critical".equalsIgnoreCase(priority)) {
            score = 85;
        } else if ("High".equalsIgnoreCase(priority)) {
            score = 70;
        } else if ("Low".equalsIgnoreCase(priority)) {
            score = 30;
        }
        
        score += Math.min(10, iocCount * 2);
        if (hasCredHarvest) score += 5;

        if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
            score += 25;
        } else if (outcome == IncidentOutcome.USER_INTERACTION_ONLY) {
            score += 12;
        } else if (outcome == IncidentOutcome.ATTEMPTED_PHISHING) {
            score -= 10;
        }

        if (hasMalware || hasMacro) {
            score += 15;
        }

        if (reportedBy != null) {
            String roleLower = reportedBy.toLowerCase();
            if (roleLower.contains("admin") || roleLower.contains("system") || roleLower.contains("director") || roleLower.contains("vp") || roleLower.contains("ceo")) {
                score += 15;
            }
        }
        if (department != null) {
            String deptLower = department.toLowerCase();
            if (deptLower.contains("finance") || deptLower.contains("it") || deptLower.contains("management")) {
                score += 5;
            }
        }

        if (hasNetworkEvidence || iocCount > 0) {
            score += Math.min(8, iocCount * 2);
        }

        return Math.min(100, Math.max(10, score));
    }

    private int calculateDynamicConfidence(
            int iocCount, String description, String title, String source, AttackPattern pattern, 
            IncidentOutcome outcome, boolean hasNetworkEvidence
    ) {
        if (outcome != IncidentOutcome.INCONCLUSIVE && iocCount > 0 && hasNetworkEvidence) {
            int score = 92;
            if (description != null && description.length() > 150) score += 4;
            if (iocCount > 2) score += 2;
            return Math.min(98, Math.max(90, score));
        }
        
        if (pattern != AttackPattern.OTHER && description != null && description.length() > 80) {
            int score = 80;
            if (iocCount > 0) score += 5;
            if (outcome != IncidentOutcome.INCONCLUSIVE) score += 3;
            return Math.min(89, Math.max(75, score));
        }
        
        if (description != null && description.length() > 30) {
            int score = 65;
            if (iocCount > 0) score += 5;
            return Math.min(74, Math.max(60, score));
        }

        return 55;
    }

    private String buildObservedEvidence(IncidentEvidence evidence, IncidentOutcome outcome, boolean hasMacro) {
        StringBuilder findings = new StringBuilder();
        findings.append("Observed Evidence:\n");
        
        findings.append("• Sender: ").append(evidence.email != null ? evidence.email : "Not available in collected evidence").append("\n");
        findings.append("• Domain: ").append(evidence.domain != null ? evidence.domain : "Not available in collected evidence").append("\n");
        findings.append("• Source IP: ").append(evidence.ipAddress != null ? evidence.ipAddress : "Not available in collected evidence").append("\n");
        findings.append("• Attachment: ").append(evidence.filename != null ? evidence.filename : "Not available in collected evidence").append("\n");
        findings.append("• Target User: ").append(evidence.username != null ? evidence.username : "Not available in collected evidence").append("\n");
        findings.append("• URL: ").append(evidence.url != null ? evidence.url : "Not available in collected evidence").append("\n");

        if (outcome == IncidentOutcome.ATTEMPTED_PHISHING) {
            findings.append("• Credentials Entered: Not available in collected evidence\n");
            findings.append("• Malware Download: Not available in collected evidence\n");
            findings.append("• Session Hijacking: Not available in collected evidence\n");
            findings.append("• OAuth Access: Not available in collected evidence\n");
        } else if (outcome == IncidentOutcome.USER_INTERACTION_ONLY) {
            findings.append("• Credentials Entered: Not available in collected evidence (User clicked link, no submission confirmed)\n");
            findings.append("• Malware Download: Not available in collected evidence\n");
            findings.append("• Session Hijacking: Not available in collected evidence\n");
            findings.append("• OAuth Access: Not available in collected evidence\n");
        } else if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
            findings.append("• Credentials Entered: Confirmed / Submitted\n");
            findings.append("• Malware Download: ").append(hasMacro ? "Macro document observed" : "Not available in collected evidence").append("\n");
            findings.append("• Session Hijacking: Potential risk / Suspected logon activity\n");
            findings.append("• OAuth Access: Check consent requests\n");
        } else {
            findings.append("• Credentials Entered: Not available in collected evidence\n");
            findings.append("• Malware Download: Not available in collected evidence\n");
            findings.append("• Session Hijacking: Not available in collected evidence\n");
            findings.append("• OAuth Access: Not available in collected evidence\n");
        }

        if (evidence.domain != null) {
            findings.append("• DNS Query Logs: Resolved queries to ").append(evidence.domain).append("\n");
            findings.append("• Proxy Connection Logs: Sessions to ").append(evidence.domain).append(" tracked\n");
        } else {
            findings.append("• DNS Query Logs: Not available in collected evidence\n");
            findings.append("• Proxy Connection Logs: Not available in collected evidence\n");
        }
        if (evidence.ipAddress != null) {
            findings.append("• Host Firewalls: Logged sessions from ").append(evidence.ipAddress).append("\n");
        } else {
            findings.append("• Host Firewalls: Not available in collected evidence\n");
        }
        
        findings.append("• Authentication Logs: ").append(outcome == IncidentOutcome.CONFIRMED_COMPROMISE ? "Successful logon events detected" : "Not available in collected evidence").append("\n");

        findings.append("\nAssessment:\n");
        if (outcome == IncidentOutcome.ATTEMPTED_PHISHING) {
            findings.append("• Phishing email was reported before any interaction occurred.\n");
            findings.append("• No evidence that credentials were submitted.\n");
            findings.append("• Account compromise cannot currently be confirmed.\n");
        } else if (outcome == IncidentOutcome.USER_INTERACTION_ONLY) {
            findings.append("• User interacted with email link, routing to external infrastructure.\n");
            findings.append("• No evidence of credential transmission is available.\n");
            findings.append("• Account compromise cannot currently be confirmed.\n");
        } else if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
            findings.append("• Compromise is confirmed based on user credential submission / login events.\n");
            findings.append("• Account protection actions are required immediately.\n");
        } else {
            findings.append("• Evidence is insufficient to determine compromise status.\n");
            findings.append("• Continued log auditing is recommended.\n");
        }

        return findings.toString().trim();
    }

    private static class PhishingTemplate {
        String execSummary;
        String classification;
        String mitre;
        String rootCause;
        String techFindingsSuffix;
        List<String> steps = new ArrayList<>();
        List<String> containment = new ArrayList<>();
        List<String> eradication = new ArrayList<>();
        List<String> recovery = new ArrayList<>();
        String impact;
        String decisionReminder;
        String aiRecommendation;
        String nextAction;
    }

    private PhishingTemplate buildPhishingAnalysis(
            AttackPattern pattern, IncidentEvidence evidence, String identitySystem, String proxyGateway, 
            String emailGateway, String endpointPlatform, String credentialTerm, IncidentOutcome outcome,
            String assignedAnalyst, String department
    ) {
        PhishingTemplate t = new PhishingTemplate();
        String domainSec = evidence.domain != null ? evidence.domain : "Not Available";
        String emailSec = evidence.email != null ? evidence.email : "Not Available";
        String attachmentSec = evidence.filename != null ? evidence.filename : "Not Available";
        String ipSec = evidence.ipAddress != null ? evidence.ipAddress : "Not Available";
        String userSec = evidence.username != null ? evidence.username : "Not Available";

        String brand = "Generic";
        String channel = "email secure document redirect lure";
        String lureName = "malicious link";
        String mitreCompromiseTechnique = "Credential Access: Session Credentials (T1539)";
        
        switch (pattern) {
            case PHISHING_DHL:
                brand = "DHL shipment tracking portal";
                channel = "DHL delivery alert link";
                lureName = "shipment tracking link";
                mitreCompromiseTechnique = "Credential Access: Session Credentials (T1539)";
                break;
            case PHISHING_TEAMS:
                brand = "Microsoft Teams alert portal";
                channel = "Teams chat notification spoof";
                lureName = "lookalike alert panel";
                mitreCompromiseTechnique = "Defense Evasion: Obfuscated Files or Information (T1027)";
                break;
            case PHISHING_ADOBE:
                brand = "Adobe Document Cloud";
                channel = "PDF secure document redirect lure";
                lureName = "Adobe credential portal redirect";
                mitreCompromiseTechnique = "Credential Access: Input Capture (T1056)";
                break;
            case PHISHING_SHAREPOINT:
                brand = "Microsoft SharePoint sharing link";
                channel = "SharePoint document sharing alert";
                lureName = "unauthorized file folder link";
                mitreCompromiseTechnique = "Credential Access: Valid Accounts (T1078)";
                break;
            case PHISHING_ONEDRIVE:
                brand = "Microsoft OneDrive portal link";
                channel = "OneDrive file storage spoof";
                lureName = "lookalike storage redirect";
                mitreCompromiseTechnique = "Credential Access: Valid Accounts (T1078)";
                break;
            case PHISHING_OUTLOOK:
                brand = "Outlook / OWA login page";
                channel = "Exchange web login brand spoof";
                lureName = "OWA spoofed interface page";
                mitreCompromiseTechnique = "Credential Access: Input Capture (T1056)";
                break;
            case PHISHING_BANK:
                brand = "Banking transfer gateway";
                channel = "financial bank notification brand spoof";
                lureName = "fake transaction verification page";
                mitreCompromiseTechnique = "Credential Access: Valid Accounts (T1078)";
                break;
            case PHISHING_PASSWORD:
                brand = "internal IT password expiration page";
                channel = "internal password renewal spoof";
                lureName = "lookalike renewal form";
                mitreCompromiseTechnique = "Credential Access: Input Capture (T1056)";
                break;
            case PHISHING_BEC:
                brand = "executive communications invoice redirection";
                channel = "BEC invoice payment change request";
                lureName = "spoofed executive email thread";
                mitreCompromiseTechnique = "Credential Access: Valid Accounts (T1078)";
                break;
            case PHISHING_HR:
                brand = "HR Payroll attachment lure";
                channel = "macro-enabled HR spreadsheet";
                lureName = "macro workbook";
                mitreCompromiseTechnique = "Execution: Command and Scripting Interpreter (T1059)";
                break;
            default:
                brand = "generic credential harvesting portal";
                channel = "phishing link lure";
                lureName = "malicious portal";
                mitreCompromiseTechnique = "Credential Access: Input Capture (T1056)";
                break;
        }

        // scenario-specific business impact
        String scenarioImpact = "Credential theft";
        switch (pattern) {
            case PHISHING_ADOBE:
            case PHISHING_PASSWORD:
            case PHISHING_OUTLOOK:
                scenarioImpact = "Credential theft. Corporate account compromise.";
                break;
            case PHISHING_TEAMS:
            case PHISHING_ONEDRIVE:
                scenarioImpact = "OAuth abuse. Cloud account compromise.";
                break;
            case PHISHING_HR:
                scenarioImpact = "Payroll fraud. Financial exposure.";
                break;
            case PHISHING_BANK:
            case PHISHING_BEC:
                scenarioImpact = "Financial fraud. Fraudulent fund transfers.";
                break;
            case PHISHING_SHAREPOINT:
                scenarioImpact = "Document theft. Unauthorized access to shared repositories.";
                break;
            default:
                scenarioImpact = "Credential theft. Potential unauthorized access.";
                break;
        }

        // Highly scenario-specific investigation steps
        List<String> specificSteps = new ArrayList<>();
        switch (pattern) {
            case PHISHING_DHL:
                specificSteps.addAll(Arrays.asList(
                    "Verify DHL delivery tracking link domain validity.",
                    "Analyze email headers to identify spoofing vectors.",
                    "Review proxy logs for DHL lookalike redirects.",
                    "Confirm if user entered credentials on the tracking form."
                ));
                break;
            case PHISHING_TEAMS:
                specificSteps.addAll(Arrays.asList(
                    "Audit Teams chat notification payload for external links.",
                    "Check user's Teams access logs and message sender identity.",
                    "Inspect user's Active Directory sign-in activity.",
                    "Review Teams app permission grants and active logins."
                ));
                break;
            case PHISHING_ADOBE:
                specificSteps.addAll(Arrays.asList(
                    "Examine PDF document attachment for embedded URLs.",
                    "Audit Adobe Cloud identity portal access logs.",
                    "Review proxy logs for Adobe secure file share lures.",
                    "Verify target account credentials change logs."
                ));
                break;
            case PHISHING_SHAREPOINT:
                specificSteps.addAll(Arrays.asList(
                    "Audit SharePoint file sharing events for external domains.",
                    "Review document repository access histories for target folders.",
                    "Verify proxy logs for spoofed SharePoint lookalikes.",
                    "Audit active OneDrive and SharePoint sessions."
                ));
                break;
            case PHISHING_HR:
                specificSteps.addAll(Arrays.asList(
                    "Analyze macro workbook payload in sandbox environment.",
                    "Inspect system process tree on user workstation for macro spawn activity.",
                    "Review local file access history for payroll details.",
                    "Audit outbound internet sockets for unauthorized transfers."
                ));
                break;
            case PHISHING_ONEDRIVE:
                specificSteps.addAll(Arrays.asList(
                    "Audit OneDrive sign-in logs and active directories.",
                    "Search mail gateway for OneDrive brand spoofing lures.",
                    "Review proxy logs for OneDrive lookalike domains.",
                    "Check target account for OAuth application consents."
                ));
                break;
            case PHISHING_OUTLOOK:
                specificSteps.addAll(Arrays.asList(
                    "Audit Exchange OWA access logs for geographic sign-in anomalies.",
                    "Examine OWA redirection URLs inside the target message.",
                    "Check for user password change actions.",
                    "Audit mailbox rules adjustments for auto-forwarding."
                ));
                break;
            case PHISHING_BANK:
                specificSteps.addAll(Arrays.asList(
                    "Analyze financial transaction gateway spoofing URLs.",
                    "Audit banking transfer access attempts.",
                    "Review proxy sockets for external financial services.",
                    "Review authentication alerts for target accountant accounts."
                ));
                break;
            case PHISHING_PASSWORD:
                specificSteps.addAll(Arrays.asList(
                    "Audit internal password expiration portal redirect URLs.",
                    "Verify user credential updates on identity services.",
                    "Check Active Directory password change logs for anomalies.",
                    "Review security logs for abnormal login attempts."
                ));
                break;
            case PHISHING_BEC:
                specificSteps.addAll(Arrays.asList(
                    "Examine spoofed executive email thread headers.",
                    "Cross-reference SPF/DKIM/DMARC validation failures.",
                    "Verify payroll or invoice change request authorization.",
                    "Review financial transaction status flags."
                ));
                break;
            default:
                specificSteps.addAll(Arrays.asList(
                    "Review email gateway logs for sender " + emailSec + ".",
                    "Audit proxy connections to " + domainSec + ".",
                    "Verify user authentication actions for target User: " + userSec + ".",
                    "Inspect active authentication locations."
                ));
                break;
        }

        if (outcome == IncidentOutcome.ATTEMPTED_PHISHING) {
            t.execSummary = "A phishing email impersonating " + brand + " attempted to lure the employee into entering credentials through a spoofed login page. The employee recognized and reported the phishing attempt before interacting. There is currently no evidence that credentials were compromised. Session hijacking could not be confirmed.";
            t.classification = "Category: Phishing\nPattern: Attempted Phishing Incident (" + pattern + ")\nFidelity: High";
            t.mitre = "Initial Access: Phishing: Spearphishing Link (T1566.002)";
            if (pattern == AttackPattern.PHISHING_HR) {
                t.mitre = "Initial Access: Phishing: Spearphishing Attachment (T1566.001)";
            }
            t.rootCause = "A phishing email impersonating " + brand + " attempted to redirect the user to a credential harvesting portal using sender " + emailSec + " and destination domain " + domainSec + ". Target User: " + userSec + ".";
            t.techFindingsSuffix = "Technical Details: Phishing email containing " + channel + " directed target to " + domainSec + ". User flagged the lure (" + lureName + ") and reported the message before credential entry.";
            
            t.steps.addAll(specificSteps);
            
            t.containment.addAll(Arrays.asList(
                "Block sender " + emailSec + ".",
                "Block domain " + domainSec + ".",
                "Quarantine emails containing " + brand + " phishing indicators.",
                "Hunt for similar emails across organization."
            ));
            
            t.eradication.addAll(Arrays.asList(
                "Remove phishing emails from inbox.",
                "Update gateway detections.",
                "Block extracted IoCs."
            ));
            
            t.recovery.addAll(Arrays.asList(
                "Send security awareness reminder regarding " + brand + " lures to User: " + userSec + ".",
                "Continue monitoring user login activity.",
                "Validate email protection policies."
            ));
            
            t.impact = "No confirmed compromise at this stage. Potential risk of: " + scenarioImpact;
            t.decisionReminder = "Verify if password updates or authentication requests occurred prior to closing.";
            t.aiRecommendation = "Quarantine sender " + emailSec + " and block domain " + domainSec + ". Monitor Microsoft 365 sign-ins for User: " + userSec + ". Review Azure AD sign-in logs. No credentials reset is required because user did not enter credentials.";
            t.nextAction = "Block sender " + emailSec + " and domain " + domainSec + ", then close incident.";
            
        } else if (outcome == IncidentOutcome.USER_INTERACTION_ONLY) {
            t.execSummary = "A phishing email impersonating " + brand + " targeted the employee. The user interacted with the phishing infrastructure (clicked the link), but credential compromise has not been confirmed. Session hijacking could not be confirmed.";
            t.classification = "Category: Phishing\nPattern: User Interaction Only (" + pattern + ")\nFidelity: High";
            t.mitre = "Initial Access: Phishing: Spearphishing Link (T1566.002)";
            if (pattern == AttackPattern.PHISHING_HR) {
                t.mitre = "Initial Access: Phishing: Spearphishing Attachment (T1566.001)";
            }
            t.rootCause = "A phishing email impersonating " + brand + " redirected User: " + userSec + " to a credential harvesting portal using sender " + emailSec + " and destination domain " + domainSec + ". Interaction confirmed (link clicked), but credential submission could not be confirmed.";
            t.techFindingsSuffix = "Technical Details: User clicked the link in " + channel + " routing to " + domainSec + ". No confirmation of credential entry at this stage.";
            
            t.steps.addAll(specificSteps);
            
            t.containment.addAll(Arrays.asList(
                "Block sender " + emailSec + ".",
                "Block malicious domain " + domainSec + ".",
                "Quarantine emails containing " + brand + " phishing indicators."
            ));
            
            t.eradication.addAll(Arrays.asList(
                "Remove phishing emails from inbox.",
                "Update gateway detections.",
                "Block lookalike domains."
            ));
            
            t.recovery.addAll(Arrays.asList(
                "Continue monitoring user login activity.",
                "Validate endpoint integrity and security health status."
            ));
            
            t.impact = "Potential credential exposure. Authentication review required. Moderate risk. Potential risk of: " + scenarioImpact;
            t.decisionReminder = "Monitor authentication logs and verify if user subsequently attempted login.";
            t.aiRecommendation = "Monitor Microsoft 365 sign-ins for User: " + userSec + ". Block domain " + domainSec + ". Quarantine sender " + emailSec + ". Review Azure AD sign-in logs.";
            t.nextAction = "Initiate proxy log and authentication auditing for User: " + userSec + ".";
            
        } else if (outcome == IncidentOutcome.CONFIRMED_COMPROMISE) {
            t.execSummary = "A brand impersonation campaign posing as " + brand + " targeted " + userSec + ". Credentials were likely compromised, and subsequent login / session access was confirmed. Session hijacking is suspected.";
            t.classification = "Category: Phishing\nPattern: Confirmed Compromise Incident (" + pattern + ")\nFidelity: Critical";
            t.mitre = "Initial Access: Phishing: Spearphishing Link (T1566.002)\nCredential Access: Valid Accounts (T1078)\n" + mitreCompromiseTechnique;
            if (pattern == AttackPattern.PHISHING_HR) {
                t.mitre = "Initial Access: Phishing: Spearphishing Attachment (T1566.001)\nExecution: User Execution (T1204.002)\n" + mitreCompromiseTechnique;
            }
            t.rootCause = "Phishing campaign impersonating " + brand + " resulted in compromised credentials for account User: " + userSec + ". Sender: " + emailSec + ". Destination Domain: " + domainSec + ".";
            t.techFindingsSuffix = "Technical Details: Phishing email posing as " + brand + " targeted User: " + userSec + " redirecting traffic to " + domainSec + ". User credentials entered and session compromise identified.";
            
            t.steps.addAll(specificSteps);
            
            t.containment.addAll(Arrays.asList(
                "Reset password for User: " + userSec + ".",
                "Revoke active sessions and refresh tokens for User: " + userSec + ".",
                "Disable user account User: " + userSec + " temporarily if suspicious activity continues.",
                "Remove associated OAuth application permissions for User: " + userSec + "."
            ));
            
            t.eradication.addAll(Arrays.asList(
                "Remove persistence mechanisms on account profiles.",
                "Reset credentials on " + identitySystem + ".",
                "Remove associated malicious OAuth applications."
            ));
            
            t.recovery.addAll(Arrays.asList(
                "Restore account integrity states.",
                "Enable MFA and enforce conditional access policies.",
                "Monitor login activity for persistence indicators.",
                "Validate endpoint security status using " + endpointPlatform + "."
            ));
            
            t.impact = "Corporate identity compromise. Potential unauthorized cloud access. Potential lateral movement. Confirmed: " + scenarioImpact;
            t.decisionReminder = "Verify if foreign authentication events or mailbox rules adjustments occurred on User: " + userSec + ".";
            t.aiRecommendation = "Execute immediate credentials reset for User: " + userSec + ", revoke active logon sessions, remove associated OAuth consent grants, and block domain " + domainSec + ". Monitor Microsoft 365 sign-ins for User: " + userSec + ". Review Azure AD sign-in logs.";
            t.nextAction = "Initiate credential rotate and session revocation for User: " + userSec + ".";
        } else {
            t.execSummary = "A phishing email campaign posing as " + brand + " targeted " + userSec + ". Evidence of successful user interaction, credential transmission, or account compromise is inconclusive and could not be confirmed at this stage. Session hijacking could not be confirmed.";
            t.classification = "Category: Phishing\nPattern: Unverified Phishing Alert (" + pattern + ")\nFidelity: Medium";
            t.mitre = "Initial Access: Phishing: Spearphishing Link (T1566.002)";
            if (pattern == AttackPattern.PHISHING_HR) {
                t.mitre = "Initial Access: Phishing: Spearphishing Attachment (T1566.001)";
            }
            t.rootCause = "Phishing campaign impersonating " + brand + " targeting User: " + userSec + ". Credential transmission is unconfirmed. Destination Domain: " + domainSec + ".";
            t.techFindingsSuffix = "Technical Details: Phishing email containing " + channel + " directed target to " + domainSec + ". Credential submission could not be confirmed. No evidence of successful authentication.";
            
            t.steps.addAll(specificSteps);
            
            t.containment.addAll(Arrays.asList(
                "Block sender " + emailSec + ".",
                "Block domain " + domainSec + ".",
                "Quarantine emails containing " + brand + " phishing indicators."
            ));
            
            t.eradication.addAll(Arrays.asList(
                "Remove phishing emails from inbox.",
                "Update gateway detections."
            ));
            
            t.recovery.addAll(Arrays.asList(
                "Monitor user login activity.",
                "Validate email protection policies."
            ));
            
            t.impact = "Potential credential theft. Potential unauthorized access. No confirmed compromise at this stage. Potential risk of: " + scenarioImpact;
            t.decisionReminder = "Assess gateway logs and authentication history to verify interaction status before closing.";
            t.aiRecommendation = "Monitor Microsoft 365 sign-ins for User: " + userSec + ". Block domain " + domainSec + ". Quarantine sender " + emailSec + ". Review Azure AD sign-in logs.";
            t.nextAction = "Initiate proxy log and authentication auditing for User: " + userSec + ".";
        }
        
        return t;
    }

    private String extractField(String context, String keyword, String displayKeyword) {
        if (context == null || context.isEmpty()) return null;
        int idx = context.indexOf(keyword.toLowerCase());
        if (idx != -1) {
            int start = Math.max(0, idx - 10);
            int end = Math.min(context.length(), idx + keyword.length() + 30);
            String snippet = context.substring(start, end).trim();
            return "Observed: ..." + snippet.replace("\n", " ").replace("\r", " ") + "...";
        }
        return null;
    }
}
