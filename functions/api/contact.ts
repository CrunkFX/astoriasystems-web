interface Env {
  RESEND_API_KEY?: string;
  CONTACT_EMAIL?: string;
}

interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  company: string;
  subject: string;
  message: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Rate limiting headers
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  try {
    const body = (await request.json()) as ContactForm;

    // Validate required fields
    if (!body.name || !body.email || !body.company || !body.subject || !body.message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If Resend API key is configured, send email
    if (env.RESEND_API_KEY) {
      const contactEmail = env.CONTACT_EMAIL || 'service@astoria.systems';

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Astoria Website <noreply@astoria.systems>',
          to: [contactEmail],
          reply_to: body.email,
          subject: `[Website] ${body.subject}`,
          html: `
            <h2>Neue Kontaktanfrage</h2>
            <p><strong>Name:</strong> ${escapeHtml(body.name)}</p>
            <p><strong>E-Mail:</strong> ${escapeHtml(body.email)}</p>
            <p><strong>Telefon:</strong> ${escapeHtml(body.phone || '-')}</p>
            <p><strong>Unternehmen:</strong> ${escapeHtml(body.company)}</p>
            <p><strong>Betreff:</strong> ${escapeHtml(body.subject)}</p>
            <hr />
            <p>${escapeHtml(body.message).replace(/\n/g, '<br />')}</p>
            <hr />
            <p style="color: #666; font-size: 12px;">IP: ${ip}</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Resend error:', await emailResponse.text());
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Log to console if no email service configured
      console.log('Contact form submission (no email service configured):', body);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
