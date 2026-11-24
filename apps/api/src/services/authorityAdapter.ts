import { Report, ReportStatus } from '../../../../packages/shared/src/types';
import { db } from '../data/store';

export interface AuthorityAdapter {
  submit(report: Report): Promise<{ externalId: string }>;
  fetchStatus?(externalId: string): Promise<ReportStatus>;
}

export interface OutgoingEmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

export class EmailAdapter implements AuthorityAdapter {
  authorityEmail: string;
  sentMails: OutgoingEmailLog[] = [];

  constructor(authorityEmail = 'waste-authority@cleanstreak.local') {
    this.authorityEmail = authorityEmail;
  }

  async submit(report: Report): Promise<{ externalId: string }> {
    const externalId = `GOV-${report.category.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;

    const subject = `[Civic Report #${externalId}] Waste Management Alert: ${report.category.replace('_', ' ').toUpperCase()}`;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${report.location.lat}&mlon=${report.location.lng}#map=17/${report.location.lat}/${report.location.lng}`;

    const body = `
CIVIC WASTE MANAGEMENT DISPATCH
========================================
Reference ID: ${externalId}
Category: ${report.category}
Severity: Level ${report.severity}
Supporters Count: ${report.support_count}
Coordinates: ${report.location.lat}, ${report.location.lng}
Map Link: ${mapUrl}
Address / Location Hint: ${report.address_text || 'GPS Geotagged'}
Description: ${report.description || 'No description provided'}
Photos Attached: ${report.photo_keys.join(', ')}

Please triage and update status via the municipal portal or reply webhook.
========================================
    `.trim();

    const mail: OutgoingEmailLog = {
      id: `mail-${Date.now()}`,
      to: this.authorityEmail,
      subject,
      body,
      sentAt: new Date().toISOString(),
    };

    this.sentMails.push(mail);

    // Record report event in store
    db.addReportEvent(
      report.id,
      'forwarded',
      `Forwarded to Municipal Authority (${this.authorityEmail}) with Ref ${externalId}`,
    );

    return { externalId };
  }

  async fetchStatus(externalId: string): Promise<ReportStatus> {
    return 'in_progress';
  }
}

export const authorityAdapter = new EmailAdapter();
