const { MailProvider } = require('./MailProvider');

class ResendMailProvider extends MailProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.RESEND_API_KEY || null;
    this.fromEmail = options.fromEmail || process.env.RESEND_FROM_EMAIL || 'EducationOS <onboarding@resend.dev>';
    this.baseUrl = options.baseUrl || 'https://api.resend.com';
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  async sendMail({ to, subject, html, text, from }) {
    if (!to || !subject) {
      throw new Error('Recipient (to) and subject are required to send an email.');
    }

    const recipient = Array.isArray(to) ? to : [to];
    const fromSender = from || this.fromEmail;

    if (!this.apiKey) {
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
        'Authorization': `Bearer ${this.apiKey}`,
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
