const { MailProvider } = require('./MailProvider');

class ResendMailProvider extends MailProvider {
  constructor(options = {}) {
    super();
    this.explicitApiKey = options.apiKey !== undefined;
    this.apiKey = options.apiKey !== undefined ? options.apiKey : (process.env.RESEND_API_KEY || null);
    this.fromEmail = options.fromEmail || process.env.RESEND_FROM_EMAIL || 'EducationOS <onboarding@resend.dev>';
    this.baseUrl = options.baseUrl || 'https://api.resend.com';
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  async sendMail({ to, subject, html, text, from }) {
    if (!to || !subject) {
      throw new Error('Recipient (to) and subject are required to send an email.');
    }

    const recipient = Array.isArray(to) ? to : [to];
    let apiKey = this.apiKey;
    let fromSender = from || this.fromEmail || process.env.RESEND_FROM_EMAIL;

    if (!apiKey && !this.explicitApiKey && process.env.NODE_ENV !== 'test') {
      apiKey = process.env.RESEND_API_KEY || null;
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(process.cwd(), 'apps/api/.env'),
          path.resolve(process.cwd(), '.env'),
          path.resolve(__dirname, '../../../../apps/api/.env'),
          path.resolve(__dirname, '../../../../.env')
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            const content = fs.readFileSync(cand, 'utf8');
            if (!apiKey) {
              const matchKey = content.match(/^RESEND_API_KEY\s*=\s*(.+)$/m);
              if (matchKey) {
                apiKey = matchKey[1].trim().replace(/^["']|["']$/g, '');
                process.env.RESEND_API_KEY = apiKey;
              }
            }
            if (!fromSender) {
              const matchFrom = content.match(/^RESEND_FROM_EMAIL\s*=\s*(.+)$/m);
              if (matchFrom) {
                fromSender = matchFrom[1].trim().replace(/^["']|["']$/g, '');
                process.env.RESEND_FROM_EMAIL = fromSender;
              }
            }
          }
        }
      } catch (_) {}
    }

    fromSender = fromSender || 'EducationOS <onboarding@resend.dev>';

    if (!apiKey) {
      console.warn('[ResendMailProvider] RESEND_API_KEY is not configured. Email logged in mock mode:');
      console.warn(`   To: ${recipient.join(', ')}`);
      console.warn(`   Subject: ${subject}`);
      console.warn(`   From: ${fromSender}`);
      return {
        id: `mock_${Date.now()}`,
        success: true,
        mock: true,
        to: recipient,
        subject
      };
    }

    const payload = {
      from: fromSender,
      to: recipient,
      subject,
      html: html || (text ? `<p>${text}</p>` : '<p></p>')
    };

    if (text) {
      payload.text = text;
    }

    const response = await this.fetchFn(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.message || data?.error?.message || `Resend API returned HTTP ${response.status}`;
      throw new Error(`[ResendMailProvider] Failed to send email: ${errorMsg}`);
    }

    return {
      id: data.id,
      success: true,
      data
    };
  }
}

module.exports = { ResendMailProvider };
