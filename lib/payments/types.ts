import type { CheckoutPaymentMethod } from "@/lib/payments/schemas";
import type { PaymentStatus } from "@/lib/payments/status";

export type MercadoPagoPaymentMethod = {
  id?: string | null;
  type?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  ticket_url?: string | null;
};

export type MercadoPagoTransactionPayment = {
  id?: string | null;
  status?: string | null;
  status_detail?: string | null;
  amount?: string | null;
  paid_amount?: string | null;
  payment_method?: MercadoPagoPaymentMethod | null;
};

export type MercadoPagoOrder = {
  id?: string | null;
  status?: string | null;
  status_detail?: string | null;
  external_reference?: string | null;
  total_amount?: string | null;
  total_paid_amount?: string | null;
  currency?: string | null;
  currency_id?: string | null;
  transactions?: {
    payments?: MercadoPagoTransactionPayment[] | null;
  } | null;
};

export type CreateMercadoPagoOrderInput = {
  totalAmount: string;
  externalReference: string;
  description: string;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    identificationNumber: string;
  };
  shipping?: {
    zip: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  } | null;
  payment: CheckoutPaymentMethod;
};

export type PublicPixDetails = {
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
};

export type PublicPaymentResult = {
  status: PaymentStatus;
  statusDetail: string | null;
  method: "pix" | "credit_card";
  pix: PublicPixDetails | null;
};

export type MercadoPagoOrdersGateway = {
  createOrder: (input: CreateMercadoPagoOrderInput, idempotencyKey: string) => Promise<MercadoPagoOrder>;
  getOrder: (id: string) => Promise<MercadoPagoOrder>;
};
