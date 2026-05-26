import { FrameworkType, FrameworkData, AuditControl, Activity, ControlStatus } from '../src/types';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const FRAMEWORK_DOMAINS: Record<FrameworkType, { domain: string; subDomains: string[]; controls: string[] }[]> = {
  ITGC: [
    {
      domain: 'Access Management',
      subDomains: ['User Provisioning', 'Privileged Access', 'Access Review'],
      controls: [
        'Formal user access provisioning and de-provisioning process exists and is enforced.',
        'Privileged access is restricted to authorized personnel with documented approval.',
        'Periodic user access reviews are conducted and documented at least quarterly.',
        'Multi-factor authentication is enforced for all privileged and remote access.',
        'Generic/shared accounts are prohibited or controlled with compensating controls.',
      ],
    },
    {
      domain: 'Change Management',
      subDomains: ['Change Request', 'Testing & Approval', 'Emergency Changes'],
      controls: [
        'All changes to production systems go through a formal change request process.',
        'Changes are tested in a non-production environment before deployment.',
        'Change approval is documented with sign-off from authorized change managers.',
        'Emergency change procedures are defined and usage is reviewed post-implementation.',
        'Segregation of duties is maintained between developers and production access.',
      ],
    },
    {
      domain: 'Backup & Recovery',
      subDomains: ['Backup Policy', 'Restore Testing', 'Offsite Storage'],
      controls: [
        'Backup procedures are documented and backups are scheduled per policy.',
        'Backup completion is monitored and failures are investigated and resolved.',
        'Restore tests are performed periodically to confirm backup integrity.',
        'Backup media is stored offsite or in a geographically separated data center.',
        'Recovery Time Objective (RTO) and Recovery Point Objective (RPO) are defined and tested.',
      ],
    },
    {
      domain: 'Network Security',
      subDomains: ['Firewall Management', 'Network Monitoring', 'Segmentation'],
      controls: [
        'Firewall rules are documented, reviewed, and approved by network security team.',
        'Network traffic is monitored for anomalies via IDS/IPS solutions.',
        'Network segmentation is in place to isolate sensitive systems and data.',
        'Penetration testing is conducted annually by qualified third parties.',
        'Wireless network access is secured using enterprise-grade authentication.',
      ],
    },
    {
      domain: 'Incident Management',
      subDomains: ['Detection', 'Response', 'Post-Incident Review'],
      controls: [
        'Incident response plan is documented, approved, and communicated to staff.',
        'Security incidents are logged, classified by severity, and tracked to resolution.',
        'Post-incident reviews are conducted for significant events to prevent recurrence.',
        'Incident response team roles and responsibilities are clearly defined.',
        'Communication procedures for incident notification (internal and external) are established.',
      ],
    },
  ],
  ITAC: [
    {
      domain: 'Input Controls',
      subDomains: ['Data Validation', 'Authorization', 'Completeness'],
      controls: [
        'Application enforces input validation for all critical data entry fields.',
        'Data entry is authorized by appropriate personnel before processing.',
        'Completeness checks ensure all required fields are populated before submission.',
        'Duplicate transaction controls prevent processing of the same data twice.',
        'Error messages provide sufficient detail to allow correction without exposing sensitive data.',
      ],
    },
    {
      domain: 'Processing Controls',
      subDomains: ['Calculation Accuracy', 'Batch Processing', 'Interface Controls'],
      controls: [
        'Application calculations are validated against expected outputs periodically.',
        'Batch processing run logs are reviewed for errors and exceptions.',
        'Interface controls ensure completeness and accuracy of data transferred between systems.',
        'Processing exceptions are flagged, investigated, and resolved in a timely manner.',
        'Automated controls prevent processing outside of defined business hours or thresholds.',
      ],
    },
    {
      domain: 'Output Controls',
      subDomains: ['Report Accuracy', 'Distribution', 'Reconciliation'],
      controls: [
        'Report output is reconciled to source data to confirm accuracy.',
        'Report distribution is restricted to authorized recipients only.',
        'Output records are retained per the data retention policy.',
        'Sensitive data in outputs is masked or encrypted appropriately.',
        'Exception reports are generated and reviewed for unusual activity.',
      ],
    },
    {
      domain: 'Database Security',
      subDomains: ['Access Control', 'Encryption', 'Auditing'],
      controls: [
        'Database access is restricted to authorized users and applications only.',
        'Sensitive data at rest is encrypted using industry-standard algorithms.',
        'Database activity logging is enabled and logs are reviewed regularly.',
        'Database accounts used by applications follow least-privilege principles.',
        'Direct database access by end users is prohibited in production environments.',
      ],
    },
  ],
  SOC2: [
    {
      domain: 'Security',
      subDomains: ['Logical Access', 'Encryption', 'Vulnerability Management'],
      controls: [
        'The entity implements logical access security measures to protect against unauthorized access (CC6.1).',
        'Encryption is used to protect data in transit and at rest (CC6.7).',
        'Vulnerability assessments are performed and remediation is tracked (CC7.1).',
        'Intrusion detection systems monitor the environment for security events (CC7.2).',
        'Security awareness training is provided to all personnel (CC2.2).',
      ],
    },
    {
      domain: 'Availability',
      subDomains: ['Capacity Planning', 'Monitoring', 'Incident Management'],
      controls: [
        'System availability is monitored and availability SLAs are tracked (A1.1).',
        'Capacity planning processes ensure resources meet current and projected demands (A1.2).',
        'Recovery procedures are documented and tested to meet availability commitments (A1.3).',
        'Environmental controls protect against physical threats to availability.',
        'Backup and recovery procedures are tested to validate availability targets.',
      ],
    },
    {
      domain: 'Processing Integrity',
      subDomains: ['Input Validation', 'Processing Monitoring', 'Error Handling'],
      controls: [
        'System processing is complete, accurate, timely, and authorized (PI1.1).',
        'Processing errors are identified and corrected in a timely manner (PI1.2).',
        'Output reconciliation processes confirm that processing meets commitments (PI1.3).',
        'Quality assurance processes verify that system outputs meet specifications.',
        'Automated controls prevent unauthorized or incomplete transactions.',
      ],
    },
    {
      domain: 'Confidentiality',
      subDomains: ['Data Classification', 'Data Handling', 'Disposal'],
      controls: [
        'Confidential information is identified and handled according to policy (C1.1).',
        'Access to confidential information is restricted to authorized personnel (C1.2).',
        'Confidential information is disposed of securely when no longer needed.',
        'Third-party access to confidential data is governed by contractual agreements.',
        'Data classification policy is documented and employees are trained on it.',
      ],
    },
    {
      domain: 'Privacy',
      subDomains: ['Notice', 'Choice & Consent', 'Data Retention'],
      controls: [
        'Privacy notice is provided to data subjects at or before collection (P1.1).',
        'Implicit or explicit consent is obtained before collecting personal information (P2.1).',
        'Personal information is retained only as long as necessary for stated purposes (P4.3).',
        'Requests from data subjects to access or delete their data are honored.',
        'Privacy incidents are reported and investigated in accordance with policy.',
      ],
    },
  ],
  ISO27001: [
    {
      domain: 'Information Security Policies',
      subDomains: ['Policy Framework', 'Review & Approval'],
      controls: [
        'An information security policy is defined, approved by management, and communicated (A.5.1.1).',
        'Information security policies are reviewed at planned intervals or when significant changes occur (A.5.1.2).',
        'Topic-specific policies address access control, cryptography, and incident management.',
        'Policy exceptions are documented with risk acceptance from management.',
        'Employees acknowledge receipt and understanding of information security policies.',
      ],
    },
    {
      domain: 'Human Resource Security',
      subDomains: ['Pre-Employment', 'During Employment', 'Termination'],
      controls: [
        'Background checks are conducted on all new employees per legal requirements (A.7.1.1).',
        'Security responsibilities are communicated in employment contracts (A.7.1.2).',
        'Security awareness, education, and training are provided to all staff (A.7.2.2).',
        'A disciplinary process addresses security policy violations (A.7.2.3).',
        'Access rights are removed and assets returned upon termination (A.7.3.1).',
      ],
    },
    {
      domain: 'Access Control',
      subDomains: ['Access Policy', 'User Management', 'System Access'],
      controls: [
        'An access control policy is established and documented (A.9.1.1).',
        'A formal user registration and de-registration process is maintained (A.9.2.1).',
        'Privileged access rights are allocated and reviewed on a restricted basis (A.9.2.3).',
        'Users are required to use secret authentication information (A.9.3.1).',
        'Access rights are reviewed at regular intervals (A.9.2.5).',
      ],
    },
    {
      domain: 'Cryptography',
      subDomains: ['Cryptographic Policy', 'Key Management'],
      controls: [
        'A policy on the use of cryptographic controls is developed and implemented (A.10.1.1).',
        'Cryptographic key management includes generation, storage, archiving, and destruction (A.10.1.2).',
        'Encryption standards specify minimum key lengths and approved algorithms.',
        'Certificates are managed with defined validity periods and renewal procedures.',
        'Cryptographic controls are applied to protect sensitive data in transit.',
      ],
    },
    {
      domain: 'Supplier Relationships',
      subDomains: ['Supplier Policy', 'Monitoring', 'Contract Management'],
      controls: [
        'Information security requirements are established with suppliers (A.15.1.1).',
        'Supplier service delivery is monitored, reviewed, and audited (A.15.2.1).',
        'Changes to supplier services are managed considering risk (A.15.2.2).',
        'Supplier contracts include security requirements and right-to-audit clauses.',
        'Third-party access to systems is monitored and logged.',
      ],
    },
  ],
  HIPAA: [
    {
      domain: 'Administrative Safeguards',
      subDomains: ['Security Officer', 'Workforce Training', 'Access Management'],
      controls: [
        'A Security Officer is designated with responsibility for HIPAA security program (§164.308(a)(2)).',
        'Workforce members receive training on security policies and procedures (§164.308(a)(5)).',
        'Access to ePHI is authorized based on minimum necessary access (§164.308(a)(4)).',
        'A risk analysis is conducted to identify threats to ePHI confidentiality and integrity (§164.308(a)(1)).',
        'Incident response procedures address security incidents involving ePHI (§164.308(a)(6)).',
      ],
    },
    {
      domain: 'Physical Safeguards',
      subDomains: ['Facility Access', 'Workstation Controls', 'Device Controls'],
      controls: [
        'Facility access controls limit physical access to systems containing ePHI (§164.310(a)(1)).',
        'Workstations that access ePHI are positioned to minimize viewing by unauthorized persons (§164.310(b)).',
        'Policies govern the receipt and removal of hardware and electronic media (§164.310(d)(1)).',
        'Visitors accessing areas with ePHI systems are escorted and logged.',
        'Physical access logs are reviewed periodically for unauthorized access attempts.',
      ],
    },
    {
      domain: 'Technical Safeguards',
      subDomains: ['Access Control', 'Audit Controls', 'Transmission Security'],
      controls: [
        'Unique user identification is assigned to each user accessing ePHI (§164.312(a)(2)(i)).',
        'Automatic logoff terminates sessions after a defined period of inactivity (§164.312(a)(2)(iii)).',
        'Audit controls record and examine activity in systems containing ePHI (§164.312(b)).',
        'ePHI transmitted over networks is encrypted using approved standards (§164.312(e)(2)(ii)).',
        'Integrity controls ensure ePHI is not improperly altered or destroyed (§164.312(c)(1)).',
      ],
    },
    {
      domain: 'Privacy Rule',
      subDomains: ['PHI Use & Disclosure', 'Patient Rights', 'Business Associates'],
      controls: [
        'Uses and disclosures of PHI are limited to minimum necessary (§164.502(b)).',
        'Patients are provided with a Notice of Privacy Practices (§164.520).',
        'Business Associate Agreements are in place with all applicable vendors (§164.504(e)).',
        'Patient requests to access, amend, or restrict use of PHI are honored.',
        'PHI disclosures are tracked and an accounting provided to patients on request (§164.528).',
      ],
    },
    {
      domain: 'Breach Notification',
      subDomains: ['Breach Assessment', 'Notification', 'Documentation'],
      controls: [
        'A breach risk assessment process determines if notification is required (§164.402).',
        'Affected individuals are notified within 60 days of breach discovery (§164.404).',
        'HHS is notified of breaches affecting 500 or more individuals (§164.408).',
        'Breach notification documentation is maintained for at least 6 years.',
        'Breach notification templates and communication plans are prepared in advance.',
      ],
    },
  ],
};

const STATUSES: ControlStatus[] = ['In Progress', 'Pending From Client', 'Completed', 'Not Started'];
const DOCUMENTS: Record<string, string> = {
  'Access Management': 'Access control policy, user access matrix, provisioning logs',
  'Change Management': 'Change request tickets, test evidence, approval emails',
  'Backup & Recovery': 'Backup completion logs, restore test reports, offsite storage receipts',
  'Network Security': 'Firewall rule sets, network diagrams, pen test reports',
  'Incident Management': 'Incident response plan, incident logs, post-mortem reports',
  'Input Controls': 'System screenshots, test scripts, validation logic documentation',
  'Processing Controls': 'Batch run logs, reconciliation reports, interface documentation',
  'Output Controls': 'Sample reports, distribution lists, retention schedules',
  'Database Security': 'DB access logs, encryption certificates, audit trail exports',
  'Security': 'Security policies, vulnerability scan reports, training records',
  'Availability': 'SLA reports, capacity plans, DR test results',
  'Processing Integrity': 'Processing logs, reconciliation evidence, QA test results',
  'Confidentiality': 'Data classification policy, DLP reports, disposal certificates',
  'Privacy': 'Privacy notice, consent records, DSAR logs',
  'Information Security Policies': 'Policy documents, approval memos, acknowledgment records',
  'Human Resource Security': 'Background check certificates, training completion records',
  'Access Control': 'Access control policy, user access review reports',
  'Cryptography': 'Cryptographic policy, key management procedures, certificate inventory',
  'Supplier Relationships': 'Vendor contracts, assessment reports, monitoring logs',
  'Administrative Safeguards': 'Security officer designation, training records, risk analysis',
  'Physical Safeguards': 'Facility access logs, workstation policy, equipment inventory',
  'Technical Safeguards': 'Audit logs, session timeout configurations, encryption evidence',
  'Privacy Rule': 'Notice of Privacy Practices, BAA agreements, access request logs',
  'Breach Notification': 'Breach assessment records, notification letters, HHS filings',
};

export function generateFrameworkData(framework: FrameworkType): FrameworkData {
  const frameworkKey =
    Object.keys(FRAMEWORK_DOMAINS).find(
      k => k.toLowerCase() === String(framework).toLowerCase()
    ) as FrameworkType;

  const domains = FRAMEWORK_DOMAINS[frameworkKey] ?? [];

  if (!frameworkKey || domains.length === 0) {
    throw new Error(`Framework not found: ${framework}`);
  }
  const controls: AuditControl[] = [];
  let srCounter = 1;

  for (const domainGroup of domains) {
    const { domain, subDomains, controls: controlTemplates } = domainGroup;
    for (let i = 0; i < controlTemplates.length; i++) {
      const subDomain = subDomains[Math.floor(i / 2) % subDomains.length];
      controls.push({
        id: `${framework}-ctrl-${generateId()}`,
        srNo: `${framework}-${String(srCounter).padStart(3, '0')}`,
        controlRefNo: `${framework}-REF-${String(srCounter).padStart(3, '0')}`,
        domain,
        subDomain,
        controlPoint: controlTemplates[i],
        controlDescription: `The organization must maintain and enforce processes to ensure ${controlTemplates[i].toLowerCase().replace(/\.$/, '')}. This control is critical for maintaining compliance with the ${framework} framework and must be evidenced through documented procedures, logs, or configuration screenshots.`,
        documentRequired: DOCUMENTS[domain] || 'Policies, logs, and screenshots demonstrating compliance',
        status: 'Not Started',
        clarification: '',
        remarks: '',
        evidence: [],
        updatedAt: new Date().toISOString(),
      });
      srCounter++;
    }
  }

  const activity: Activity[] = [];

  return { framework, controls, tasks: [], activity };
}
