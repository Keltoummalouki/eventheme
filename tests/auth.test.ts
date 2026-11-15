import assert from "node:assert/strict";
import { test } from "node:test";
import { accountOf, adminRedirectPath, hasAdminRole } from "../src/lib/eventheme/auth";

test("the account card shows the e-mail and the first readable name of the user", () => {
  assert.deepEqual(
    accountOf({ email: "k@eventhemes.ma", user_metadata: { full_name: "  Keltoum Malouki ", name: "K" } }),
    { email: "k@eventhemes.ma", name: "Keltoum Malouki" },
  );
  // Non-text or blank values are skipped; the name never grants anything, it is only shown.
  assert.deepEqual(accountOf({ email: null, user_metadata: { full_name: " ", name: 42, first_name: "Salma" } }), {
    email: "",
    name: "Salma",
  });
  assert.deepEqual(accountOf({ email: "a@b.ma" }), { email: "a@b.ma", name: "" });
  assert.deepEqual(accountOf(null), { email: "", name: "" });
  assert.equal(accountOf({ user_metadata: { name: "x".repeat(200) } }).name.length, 80, "a long name is cut");
});

test("only app_metadata.role = admin grants access", () => {
  assert.equal(hasAdminRole({ app_metadata: { role: "admin" } }), true);
  assert.equal(hasAdminRole({ app_metadata: { role: "editor" } }), false);
  assert.equal(hasAdminRole({ app_metadata: {} }), false);
  assert.equal(hasAdminRole(null), false);
  assert.equal(hasAdminRole(undefined), false);
  // user_metadata is writable by the user and must never grant access.
  const forged = { app_metadata: {}, user_metadata: { role: "admin" } };
  assert.equal(hasAdminRole(forged), false);
});

test("post-login redirect stays on admin pages of this site", () => {
  assert.equal(adminRedirectPath("/admin"), "/admin");
  assert.equal(adminRedirectPath("/admin/demandes"), "/admin/demandes");
  for (const unsafe of [
    undefined,
    ["/admin/demandes"],
    "",
    "admin",
    "/",
    "/administration",
    "/admin/connexion",
    "//evil.example/admin",
    "/\\evil.example/admin",
    "https://evil.example/admin",
    "/admin/../devis",
  ])
    assert.equal(adminRedirectPath(unsafe), "/admin", String(unsafe));
});
