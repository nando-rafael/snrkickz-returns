import { Resend } from "resend";

let resendClient = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendReturnConfirmation(ticket) {
  console.log("[EMAIL] Sending confirmation email to:", ticket.email);

  const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/${ticket.id}`;
  const itemsList = ticket.items
    .map((item) => `- ${item.title} (x${item.quantity})`)
    .join("\n");

  const html = `
    <h2>Retour bevestigd</h2>
    <p>Hallo ${ticket.orderName},</p>
    <p>Bedankt voor het aanmelden van je retour. We hebben je aanvraag ontvangen en zullen deze zo snel mogelijk beoordelen.</p>
    
    <h3>Retourgegevens</h3>
    <p><strong>Retournummer:</strong> ${ticket.id}</p>
    <p><strong>Ordernummer:</strong> ${ticket.orderId}</p>
    
    <h3>Artikelen</h3>
    <pre>${itemsList}</pre>
    
    <h3>Retourgegevens</h3>
    <p><strong>Retourreden:</strong> ${ticket.reason}</p>
    <p><strong>Terugbetaling:</strong> €${ticket.refundableAmount.toFixed(2)}</p>
    
    ${
      ticket.resolution === "exchange"
        ? `
      <h3>Ruilartikel</h3>
      <p><strong>Artikel:</strong> ${ticket.exchange.variantTitle}</p>
      <p><strong>Prijs:</strong> €${ticket.exchange.newPrice.toFixed(2)}</p>
      ${
        ticket.exchange.priceDifference > 0
          ? `<p><strong>Je betaalt extra:</strong> €${ticket.exchange.priceDifference.toFixed(2)}</p>`
          : ticket.exchange.priceDifference < 0
            ? `<p><strong>Je krijgt terug:</strong> €${Math.abs(ticket.exchange.priceDifference).toFixed(2)}</p>`
            : ""
      }
    `
        : ""
    }
    
    <h3>Volgende stappen</h3>
    <ol>
      <li>Verpak het artikel goed in</li>
      <li>Stuur het terug naar ons retouradres</li>
      <li>Wij controleren het artikel</li>
      <li>Je ontvangt je terugbetaling of ruilartikel</li>
    </ol>
    
    <p><a href="${paymentLink}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Betaallink</a></p>
    
    <p>Vragen? Neem contact met ons op.</p>
  `;

  try {
    const response = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@snrkickz.nl",
      to: ticket.email,
      subject: `Retour bevestigd - ${ticket.id}`,
      html,
    });

    console.log("[EMAIL] Email sent successfully:", response.id);
    return response;
  } catch (error) {
    console.error("[EMAIL] Error sending email:", error);
    throw error;
  }
}

export async function sendReturnStatusUpdate(ticket, status, message) {
  console.log("[EMAIL] Sending status update to:", ticket.email);

  const html = `
    <h2>Update op je retour</h2>
    <p>Hallo ${ticket.orderName},</p>
    <p>${message}</p>
    <p><strong>Retournummer:</strong> ${ticket.id}</p>
    <p><strong>Status:</strong> ${status}</p>
  `;

  try {
    const response = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@snrkickz.nl",
      to: ticket.email,
      subject: `Update op je retour - ${ticket.id}`,
      html,
    });

    console.log("[EMAIL] Status update sent successfully:", response.id);
    return response;
  } catch (error) {
    console.error("[EMAIL] Error sending status update:", error);
    throw error;
  }
}

