export type FulfillmentActionState = {
  ok: boolean;
  error: string | null;
  code: string | null;
};

export const INITIAL_FULFILLMENT_ACTION_STATE: FulfillmentActionState = {
  ok: false,
  error: null,
  code: null,
};
