// Centralized, non-hardcoded config for the returns flow.
// Change values here instead of hunting through the codebase.

module.exports = {
  // How many days after the customer says they received the item they can
  // still start a return.
  RETURN_WINDOW_DAYS: 14,

  // Flat fee (EUR) deducted from any cash refund to cover return shipping.
  // Actual carrier cost is lower, so this also protects margin per return.
  RETURN_FEE: 9.95,

  RETURN_REASONS: [
    { id: "wrong_size", label: "Verkeerde maat besteld" },
    { id: "not_as_expected", label: "Anders dan verwacht" },
    { id: "defect", label: "Defect / beschadigd" },
    { id: "wrong_item", label: "Verkeerd artikel ontvangen" },
    { id: "changed_mind", label: "Toch geen zin meer in" },
    { id: "other", label: "Anders" },
  ],

  RESOLUTIONS: {
    REFUND: "refund",
    EXCHANGE: "exchange",
  },

  TICKET_STATUS: {
    PENDING: "pending", // awaiting payment
    PAID: "paid", // payment received, awaiting admin review
    APPROVED: "approved", // admin approved, not yet processed
    AWAITING_PAYMENT: "awaiting_payment", // exchange upgrade — waiting for customer to pay price difference
    PROCESSED: "processed", // refund sent / exchange order created and settled
    REJECTED: "rejected",
  },

  CURRENCY: "EUR",

  // Bank transfer details
  BANK_IBAN: process.env.BANK_IBAN || "NL72REVO06615054167",
  BANK_NAME: "Revolut",

  // Return conditions text
  RETURN_CONDITIONS: `
Retourvoorwaarden
Je hebt 14 dagen vanaf ontvangst om je bestelling te retourneren.

Retourkosten zijn voor rekening van de klant, verrekend met je terugbetaling:
- Nederland & België: €9,95
- Duitsland & Oostenrijk: €9,95
- Frankrijk: €11,95

Zowel sale- als reguliere artikelen komen in aanmerking, mits de retour binnen 14 dagen is aangemeld en aan de retourvoorwaarden voldoet.

Verstuur je artikel altijd in een extra buitendoos — nooit de schoenendoos zelf als verzendverpakking, dit beschermt de originele doos.

Bewaar je verzendbewijs tot je retour is verwerkt — zonder bewijs kunnen we niet aansprakelijk worden gehouden voor zoekgeraakte pakketten.
  `.trim(),
};

