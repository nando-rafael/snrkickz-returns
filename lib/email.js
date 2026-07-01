import { Resend } from "resend";
import config from "./config";

let resendClient = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function getReasonLabel(reasonId) {
  return config.RETURN_REASONS.find(r => r.id === reasonId)?.label || reasonId;
}

export async function sendReturnConfirmation(ticket) {
  console.log("[EMAIL] Sending confirmation email to:", ticket.email);

  const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/${ticket.id}`;
  const itemsList = ticket.items
    .map((item) => `- ${item.title} (x${item.quantity})`)
    .join("\n");

  const exchangeSection = ticket.resolution === "exchange"
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
    : "";

  const html = `
    <h2>Retour bevestigd</h2>
    <p>Hallo ${ticket.orderName},</p>
    <p>Bedankt voor het aanmelden van je retour. We hebben je aanvraag ontvangen en zullen deze zo snel mogelijk beoordelen.</p>
    
    <h3>Retourgegevens</h3>
    <p><strong>Retournummer:</strong> ${ticket.id}</p>
    <p><strong>Ordernummer:</strong> ${ticket.orderName}</p>
    
    <h3>Artikelen</h3>
    <pre>${itemsList}</pre>
    
    <h3>Retourgegevens</h3>
    <p><strong>Retourreden:</strong> ${getReasonLabel(ticket.reason)}</p>
    <p><strong>Betaald bedrag:</strong> €${ticket.paidAmount.toFixed(2)}</p>
    <p><strong>Retourkosten:</strong> -€${ticket.returnFee.toFixed(2)}</p>
    <p><strong>Terug te ontvangen:</strong> €${ticket.refundableAmount.toFixed(2)}</p>
    
    ${exchangeSection}
    
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

export async function sendReturnLabelEmail(ticket) {
  console.log("[EMAIL] Sending return label email to:", ticket.email);

  const refundMessage = ticket.resolution === "refund"
    ? `Je ontvangt je terugbetaling van <strong>€${ticket.refundableAmount.toFixed(2)}</strong> zodra we je artikel hebben ontvangen en gecontroleerd.`
    : `Je ruilartikel wordt verzonden zodra we je artikel hebben ontvangen en gecontroleerd.`;

  const html = `
    <h2>Retourlabel en verzendgegevens</h2>
    <p>Hallo ${ticket.orderName},</p>
    <p>Bedankt voor je betaling! Hieronder vind je alle informatie die je nodig hebt om je retour in te dienen.</p>
    
    <h3>Retourgegevens</h3>
    <p><strong>Retournummer:</strong> ${ticket.id}</p>
    <p><strong>Ordernummer:</strong> ${ticket.orderName}</p>
    
    <h3>Verzendgegevens</h3>
    <p>Stuur je artikel naar:</p>
    <p>
      <strong>snrkickz</strong><br>
      Impuls 28<br>
      1446 WX Purmerend<br>
      Nederland
    </p>
    
    <h3>Retourvoorwaarden</h3>
    <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px; line-height: 1.6;">
${config.RETURN_CONDITIONS}
    </pre>
    
    <h3>Volgende stappen</h3>
    <ol>
      <li><strong>Verpak het artikel</strong> in een extra buitendoos (niet de originele schoenendoos)</li>
      <li><strong>Vermeld je retournummer</strong> (${ticket.id}) op het pakket</li>
      <li><strong>Verstuur het pakket</strong> naar het adres hierboven</li>
      <li><strong>Bewaar je verzendbewijs</strong> tot je retour is verwerkt</li>
      <li><strong>Wij controleren</strong> het artikel en verwerken je retour</li>
    </ol>
    
    <h3>Wat gebeurt er nu?</h3>
    <p>${refundMessage}</p>
    
    <p style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
      Vragen? Neem contact met ons op via support@snrkickz.nl
    </p>
  `;

  try {
    const response = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@snrkickz.nl",
      to: ticket.email,
      subject: `Retourlabel - ${ticket.id}`,
      html,
    });

    console.log("[EMAIL] Return label email sent successfully:", response.id);
    return response;
  } catch (error) {
    console.error("[EMAIL] Error sending return label email:", error);
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

