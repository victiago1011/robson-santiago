import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accessTokenNeedsRefresh,
  decideAdminProxy,
} from "@/lib/admin/session-token";

function tokenWithExp(expSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `header.${payload}.signature`;
}

test("token ausente ou malformado precisa renovar", () => {
  assert.equal(accessTokenNeedsRefresh("not-a-jwt"), true);
  assert.equal(accessTokenNeedsRefresh("a.b.c"), true);
});

test("token perto de expirar precisa renovar e token válido não", () => {
  const now = Date.parse("2026-09-22T18:00:00.000Z");
  assert.equal(accessTokenNeedsRefresh(tokenWithExp(Math.floor(now / 1000) + 30), now), true);
  assert.equal(accessTokenNeedsRefresh(tokenWithExp(Math.floor(now / 1000) + 3600), now), false);
});

test("login do admin segue sem sessão", () => {
  assert.equal(
    decideAdminProxy({
      pathname: "/admin/login",
      hasUsableAccessToken: false,
      hasRefreshToken: false,
    }),
    "continue",
  );
});

test("página admin sem sessão redireciona para o login", () => {
  assert.equal(
    decideAdminProxy({
      pathname: "/admin",
      hasUsableAccessToken: false,
      hasRefreshToken: false,
    }),
    "redirect-login",
  );
  assert.equal(
    decideAdminProxy({
      pathname: "/admin/pedidos/11111111-1111-4111-8111-111111111111",
      hasUsableAccessToken: false,
      hasRefreshToken: false,
    }),
    "redirect-login",
  );
});

test("API admin sem sessão não redireciona e segue para a rota negar o acesso", () => {
  assert.equal(
    decideAdminProxy({
      pathname: "/api/admin/orders",
      hasUsableAccessToken: false,
      hasRefreshToken: false,
    }),
    "api-anonymous",
  );
});

test("sessão utilizável segue e refresh token sem access pede renovação", () => {
  assert.equal(
    decideAdminProxy({
      pathname: "/admin",
      hasUsableAccessToken: true,
      hasRefreshToken: false,
    }),
    "continue",
  );
  assert.equal(
    decideAdminProxy({
      pathname: "/admin",
      hasUsableAccessToken: false,
      hasRefreshToken: true,
    }),
    "refresh",
  );
});
