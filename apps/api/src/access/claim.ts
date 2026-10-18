/** Future ARO #24 exchange. Only trusted backend responses may populate these fields.
 * The HTTP endpoint deliberately returns 409 until the hosted proof contract exists.
 */
export interface HostedCheckoutProof {
  project: "espelhomeu";
  orderId: string;
  checkoutSessionId: string;
  proof: string;
}
export interface AuthorizedPurchaseBinding {
  principalId: string;
  project: "espelhomeu";
  orderId: string;
  aroCustomerId: string;
}
export interface AroClaimAdapter {
  claim(proof: HostedCheckoutProof, principalId: string): Promise<AuthorizedPurchaseBinding | null>;
}
export const unavailableAroClaim: AroClaimAdapter = { async claim() { return null; } };
