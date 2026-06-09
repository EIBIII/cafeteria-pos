import nodemailer from 'nodemailer';

// Crear transporter — se recrea en cada llamada para que tome las vars de entorno actuales
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? 'sandbox.smtp.mailtrap.io',
    port:   Number(process.env.SMTP_PORT ?? 2525),
    secure: false,   // Mailtrap usa STARTTLS, no SSL directo
    auth: {
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
    // Timeout generoso para Mailtrap
    connectionTimeout: 10000,
    greetingTimeout:   5000,
  });
}

interface TicketItem {
  productName: string;
  quantity:    number;
  unitPrice:   number;
  subtotal:    number;
  modifiers:   string[];
}

interface TicketData {
  orderNumber:   number;
  date:          Date;
  customerName?: string;
  sellerName:    string;
  items:         TicketItem[];
  subtotal:      number;
  tax:           number;
  total:         number;
}

function buildTicketHtml(ticket: TicketData): string {
  const fmt     = (n: number) => `$${n.toFixed(2)}`;
  const fmtDate = (d: Date)   =>
    d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const rows = ticket.items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ede8;">
        <strong style="color:#1a1a1a;">${item.productName}</strong>
        ${item.modifiers.length ? `<br><small style="color:#888;">${item.modifiers.join(' · ')}</small>` : ''}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ede8;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ede8;text-align:right;">${fmt(item.unitPrice)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ede8;text-align:right;font-weight:600;">${fmt(item.subtotal)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#92400e,#b45309);padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">☕</div>
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Cafetería TecNM León</h1>
            <p style="margin:6px 0 0;color:#fde68a;font-size:13px;">Tu bebida favorita, siempre lista</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;">
                  <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;">Pedido</p>
                  <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#92400e;">#${String(ticket.orderNumber).padStart(4,'0')}</p>
                </td>
                <td style="width:50%;text-align:right;">
                  <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;">Fecha</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#444;font-weight:500;">${fmtDate(ticket.date)}</p>
                </td>
              </tr>
              ${ticket.customerName ? `<tr><td colspan="2" style="padding-top:12px;">
                <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;">Cliente</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;">${ticket.customerName}</p>
              </td></tr>` : ''}
            </table>
          </td>
        </tr>
        <tr><td style="padding:20px 40px 0;"><div style="border-top:2px dashed #e5d5c5;"></div></td></tr>
        <tr>
          <td style="padding:20px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="background:#fef3c7;">
                  <th style="padding:8px;text-align:left;font-size:11px;color:#92400e;text-transform:uppercase;">Producto</th>
                  <th style="padding:8px;text-align:center;font-size:11px;color:#92400e;text-transform:uppercase;">Cant.</th>
                  <th style="padding:8px;text-align:right;font-size:11px;color:#92400e;text-transform:uppercase;">Precio</th>
                  <th style="padding:8px;text-align:right;font-size:11px;color:#92400e;text-transform:uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#666;font-size:14px;">Subtotal</td>
                <td style="padding:6px 0;text-align:right;font-size:14px;color:#444;">${fmt(ticket.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666;font-size:14px;">IVA (16%)</td>
                <td style="padding:6px 0;text-align:right;font-size:14px;color:#444;">${fmt(ticket.tax)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0 0;border-top:2px solid #f0ede8;font-size:18px;font-weight:700;color:#1a1a1a;">Total</td>
                <td style="padding:10px 0 0;border-top:2px solid #f0ede8;text-align:right;font-size:22px;font-weight:700;color:#92400e;">${fmt(ticket.total)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 32px;text-align:center;">
            <div style="background:#fef3c7;border-radius:12px;padding:16px 24px;">
              <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">¡Gracias por tu compra!</p>
              <p style="margin:6px 0 0;font-size:12px;color:#b45309;">Atendido por <strong>${ticket.sellerName}</strong></p>
            </div>
            <p style="margin:20px 0 0;font-size:11px;color:#aaa;">Tecnológico Nacional de México · Campus León</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendTicketEmail(toEmail: string, ticket: TicketData): Promise<boolean> {
  const smtpUser = process.env.SMTP_USER ?? '';
  const smtpPass = process.env.SMTP_PASS ?? '';

  if (!smtpUser || !smtpPass) {
    console.warn('[email] SMTP_USER o SMTP_PASS no configurados — ticket no enviado.');
    return false;
  }

  try {
    const transporter = createTransporter();

    // Verificar conexión antes de enviar
    await transporter.verify();

    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM ?? `"Cafetería TecNM" <${smtpUser}>`,
      to:      toEmail,
      subject: `☕ Tu ticket #${String(ticket.orderNumber).padStart(4,'0')} — Cafetería TecNM`,
      html:    buildTicketHtml(ticket),
      text:    [
        `Cafetería TecNM León`,
        `Pedido #${ticket.orderNumber}`,
        ``,
        ...ticket.items.map(i => `${i.productName} x${i.quantity}  $${i.subtotal.toFixed(2)}`),
        ``,
        `Subtotal: $${ticket.subtotal.toFixed(2)}`,
        `IVA:      $${ticket.tax.toFixed(2)}`,
        `Total:    $${ticket.total.toFixed(2)}`,
        ``,
        `¡Gracias por tu compra!`,
      ].join('\n'),
    });

    console.log(`[email] Ticket enviado a ${toEmail} — messageId: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[email] Error al enviar a ${toEmail}:`, err.message);
    return false;
  }
}
