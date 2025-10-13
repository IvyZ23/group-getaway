import { assertEquals } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import PasswordAuthenticationConcept from "./PasswordAuthConcept.ts";
import { describe } from "node:test";

Deno.test("PasswordAuthentication: register and authenticate successfully", async () => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  const username = "alice";
  const password = "password123";

  // Register
  const registerResult = await concept.register({ username, password });
  if ("error" in registerResult) throw new Error(registerResult.error);
  const registeredUser = registerResult.user;
  assertEquals(typeof registeredUser, "string");

  // Authenticate
  const authResult1 = await concept.authenticate({ username, password });
  if ("error" in authResult1) throw new Error(authResult1.error);
  assertEquals(authResult1.user, registeredUser);

  // Authenticate again
  const authResult2 = await concept.authenticate({ username, password });
  if ("error" in authResult2) throw new Error(authResult2.error);
  assertEquals(authResult2.user, registeredUser);

  await client.close();
});

Deno.test("PasswordAuthentication: duplicate usernames should fail", async () => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  const username = "bob";
  const password = "passwordA";

  const registerResult1 = await concept.register({ username, password });
  if ("error" in registerResult1) throw new Error(registerResult1.error);
  assertEquals(typeof registerResult1.user, "string");

  const registerResult2 = await concept.register({
    username,
    password: "passwordB",
  });
  assertEquals("error" in registerResult2, true);
  if ("error" in registerResult2) {
    assertEquals(
      registerResult2.error,
      `Username '${username}' already exists.`,
    );
  }

  await client.close();
});

Deno.test("PasswordAuthentication: empty username or password", async () => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  const emptyUsername = "";
  const emptyPassword = "";
  const validPassword = "validPassword";

  // Empty username + password
  const resultEmpty = await concept.register({
    username: emptyUsername,
    password: emptyPassword,
  });
  if ("error" in resultEmpty) throw new Error(resultEmpty.error);
  assertEquals(typeof resultEmpty.user, "string");

  const authEmpty = await concept.authenticate({
    username: emptyUsername,
    password: emptyPassword,
  });
  if ("error" in authEmpty) throw new Error(authEmpty.error);
  assertEquals(authEmpty.user, resultEmpty.user);

  // Empty username + valid password (should fail)
  const resultDup = await concept.register({
    username: emptyUsername,
    password: validPassword,
  });
  assertEquals("error" in resultDup, true);
  if ("error" in resultDup) {
    assertEquals(resultDup.error, `Username '' already exists.`);
  }

  // Valid username + empty password
  const resultValidEmpty = await concept.register({
    username: "david",
    password: emptyPassword,
  });
  if ("error" in resultValidEmpty) throw new Error(resultValidEmpty.error);
  const authValidEmpty = await concept.authenticate({
    username: "david",
    password: emptyPassword,
  });
  if ("error" in authValidEmpty) throw new Error(authValidEmpty.error);
  assertEquals(authValidEmpty.user, resultValidEmpty.user);

  await client.close();
});

Deno.test("PasswordAuthentication: preserve whitespace in passwords", async () => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  const username = "eve";
  const passwordWithSpaces = "  my secret password  ";
  const passwordNoSpaces = "my secret password";

  const registerResult = await concept.register({
    username,
    password: passwordWithSpaces,
  });
  if ("error" in registerResult) throw new Error(registerResult.error);
  const registeredUser = registerResult.user;

  // Correct password (with spaces)
  const authExact = await concept.authenticate({
    username,
    password: passwordWithSpaces,
  });
  if ("error" in authExact) throw new Error(authExact.error);
  assertEquals(authExact.user, registeredUser);

  // Incorrect password (trimmed)
  const authTrimmed = await concept.authenticate({
    username,
    password: passwordNoSpaces,
  });
  assertEquals("error" in authTrimmed, true);
  if ("error" in authTrimmed) {
    assertEquals(authTrimmed.error, "Invalid credentials.");
  }

  await client.close();
});

Deno.test("PasswordAuthentication: incorrect password should fail", async () => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  const username = "frank";
  const correctPassword = "correctpassword123";
  const wrongPassword = "wrongpassword";

  const registerResult = await concept.register({
    username,
    password: correctPassword,
  });
  if ("error" in registerResult) throw new Error(registerResult.error);

  const authWrong = await concept.authenticate({
    username,
    password: wrongPassword,
  });
  assertEquals("error" in authWrong, true);
  if ("error" in authWrong) {
    assertEquals(authWrong.error, "Invalid credentials.");
  }

  const authCorrect = await concept.authenticate({
    username,
    password: correctPassword,
  });
  assertEquals("user" in authCorrect, true);
  if ("user" in authCorrect) {
    assertEquals(authCorrect.user, registerResult.user);
  }

  await client.close();
});
