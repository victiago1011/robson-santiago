import assert from "node:assert/strict";
import { test } from "node:test";
import { decideAdminAccess } from "@/lib/admin/access";

const USER_ID = "11111111-1111-4111-8111-111111111111";

test("admin indisponível quando a autenticação não está configurada", () => {
  assert.deepEqual(decideAdminAccess({ configured: false, userId: USER_ID, isAdmin: true }), {
    ok: false,
    reason: "unavailable",
  });
});

test("usuário não autenticado não acessa o admin", () => {
  assert.deepEqual(decideAdminAccess({ configured: true, userId: null, isAdmin: false }), {
    ok: false,
    reason: "anonymous",
  });
});

test("usuário autenticado sem autorização não acessa o admin", () => {
  assert.deepEqual(decideAdminAccess({ configured: true, userId: USER_ID, isAdmin: false }), {
    ok: false,
    reason: "forbidden",
  });
});

test("admin autorizado acessa", () => {
  assert.deepEqual(decideAdminAccess({ configured: true, userId: USER_ID, isAdmin: true }), {
    ok: true,
    userId: USER_ID,
  });
});
