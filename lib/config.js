// Centralized, non-hardcoded config for the returns flow.
// Change values here instead of hunting through the codebase.

module.exports = {
  // How many days after the customer says they received the item they can
  // still start a return.
  RETURN_WINDOW_DAYS: 14,

  // Flat fee (EUR) deducted from any cash refund to cover return shipping.
  // Actual carrier cost is lower, so this also protects margin per return.
  RETURN_FEE: 7.95,

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
    PENDING: "pending", // awaiting admin review
    APPROVED: "approved", // admin approved, not yet processed
    AWAITING_PAYMENT: "awaiting_payment", // exchange upgrade — waiting for customer to pay price difference
    PROCESSED: "processed", // refund sent / exchange order created and settled
    REJECTED: "rejected",
  },

  CURRENCY: "EUR",
};
